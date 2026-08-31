import { execFile } from "node:child_process";
import { release } from "node:os";
import { promisify } from "node:util";

import {
  AUTO_HDR_VALUE_NAME,
  WINDOWED_OPTIMIZATIONS_VALUE_NAME,
  readDirectXGlobalBoolean,
  writeDirectXGlobalBoolean,
  type DirectXGlobalSettingName
// Node's built-in TypeScript test runner does not remap .js specifiers to .ts.
// Rollup resolves this source extension during the production build.
// @ts-expect-error TypeScript requires allowImportingTsExtensions for this runtime path.
} from "../labs/directx-global-settings.ts";

const execFileAsync = promisify(execFile);

export const DIRECTX_USER_GPU_PREFERENCES_KEY =
  String.raw`HKCU\Software\Microsoft\DirectX\UserGpuPreferences`;
export const DIRECTX_GLOBAL_SETTINGS_VALUE = "DirectXUserGlobalSettings";

export type DirectXGamingSetting = {
  readonly valueName: DirectXGlobalSettingName;
  readonly defaultEnabled: boolean;
};

export const AUTO_HDR_SETTING: DirectXGamingSetting = {
  valueName: AUTO_HDR_VALUE_NAME,
  defaultEnabled: false
};

export const WINDOWED_OPTIMIZATIONS_SETTING: DirectXGamingSetting = {
  valueName: WINDOWED_OPTIMIZATIONS_VALUE_NAME,
  defaultEnabled: false
};

export type DirectXRegistryCommand = (
  args: readonly string[]
) => Promise<string>;
export type DirectXSupportProbe = (
  setting: DirectXGamingSetting
) => Promise<boolean>;

export function supportsDirectXGamingLabs(
  platform = process.platform,
  systemRelease = release()
): boolean {
  if (platform !== "win32") {
    return false;
  }
  const [majorText, , buildText] = systemRelease.split(".");
  const major = Number.parseInt(majorText ?? "", 10);
  const build = Number.parseInt(buildText ?? "", 10);
  return major === 10 && Number.isFinite(build) && build >= 22000;
}

type ProcessError = Error & {
  code?: number | string;
};

export class UnsupportedDirectXGamingSettingError extends Error {
  public readonly setting: DirectXGlobalSettingName;

  public constructor(setting: DirectXGlobalSettingName) {
    super(`La opción experimental ${setting} no está disponible en este sistema.`);
    this.name = "UnsupportedDirectXGamingSettingError";
    this.setting = setting;
  }
}

export interface DirectXGamingSettingsClientContract {
  isSupported(setting: DirectXGamingSetting): Promise<boolean>;
  isEnabled(setting: DirectXGamingSetting): Promise<boolean>;
  setEnabled(setting: DirectXGamingSetting, enabled: boolean): Promise<void>;
  toggle(setting: DirectXGamingSetting): Promise<boolean>;
}

/** Structural match for ToggleFeatureController's BooleanFeatureClient. */
export type DirectXBooleanFeature = {
  readonly id: string;
  isEnabled(): Promise<boolean>;
  toggle(): Promise<boolean>;
};

export function createDirectXBooleanFeature(
  client: DirectXGamingSettingsClientContract,
  setting: DirectXGamingSetting
): DirectXBooleanFeature {
  return {
    id: `directx.${setting.valueName}`,
    isEnabled: () => client.isEnabled(setting),
    toggle: () => client.toggle(setting)
  };
}

export class DirectXGamingSettingsClient
implements DirectXGamingSettingsClientContract {
  readonly #runCommand: DirectXRegistryCommand;
  readonly #supportProbe: DirectXSupportProbe;
  readonly #registryKey: string;
  #pending: Promise<unknown> = Promise.resolve();

  public constructor(
    systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`,
    runCommand?: DirectXRegistryCommand,
    supportProbe?: DirectXSupportProbe,
    registryKey = DIRECTX_USER_GPU_PREFERENCES_KEY
  ) {
    const regExe = `${systemRoot}\\System32\\reg.exe`;
    this.#runCommand = runCommand ?? (async (args) => {
      const { stdout } = await execFileAsync(regExe, [...args], {
        encoding: "utf8",
        windowsHide: true
      });
      return stdout;
    });
    this.#supportProbe = supportProbe ?? (async () => supportsDirectXGamingLabs());
    this.#registryKey = registryKey;
  }

  public isSupported(setting: DirectXGamingSetting): Promise<boolean> {
    return this.#supportProbe(setting);
  }

  public async isEnabled(setting: DirectXGamingSetting): Promise<boolean> {
    await this.#assertSupported(setting);
    const source = await this.#readGlobalSettings();
    return readDirectXGlobalBoolean(
      source,
      setting.valueName,
      setting.defaultEnabled
    );
  }

  public setEnabled(
    setting: DirectXGamingSetting,
    enabled: boolean
  ): Promise<void> {
    return this.#serialize(async () => {
      await this.#setEnabled(setting, enabled);
    });
  }

  public toggle(setting: DirectXGamingSetting): Promise<boolean> {
    return this.#serialize(async () => {
      await this.#assertSupported(setting);
      const source = await this.#readGlobalSettings();
      const enabled = !readDirectXGlobalBoolean(
        source,
        setting.valueName,
        setting.defaultEnabled
      );
      await this.#persist(setting, source, enabled);
      return enabled;
    });
  }

  async #setEnabled(
    setting: DirectXGamingSetting,
    enabled: boolean
  ): Promise<void> {
    await this.#assertSupported(setting);
    const source = await this.#readGlobalSettings();
    await this.#persist(setting, source, enabled);
  }

  async #persist(
    setting: DirectXGamingSetting,
    source: string,
    enabled: boolean
  ): Promise<void> {
    // Validate every existing occurrence before constructing a write. A damaged
    // or future-format field is safer left untouched than guessed at.
    readDirectXGlobalBoolean(source, setting.valueName, setting.defaultEnabled);
    const updated = writeDirectXGlobalBoolean(
      source,
      setting.valueName,
      enabled
    );

    // Idempotent requests deliberately avoid touching this undocumented value.
    if (updated === source) {
      return;
    }

    await this.#runCommand([
      "add",
      this.#registryKey,
      "/v",
      DIRECTX_GLOBAL_SETTINGS_VALUE,
      "/t",
      "REG_SZ",
      "/d",
      updated,
      "/f"
    ]);

    const persisted = await this.#readGlobalSettings();
    if (
      readDirectXGlobalBoolean(
        persisted,
        setting.valueName,
        setting.defaultEnabled
      ) !== enabled
    ) {
      throw new Error(`Windows no confirmó el valor ${setting.valueName}.`);
    }
  }

  async #assertSupported(setting: DirectXGamingSetting): Promise<void> {
    if (!(await this.isSupported(setting))) {
      throw new UnsupportedDirectXGamingSettingError(setting.valueName);
    }
  }

  async #readGlobalSettings(): Promise<string> {
    try {
      const stdout = await this.#runCommand([
        "query",
        this.#registryKey,
        "/v",
        DIRECTX_GLOBAL_SETTINGS_VALUE
      ]);
      const match = stdout.match(
        /^\s*DirectXUserGlobalSettings[ \t]+REG_SZ(?:[ \t]+(.*))?$/imu
      );
      if (match === null) {
        throw new Error(
          `No se pudo interpretar ${DIRECTX_GLOBAL_SETTINGS_VALUE} como REG_SZ.`
        );
      }
      return match[1] ?? "";
    } catch (error) {
      const processError = error as ProcessError;
      // reg.exe returns code 1 when this per-user value has never been created.
      if (processError.code === 1) {
        return "";
      }
      throw error;
    }
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#pending.catch(() => undefined).then(operation);
    this.#pending = next;
    return next;
  }
}

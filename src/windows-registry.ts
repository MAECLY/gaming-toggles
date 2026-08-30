import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const NOTIFICATION_COMMAND = String.raw`
$ErrorActionPreference = "Stop"
[void][Reflection.Assembly]::LoadFrom(
  $env:MAECLY_SETTINGS_NOTIFIER_ASSEMBLY
)
$result = [Maecly.WindowsSettingsNotifier]::Notify()
$matched = $result -shr 16
$notified = $result -band 0xffff
Write-Output "matched=$matched notified=$notified"
if ($notified -ne $matched) { exit 1 }
`;

export const GAME_BAR_REGISTRY_KEY = String.raw`HKCU\Software\Microsoft\GameBar`;

export type XboxSetting = {
  readonly valueName: "AutoGameModeEnabled" | "UseNexusForGameBarEnabled";
  readonly defaultEnabled: boolean;
  readonly notifyWindows?: boolean;
};

export const GAME_MODE_SETTING: XboxSetting = {
  valueName: "AutoGameModeEnabled",
  // Windows 11 ships with Game Mode enabled when no per-user override exists.
  defaultEnabled: true,
  // The Game Mode settings page caches this value while it is open.
  notifyWindows: true
};

export const CONTROLLER_GAME_BAR_SETTING: XboxSetting = {
  valueName: "UseNexusForGameBarEnabled",
  // Windows 11 enables the Xbox/Nexus button shortcut by default.
  defaultEnabled: true
};

type ProcessError = Error & {
  code?: number | string;
  stderr?: string;
};

export type RegistryCommand = (args: readonly string[]) => Promise<string>;
export type SettingsChangeNotifier = () => Promise<void>;

export function createWindowsSettingsNotifier(
  systemRoot: string,
  assemblyPath = fileURLToPath(
    new URL("./MAECLY.WindowsSettingsNotifier.dll", import.meta.url)
  )
): SettingsChangeNotifier {
  const powerShell =
    `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;

  return async () => {
    await execFileAsync(
      powerShell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", NOTIFICATION_COMMAND],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          MAECLY_SETTINGS_NOTIFIER_ASSEMBLY: assemblyPath
        },
        timeout: 5000,
        windowsHide: true
      }
    );
  };
}

export interface RegistryClient {
  isEnabled(setting: XboxSetting): Promise<boolean>;
  setEnabled(setting: XboxSetting, enabled: boolean): Promise<void>;
  toggle(setting: XboxSetting): Promise<boolean>;
}

export class WindowsRegistryClient implements RegistryClient {
  readonly #runCommand: RegistryCommand;
  readonly #notifySettingsChange: SettingsChangeNotifier;
  readonly #registryKey: string;
  readonly #pending = new Map<string, Promise<boolean>>();

  public constructor(
    systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`,
    runCommand?: RegistryCommand,
    notifySettingsChange?: SettingsChangeNotifier,
    registryKey = GAME_BAR_REGISTRY_KEY
  ) {
    const regExe = `${systemRoot}\\System32\\reg.exe`;
    this.#runCommand = runCommand ?? (async (args) => {
      const { stdout } = await execFileAsync(regExe, [...args], {
        encoding: "utf8",
        windowsHide: true
      });
      return stdout;
    });
    this.#notifySettingsChange =
      notifySettingsChange ?? createWindowsSettingsNotifier(systemRoot);
    this.#registryKey = registryKey;
  }

  public async isEnabled(setting: XboxSetting): Promise<boolean> {
    const value = await this.#readDword(setting.valueName);
    return value === undefined ? setting.defaultEnabled : value !== 0;
  }

  public async setEnabled(setting: XboxSetting, enabled: boolean): Promise<void> {
    await this.#runCommand([
        "add",
        this.#registryKey,
        "/v",
        setting.valueName,
        "/t",
        "REG_DWORD",
        "/d",
        enabled ? "1" : "0",
        "/f"
      ]);

    const persisted = await this.#readDword(setting.valueName);
    if (persisted !== (enabled ? 1 : 0)) {
      throw new Error(`Windows no confirmó el valor ${setting.valueName}.`);
    }

    if (setting.notifyWindows === true) {
      await this.#notifySettingsChange();
    }
  }

  public toggle(setting: XboxSetting): Promise<boolean> {
    const previous = this.#pending.get(setting.valueName) ?? Promise.resolve(false);
    const next = previous
      .catch(() => false)
      .then(async () => {
        const enabled = !(await this.isEnabled(setting));
        await this.setEnabled(setting, enabled);
        return enabled;
      });

    this.#pending.set(setting.valueName, next);
    const cleanup = (): void => {
      if (this.#pending.get(setting.valueName) === next) {
        this.#pending.delete(setting.valueName);
      }
    };
    void next.then(cleanup, cleanup);
    return next;
  }

  async #readDword(valueName: XboxSetting["valueName"]): Promise<number | undefined> {
    try {
      const stdout = await this.#runCommand([
        "query",
        this.#registryKey,
        "/v",
        valueName
      ]);
      const match = stdout.match(/REG_DWORD\s+(0x[0-9a-f]+|\d+)/i);
      if (!match) {
        throw new Error(`No se pudo interpretar ${valueName} como REG_DWORD.`);
      }
      return Number.parseInt(match[1], 0);
    } catch (error) {
      const processError = error as ProcessError;
      // reg.exe returns code 1 when the key or value has never been created.
      if (processError.code === 1) {
        return undefined;
      }
      throw error;
    }
  }
}

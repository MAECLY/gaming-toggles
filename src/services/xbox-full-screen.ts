import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { XboxFullScreenNativeApi } from "../platform/windows-native.js";

const execFileAsync = promisify(execFile);

export const GAMING_CONFIGURATION_REGISTRY_KEY =
  String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\GamingConfiguration`;
export const GAMING_HOME_APP_VALUE = "GamingHomeApp";

export type XboxFullScreenProbe =
  | {
      readonly available: true;
      readonly configuredApp: string;
      readonly reason: "configured";
    }
  | {
      readonly available: false;
      readonly reason: "gaming-home-app-not-configured";
    };

export type XboxFullScreenRegistryCommand = (
  args: readonly string[]
) => Promise<string>;

type ProcessError = Error & { code?: number | string };

export class XboxFullScreenUnavailableError extends Error {
  public constructor() {
    super(
      "Windows Xbox full-screen experience is not configured for this user."
    );
    this.name = "XboxFullScreenUnavailableError";
  }
}

export class XboxFullScreenService {
  readonly #native: XboxFullScreenNativeApi;
  readonly #runRegistry: XboxFullScreenRegistryCommand;

  public constructor(
    native: XboxFullScreenNativeApi,
    systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`,
    runRegistry?: XboxFullScreenRegistryCommand
  ) {
    this.#native = native;
    const regExe = `${systemRoot}\\System32\\reg.exe`;
    this.#runRegistry = runRegistry ?? (async (args) => {
      const { stdout } = await execFileAsync(regExe, [...args], {
        encoding: "utf8",
        windowsHide: true
      });
      return stdout;
    });
  }

  public async probe(): Promise<XboxFullScreenProbe> {
    try {
      const output = await this.#runRegistry([
        "query",
        GAMING_CONFIGURATION_REGISTRY_KEY,
        "/v",
        GAMING_HOME_APP_VALUE
      ]);
      const match = output.match(/REG_SZ\s+([^\r\n]+)/i);
      const configuredApp = match?.[1]?.trim();
      if (!configuredApp) {
        return { available: false, reason: "gaming-home-app-not-configured" };
      }
      return { available: true, configuredApp, reason: "configured" };
    } catch (error) {
      if ((error as ProcessError).code === 1) {
        return { available: false, reason: "gaming-home-app-not-configured" };
      }
      throw error;
    }
  }

  /**
   * Sends the official Win+F11 shortcut. The Windows experience owns its state;
   * this service intentionally does not claim whether that experience is active.
   */
  public async trigger(): Promise<void> {
    const availability = await this.probe();
    if (!availability.available) {
      throw new XboxFullScreenUnavailableError();
    }
    await this.#native.sendXboxFullScreenShortcut();
  }
}

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const NATIVE_COMMAND = String.raw`
$ErrorActionPreference = "Stop"
[void][Reflection.Assembly]::LoadFrom($env:MAECLY_NATIVE_ASSEMBLY)

switch ($env:MAECLY_NATIVE_OPERATION) {
  "get-pointer-precision" {
    Write-Output ([Maecly.WindowsSettingsNotifier]::GetPointerPrecisionState())
    break
  }
  "set-pointer-precision" {
    $enabled = [Convert]::ToBoolean($env:MAECLY_NATIVE_ENABLED)
    Write-Output ([Maecly.WindowsSettingsNotifier]::SetPointerPrecisionEnabled($enabled))
    break
  }
  "send-xbox-full-screen-shortcut" {
    $sent = [Maecly.WindowsSettingsNotifier]::SendXboxFullScreenShortcut()
    Write-Output "sent=$sent"
    break
  }
  default {
    throw "Unknown native operation: $env:MAECLY_NATIVE_OPERATION"
  }
}
`;

export type PointerPrecisionState = {
  readonly enabled: boolean;
  readonly threshold1: number;
  readonly threshold2: number;
  readonly acceleration: 0 | 1 | 2;
};

export type WindowsNativeOperation =
  | "get-pointer-precision"
  | "set-pointer-precision"
  | "send-xbox-full-screen-shortcut";

export type WindowsNativeRunner = (
  operation: WindowsNativeOperation,
  enabled?: boolean
) => Promise<string>;

export interface PointerPrecisionNativeApi {
  getPointerPrecision(): Promise<PointerPrecisionState>;
  setPointerPrecisionEnabled(enabled: boolean): Promise<PointerPrecisionState>;
}

export interface XboxFullScreenNativeApi {
  sendXboxFullScreenShortcut(): Promise<void>;
}

export function parsePointerPrecisionState(output: string): PointerPrecisionState {
  const match = output.match(
    /threshold1=(-?\d+)\s+threshold2=(-?\d+)\s+acceleration=(-?\d+)/i
  );
  if (!match) {
    throw new Error("Windows returned an invalid pointer precision state.");
  }

  const threshold1 = Number.parseInt(match[1], 10);
  const threshold2 = Number.parseInt(match[2], 10);
  const acceleration = Number.parseInt(match[3], 10);
  if (threshold1 < 0 || threshold2 < 0 || ![0, 1, 2].includes(acceleration)) {
    throw new Error("Windows returned pointer precision values outside the supported range.");
  }

  return {
    enabled: acceleration !== 0,
    threshold1,
    threshold2,
    acceleration: acceleration as 0 | 1 | 2
  };
}

export function createWindowsNativeRunner(
  systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`,
  assemblyPath = fileURLToPath(
    new URL("./MAECLY.WindowsSettingsNotifier.dll", import.meta.url)
  )
): WindowsNativeRunner {
  const powerShell =
    `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;

  return async (operation, enabled) => {
    const { stdout } = await execFileAsync(
      powerShell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", NATIVE_COMMAND],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          MAECLY_NATIVE_ASSEMBLY: assemblyPath,
          MAECLY_NATIVE_ENABLED: enabled === true ? "true" : "false",
          MAECLY_NATIVE_OPERATION: operation
        },
        timeout: 5000,
        windowsHide: true
      }
    );
    return stdout;
  };
}

export class WindowsNativeBridge
implements PointerPrecisionNativeApi, XboxFullScreenNativeApi {
  readonly #run: WindowsNativeRunner;

  public constructor(run: WindowsNativeRunner = createWindowsNativeRunner()) {
    this.#run = run;
  }

  public async getPointerPrecision(): Promise<PointerPrecisionState> {
    return parsePointerPrecisionState(await this.#run("get-pointer-precision"));
  }

  public async setPointerPrecisionEnabled(
    enabled: boolean
  ): Promise<PointerPrecisionState> {
    return parsePointerPrecisionState(
      await this.#run("set-pointer-precision", enabled)
    );
  }

  public async sendXboxFullScreenShortcut(): Promise<void> {
    const output = await this.#run("send-xbox-full-screen-shortcut");
    if (!/\bsent=4\b/i.test(output)) {
      throw new Error("Windows did not accept the complete Win+F11 shortcut.");
    }
  }
}

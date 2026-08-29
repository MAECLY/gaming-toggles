import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const source = path.join(
  root,
  "native",
  "windows-settings-notifier",
  "WindowsSettingsNotifier.cs"
);
const destination = path.join(
  root,
  "com.miguelangelstream.windows-xbox-settings.sdPlugin",
  "bin",
  "MAECLY.WindowsSettingsNotifier.dll"
);
const obsoleteExecutable = path.join(
  path.dirname(destination),
  "windows-settings-notifier.exe"
);
const powerShell = path.join(
  process.env.SystemRoot ?? String.raw`C:\Windows`,
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);
const compileCommand = String.raw`
$ErrorActionPreference = "Stop"
$source = [IO.File]::ReadAllText($env:MAECLY_NOTIFIER_SOURCE)
Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly $env:MAECLY_NOTIFIER_DESTINATION -OutputType Library
`;

await mkdir(path.dirname(destination), { recursive: true });
await rm(destination, { force: true });
await rm(obsoleteExecutable, { force: true });
await execFileAsync(
  powerShell,
  ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", compileCommand],
  {
    env: {
      ...process.env,
      MAECLY_NOTIFIER_DESTINATION: destination,
      MAECLY_NOTIFIER_SOURCE: source
    },
    windowsHide: true
  }
);
console.log(`Generado ${destination}`);

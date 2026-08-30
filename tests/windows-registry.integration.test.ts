import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, describe, it } from "node:test";
import { promisify } from "node:util";

import {
  CONTROLLER_GAME_BAR_SETTING,
  WindowsRegistryClient
} from "../src/windows-registry.ts";

const execFileAsync = promisify(execFile);
const integration = process.platform === "win32" ? describe : describe.skip;
const temporaryKey = [
  "HKCU",
  "Software",
  "MAECLY",
  "Tests",
  "GamingToggles",
  String(process.pid)
].join("\\");

integration("integración real con reg.exe", () => {
  const systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`;
  const regExe = `${systemRoot}\\System32\\reg.exe`;
  const client = new WindowsRegistryClient(
    systemRoot,
    undefined,
    async () => undefined,
    temporaryKey
  );

  after(async () => {
    assert.match(temporaryKey, /^HKCU\\Software\\MAECLY\\Tests\\GamingToggles\\\d+$/);
    await execFileAsync(regExe, ["delete", temporaryKey, "/f"]).catch(() => undefined);
  });

  it("crea, lee y alterna un DWORD sin privilegios de administrador", async () => {
    await client.setEnabled(CONTROLLER_GAME_BAR_SETTING, true);
    assert.equal(await client.isEnabled(CONTROLLER_GAME_BAR_SETTING), true);
    assert.equal(await client.toggle(CONTROLLER_GAME_BAR_SETTING), false);
    assert.equal(await client.isEnabled(CONTROLLER_GAME_BAR_SETTING), false);
  });
});

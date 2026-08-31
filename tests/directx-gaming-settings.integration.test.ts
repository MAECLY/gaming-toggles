import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, describe, it } from "node:test";
import { promisify } from "node:util";

import {
  AUTO_HDR_SETTING,
  DIRECTX_GLOBAL_SETTINGS_VALUE,
  DirectXGamingSettingsClient,
  WINDOWED_OPTIMIZATIONS_SETTING
} from "../src/services/directx-gaming-settings.ts";

const execFileAsync = promisify(execFile);
const integration = process.platform === "win32" ? describe : describe.skip;
const temporaryKey = [
  "HKCU",
  "Software",
  "MAECLY",
  "Tests",
  "GamingToggles",
  "DirectX",
  String(process.pid)
].join("\\");

integration("DirectX Labs integration with real reg.exe", () => {
  const systemRoot = process.env.SystemRoot ?? String.raw`C:\Windows`;
  const regExe = `${systemRoot}\\System32\\reg.exe`;
  const client = new DirectXGamingSettingsClient(
    systemRoot,
    undefined,
    async () => true,
    temporaryKey
  );

  after(async () => {
    assert.match(
      temporaryKey,
      /^HKCU\\Software\\MAECLY\\Tests\\GamingToggles\\DirectX\\\d+$/
    );
    await execFileAsync(regExe, ["delete", temporaryKey, "/f"]).catch(
      () => undefined
    );
  });

  it("persists both fields without elevation and retains third-party data", async () => {
    const initial = "VendorFutureFlag=alpha=beta;AutoHDREnable=0;";
    await execFileAsync(
      regExe,
      [
        "add",
        temporaryKey,
        "/v",
        DIRECTX_GLOBAL_SETTINGS_VALUE,
        "/t",
        "REG_SZ",
        "/d",
        initial,
        "/f"
      ],
      { windowsHide: true }
    );

    await client.setEnabled(AUTO_HDR_SETTING, true);
    await client.setEnabled(WINDOWED_OPTIMIZATIONS_SETTING, true);

    assert.equal(await client.isEnabled(AUTO_HDR_SETTING), true);
    assert.equal(await client.isEnabled(WINDOWED_OPTIMIZATIONS_SETTING), true);

    const { stdout } = await execFileAsync(
      regExe,
      ["query", temporaryKey, "/v", DIRECTX_GLOBAL_SETTINGS_VALUE],
      { encoding: "utf8", windowsHide: true }
    );
    assert.match(stdout, /VendorFutureFlag=alpha=beta;/u);
    assert.match(stdout, /AutoHDREnable=1;/u);
    assert.match(stdout, /SwapEffectUpgradeEnable=1;/u);
  });
});


import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { XboxFullScreenNativeApi } from "../src/platform/windows-native.ts";
import {
  GAMING_CONFIGURATION_REGISTRY_KEY,
  XboxFullScreenService,
  XboxFullScreenUnavailableError,
  type XboxFullScreenRegistryCommand
} from "../src/services/xbox-full-screen.ts";

function createShortcut(): XboxFullScreenNativeApi & { calls: number } {
  return {
    calls: 0,
    async sendXboxFullScreenShortcut() {
      this.calls += 1;
    }
  };
}

describe("XboxFullScreenService", () => {
  it("probes the current-user GamingHomeApp configuration", async () => {
    const calls: string[][] = [];
    const registry: XboxFullScreenRegistryCommand = async (args) => {
      calls.push([...args]);
      return [
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\GamingConfiguration",
        "    GamingHomeApp    REG_SZ    Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App"
      ].join("\r\n");
    };
    const service = new XboxFullScreenService(
      createShortcut(),
      String.raw`C:\Windows`,
      registry
    );

    assert.deepEqual(await service.probe(), {
      available: true,
      configuredApp: "Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App",
      reason: "configured"
    });
    assert.deepEqual(calls[0], [
      "query",
      GAMING_CONFIGURATION_REGISTRY_KEY,
      "/v",
      "GamingHomeApp"
    ]);
  });

  it("triggers stateless Win+F11 only when GamingHomeApp is configured", async () => {
    const shortcut = createShortcut();
    const service = new XboxFullScreenService(
      shortcut,
      String.raw`C:\Windows`,
      async () => "GamingHomeApp REG_SZ Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App"
    );

    await service.trigger();
    assert.equal(shortcut.calls, 1);
    assert.equal("isEnabled" in service, false);
  });

  it("reports an absent value as unsupported and never sends the shortcut", async () => {
    const shortcut = createShortcut();
    const missing = Object.assign(new Error("not found"), { code: 1 });
    const service = new XboxFullScreenService(
      shortcut,
      String.raw`C:\Windows`,
      async () => { throw missing; }
    );

    assert.deepEqual(await service.probe(), {
      available: false,
      reason: "gaming-home-app-not-configured"
    });
    await assert.rejects(service.trigger(), XboxFullScreenUnavailableError);
    assert.equal(shortcut.calls, 0);
  });

  it("does not hide access or execution errors from reg.exe", async () => {
    const denied = Object.assign(new Error("Access is denied"), { code: 5 });
    const service = new XboxFullScreenService(
      createShortcut(),
      String.raw`C:\Windows`,
      async () => { throw denied; }
    );

    await assert.rejects(service.probe(), denied);
  });
});

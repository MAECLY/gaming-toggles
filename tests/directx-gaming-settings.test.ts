import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTO_HDR_SETTING,
  DIRECTX_GLOBAL_SETTINGS_VALUE,
  DIRECTX_USER_GPU_PREFERENCES_KEY,
  DirectXGamingSettingsClient,
  createDirectXBooleanFeature,
  supportsDirectXGamingLabs,
  UnsupportedDirectXGamingSettingError,
  WINDOWED_OPTIMIZATIONS_SETTING,
  type DirectXRegistryCommand
} from "../src/services/directx-gaming-settings.ts";

function fakeRegistry(initial?: string): {
  readonly client: DirectXGamingSettingsClient;
  readonly calls: readonly string[][];
  value(): string | undefined;
} {
  let value = initial;
  const calls: string[][] = [];
  const command: DirectXRegistryCommand = async (args) => {
    calls.push([...args]);
    if (args[0] === "query") {
      if (value === undefined) {
        throw Object.assign(new Error("not found"), { code: 1 });
      }
      return `HKEY_CURRENT_USER\\Software\\Microsoft\\DirectX\\UserGpuPreferences\n    ${DIRECTX_GLOBAL_SETTINGS_VALUE}    REG_SZ    ${value}\n`;
    }
    if (args[0] === "add") {
      value = args[args.indexOf("/d") + 1];
      return "OK";
    }
    throw new Error(`Unexpected operation ${args[0]}`);
  };

  return {
    client: new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      command,
      async () => true
    ),
    calls,
    value: () => value
  };
}

describe("DirectXGamingSettingsClient", () => {
  it("feature-gates Labs to Windows 11 builds", () => {
    assert.equal(supportsDirectXGamingLabs("win32", "10.0.22000"), true);
    assert.equal(supportsDirectXGamingLabs("win32", "10.0.26200.9278"), true);
    assert.equal(supportsDirectXGamingLabs("win32", "10.0.19045"), false);
    assert.equal(supportsDirectXGamingLabs("linux", "6.12.0"), false);
    assert.equal(supportsDirectXGamingLabs("win32", "future"), false);
  });

  it("reads both Labs controls from one composite REG_SZ", async () => {
    const { client } = fakeRegistry(
      "AutoHDREnable=1;SwapEffectUpgradeEnable=0;Future=kept;"
    );

    assert.equal(await client.isEnabled(AUTO_HDR_SETTING), true);
    assert.equal(await client.isEnabled(WINDOWED_OPTIMIZATIONS_SETTING), false);
  });

  it("provides a no-argument adapter for the generic boolean action", async () => {
    const { client } = fakeRegistry("AutoHDREnable=0;");
    const feature = createDirectXBooleanFeature(client, AUTO_HDR_SETTING);

    assert.equal(feature.id, "directx.AutoHDREnable");
    assert.equal(await feature.isEnabled(), false);
    assert.equal(await feature.toggle(), true);
  });

  it("uses disabled defaults when the per-user value is absent", async () => {
    const { client } = fakeRegistry();

    assert.equal(await client.isEnabled(AUTO_HDR_SETTING), false);
    assert.equal(await client.isEnabled(WINDOWED_OPTIMIZATIONS_SETTING), false);
  });

  it("uses the exact HKCU REG_SZ command contract and verifies persistence", async () => {
    const { client, calls } = fakeRegistry("Other=abc;AutoHDREnable=0;");

    await client.setEnabled(AUTO_HDR_SETTING, true);

    assert.deepEqual(calls, [
      ["query", DIRECTX_USER_GPU_PREFERENCES_KEY, "/v", DIRECTX_GLOBAL_SETTINGS_VALUE],
      [
        "add",
        DIRECTX_USER_GPU_PREFERENCES_KEY,
        "/v",
        DIRECTX_GLOBAL_SETTINGS_VALUE,
        "/t",
        "REG_SZ",
        "/d",
        "Other=abc;AutoHDREnable=1;",
        "/f"
      ],
      ["query", DIRECTX_USER_GPU_PREFERENCES_KEY, "/v", DIRECTX_GLOBAL_SETTINGS_VALUE]
    ]);
  });

  it("preserves the other Labs field and unknown future tokens", async () => {
    const original =
      "Vendor = alpha=beta ;AutoHDREnable=0;FutureFlag=🧪;" +
      "SwapEffectUpgradeEnable=1;";
    const { client, value } = fakeRegistry(original);

    assert.equal(await client.toggle(AUTO_HDR_SETTING), true);
    assert.equal(
      value(),
      "Vendor = alpha=beta ;AutoHDREnable=1;FutureFlag=🧪;" +
        "SwapEffectUpgradeEnable=1;"
    );
  });

  it("does not issue a write for an idempotent request", async () => {
    const { client, calls } = fakeRegistry("AutoHDREnable=1;Unknown=7;");

    await client.setEnabled(AUTO_HDR_SETTING, true);

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "query");
  });

  it("does not read or write when the feature probe reports unsupported", async () => {
    const calls: string[][] = [];
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      async (args) => {
        calls.push([...args]);
        return "";
      },
      async () => false
    );

    await assert.rejects(
      client.toggle(AUTO_HDR_SETTING),
      UnsupportedDirectXGamingSettingError
    );
    assert.deepEqual(calls, []);
  });

  it("does not mutate when the support probe itself fails", async () => {
    let commandCount = 0;
    const probeError = new Error("feature detection failed");
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      async () => {
        commandCount += 1;
        return "";
      },
      async () => { throw probeError; }
    );

    await assert.rejects(client.setEnabled(AUTO_HDR_SETTING, true), probeError);
    assert.equal(commandCount, 0);
  });

  it("does not mutate when reading the current value is denied", async () => {
    const denied = Object.assign(new Error("Access is denied"), { code: 5 });
    let addCount = 0;
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      async (args) => {
        if (args[0] === "add") {
          addCount += 1;
        }
        throw denied;
      },
      async () => true
    );

    await assert.rejects(client.toggle(AUTO_HDR_SETTING), denied);
    assert.equal(addCount, 0);
  });

  it("does not mutate malformed REG_SZ output", async () => {
    let addCount = 0;
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      async (args) => {
        if (args[0] === "add") {
          addCount += 1;
        }
        return `${DIRECTX_GLOBAL_SETTINGS_VALUE} REG_DWORD 0x1`;
      },
      async () => true
    );

    await assert.rejects(client.toggle(AUTO_HDR_SETTING), /como REG_SZ/);
    assert.equal(addCount, 0);
  });

  it("does not overwrite a target field with an unknown future encoding", async () => {
    const { client, calls } = fakeRegistry("AutoHDREnable=automatic;Future=1;");

    await assert.rejects(
      client.setEnabled(AUTO_HDR_SETTING, true),
      /no es un entero válido/
    );
    assert.equal(calls.filter((args) => args[0] === "add").length, 0);
  });

  it("propagates a write permission error without attempting verification", async () => {
    const calls: string[][] = [];
    const denied = Object.assign(new Error("Access denied on add"), { code: 5 });
    const command: DirectXRegistryCommand = async (args) => {
      calls.push([...args]);
      if (args[0] === "add") {
        throw denied;
      }
      return `${DIRECTX_GLOBAL_SETTINGS_VALUE} REG_SZ AutoHDREnable=0;`;
    };
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      command,
      async () => true
    );

    await assert.rejects(client.setEnabled(AUTO_HDR_SETTING, true), denied);
    assert.deepEqual(calls.map((args) => args[0]), ["query", "add"]);
  });

  it("detects when Windows does not persist the requested state", async () => {
    const command: DirectXRegistryCommand = async (args) =>
      args[0] === "add"
        ? "OK"
        : `${DIRECTX_GLOBAL_SETTINGS_VALUE} REG_SZ AutoHDREnable=0;`;
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      command,
      async () => true
    );

    await assert.rejects(
      client.setEnabled(AUTO_HDR_SETTING, true),
      /Windows no confirmó el valor AutoHDREnable/
    );
  });

  it("serializes simultaneous changes across both fields to prevent lost updates", async () => {
    const { client, value } = fakeRegistry(
      "AutoHDREnable=0;SwapEffectUpgradeEnable=0;ThirdParty=keep;"
    );

    const result = await Promise.all([
      client.toggle(AUTO_HDR_SETTING),
      client.toggle(WINDOWED_OPTIMIZATIONS_SETTING)
    ]);

    assert.deepEqual(result, [true, true]);
    assert.equal(
      value(),
      "AutoHDREnable=1;SwapEffectUpgradeEnable=1;ThirdParty=keep;"
    );
  });

  it("continues processing after a failed queued mutation", async () => {
    let failNextAdd = true;
    let value = "AutoHDREnable=0;";
    const command: DirectXRegistryCommand = async (args) => {
      if (args[0] === "query") {
        return `${DIRECTX_GLOBAL_SETTINGS_VALUE} REG_SZ ${value}`;
      }
      if (failNextAdd) {
        failNextAdd = false;
        throw new Error("transient failure");
      }
      value = args[args.indexOf("/d") + 1];
      return "OK";
    };
    const client = new DirectXGamingSettingsClient(
      String.raw`C:\Windows`,
      command,
      async () => true
    );

    await assert.rejects(client.toggle(AUTO_HDR_SETTING), /transient failure/);
    assert.equal(await client.toggle(AUTO_HDR_SETTING), true);
    assert.equal(value, "AutoHDREnable=1;");
  });
});

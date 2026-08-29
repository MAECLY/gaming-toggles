import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROLLER_GAME_BAR_SETTING,
  GAME_MODE_SETTING,
  WindowsRegistryClient,
  type RegistryCommand
} from "../src/windows-registry.ts";

function createFakeRegistry(initial: Record<string, number> = {}): {
  client: WindowsRegistryClient;
  values: Map<string, number>;
} {
  const values = new Map(Object.entries(initial));
  const runCommand: RegistryCommand = async (args) => {
    const operation = args[0];
    const valueFlag = args.indexOf("/v");
    const valueName = args[valueFlag + 1];

    if (operation === "query") {
      const value = values.get(valueName);
      if (value === undefined) {
        throw Object.assign(new Error("No se encontró el valor."), { code: 1 });
      }
      return `HKEY_CURRENT_USER\\Software\\Microsoft\\GameBar\n    ${valueName}    REG_DWORD    0x${value.toString(16)}\n`;
    }

    if (operation === "add") {
      const dataFlag = args.indexOf("/d");
      values.set(valueName, Number(args[dataFlag + 1]));
      return "La operación se completó correctamente.";
    }

    throw new Error(`Operación inesperada: ${operation}`);
  };

  return {
    client: new WindowsRegistryClient(String.raw`C:\Windows`, runCommand),
    values
  };
}

describe("WindowsRegistryClient", () => {
  it("usa el valor predeterminado cuando la preferencia aún no existe", async () => {
    const { client } = createFakeRegistry();

    assert.equal(await client.isEnabled(GAME_MODE_SETTING), true);
    assert.equal(await client.isEnabled(CONTROLLER_GAME_BAR_SETTING), true);
  });

  it("lee valores DWORD encendidos y apagados", async () => {
    const { client } = createFakeRegistry({
      AutoGameModeEnabled: 0,
      UseNexusForGameBarEnabled: 1
    });

    assert.equal(await client.isEnabled(GAME_MODE_SETTING), false);
    assert.equal(await client.isEnabled(CONTROLLER_GAME_BAR_SETTING), true);
  });

  it("alterna y verifica el valor persistido", async () => {
    const { client, values } = createFakeRegistry({ AutoGameModeEnabled: 1 });

    assert.equal(await client.toggle(GAME_MODE_SETTING), false);
    assert.equal(values.get("AutoGameModeEnabled"), 0);
    assert.equal(await client.toggle(GAME_MODE_SETTING), true);
    assert.equal(values.get("AutoGameModeEnabled"), 1);
  });

  it("serializa pulsaciones simultáneas de una misma acción", async () => {
    const { client, values } = createFakeRegistry({
      UseNexusForGameBarEnabled: 1
    });

    const results = await Promise.all([
      client.toggle(CONTROLLER_GAME_BAR_SETTING),
      client.toggle(CONTROLLER_GAME_BAR_SETTING)
    ]);

    assert.deepEqual(results, [false, true]);
    assert.equal(values.get("UseNexusForGameBarEnabled"), 1);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROLLER_GAME_BAR_SETTING,
  GAME_MODE_SETTING,
  WindowsRegistryClient,
  type RegistryCommand,
  type SettingsChangeNotifier
} from "../src/windows-registry.ts";

function createFakeRegistry(initial: Record<string, number> = {}): {
  client: WindowsRegistryClient;
  notificationCount: () => number;
  values: Map<string, number>;
} {
  const values = new Map(Object.entries(initial));
  let notifications = 0;
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
  const notifySettingsChange: SettingsChangeNotifier = async () => {
    notifications += 1;
  };

  return {
    client: new WindowsRegistryClient(
      String.raw`C:\Windows`,
      runCommand,
      notifySettingsChange
    ),
    notificationCount: () => notifications,
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
    const { client, notificationCount, values } = createFakeRegistry({
      AutoGameModeEnabled: 1
    });

    assert.equal(await client.toggle(GAME_MODE_SETTING), false);
    assert.equal(values.get("AutoGameModeEnabled"), 0);
    assert.equal(notificationCount(), 1);
    assert.equal(await client.toggle(GAME_MODE_SETTING), true);
    assert.equal(values.get("AutoGameModeEnabled"), 1);
    assert.equal(notificationCount(), 2);
  });

  it("serializa pulsaciones simultáneas de una misma acción", async () => {
    const { client, notificationCount, values } = createFakeRegistry({
      UseNexusForGameBarEnabled: 1
    });

    const results = await Promise.all([
      client.toggle(CONTROLLER_GAME_BAR_SETTING),
      client.toggle(CONTROLLER_GAME_BAR_SETTING)
    ]);

    assert.deepEqual(results, [false, true]);
    assert.equal(values.get("UseNexusForGameBarEnabled"), 1);
    assert.equal(notificationCount(), 0);
  });

  it("usa el contrato correcto de reg.exe para leer y escribir en HKCU", async () => {
    const calls: readonly string[][] = [];
    const mutableCalls = calls as string[][];
    let value = 1;
    const command: RegistryCommand = async (args) => {
      mutableCalls.push([...args]);
      if (args[0] === "add") {
        value = Number(args[args.indexOf("/d") + 1]);
        return "OK";
      }
      return `AutoGameModeEnabled REG_DWORD 0x${value}`;
    };
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      command,
      async () => undefined
    );

    await client.setEnabled(GAME_MODE_SETTING, false);

    assert.deepEqual(calls[0], [
      "add",
      String.raw`HKCU\Software\Microsoft\GameBar`,
      "/v",
      "AutoGameModeEnabled",
      "/t",
      "REG_DWORD",
      "/d",
      "0",
      "/f"
    ]);
    assert.deepEqual(calls[1], [
      "query",
      String.raw`HKCU\Software\Microsoft\GameBar`,
      "/v",
      "AutoGameModeEnabled"
    ]);
  });

  it("rechaza respuestas que no sean REG_DWORD", async () => {
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      async () => "AutoGameModeEnabled REG_SZ invalid",
      async () => undefined
    );

    await assert.rejects(
      client.isEnabled(GAME_MODE_SETTING),
      /No se pudo interpretar AutoGameModeEnabled como REG_DWORD/
    );
  });

  it("propaga errores de permisos y no los confunde con valores ausentes", async () => {
    const denied = Object.assign(new Error("Access is denied"), { code: 5 });
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      async () => { throw denied; },
      async () => undefined
    );

    await assert.rejects(client.isEnabled(GAME_MODE_SETTING), denied);
  });

  it("detecta cuando Windows no persiste el valor solicitado", async () => {
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      async (args) => args[0] === "add"
        ? "OK"
        : "AutoGameModeEnabled REG_DWORD 0x1",
      async () => undefined
    );

    await assert.rejects(
      client.setEnabled(GAME_MODE_SETTING, false),
      /Windows no confirmó el valor AutoGameModeEnabled/
    );
  });

  it("propaga el fallo del notificador después de confirmar el Registro", async () => {
    const notifierError = new Error("No fue posible notificar Settings");
    const { values } = createFakeRegistry({ AutoGameModeEnabled: 1 });
    const command: RegistryCommand = async (args) => {
      const name = args[args.indexOf("/v") + 1];
      if (args[0] === "add") {
        values.set(name, Number(args[args.indexOf("/d") + 1]));
        return "OK";
      }
      return `${name} REG_DWORD 0x${values.get(name)?.toString(16)}`;
    };
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      command,
      async () => { throw notifierError; }
    );

    await assert.rejects(client.toggle(GAME_MODE_SETTING), notifierError);
    assert.equal(values.get("AutoGameModeEnabled"), 0);
  });

  it("se recupera después de una pulsación fallida y procesa la siguiente", async () => {
    let shouldFail = true;
    const { values } = createFakeRegistry({ UseNexusForGameBarEnabled: 1 });
    const command: RegistryCommand = async (args) => {
      const name = args[args.indexOf("/v") + 1];
      if (args[0] === "add") {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("fallo transitorio");
        }
        values.set(name, Number(args[args.indexOf("/d") + 1]));
        return "OK";
      }
      return `${name} REG_DWORD 0x${values.get(name)?.toString(16)}`;
    };
    const client = new WindowsRegistryClient(
      String.raw`C:\Windows`,
      command,
      async () => undefined
    );

    await assert.rejects(client.toggle(CONTROLLER_GAME_BAR_SETTING));
    assert.equal(await client.toggle(CONTROLLER_GAME_BAR_SETTING), false);
  });
});

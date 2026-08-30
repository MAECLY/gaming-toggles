import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pluginDirectory = "com.miguelangelstream.windows-xbox-settings.sdPlugin";

describe("manifiesto, permisos y observabilidad", () => {
  it("declara únicamente Windows, dos acciones Keypad y ningún requisito de elevación", async () => {
    const manifest = JSON.parse(
      await readFile(`${pluginDirectory}/manifest.json`, "utf8")
    ) as Record<string, unknown>;
    const actions = manifest.Actions as Array<Record<string, unknown>>;
    const operatingSystems = manifest.OS as Array<Record<string, unknown>>;

    assert.deepEqual(operatingSystems.map((item) => item.Platform), ["windows"]);
    assert.equal(actions.length, 2);
    assert.ok(actions.every((action) =>
      (action.Controllers as string[]).length === 1 &&
      (action.Controllers as string[])[0] === "Keypad"
    ));
    assert.equal(JSON.stringify(manifest).match(/admin|elevat|runas/gi), null);
  });

  it("limita la escritura de configuración al perfil HKCU del usuario", async () => {
    const source = await readFile("src/windows-registry.ts", "utf8");
    assert.match(source, /HKCU\\Software\\Microsoft\\GameBar/);
    assert.doesNotMatch(source, /HKLM|HKEY_LOCAL_MACHINE|Start-Process\s+-Verb\s+RunAs/i);
  });

  it("activa logs informativos y registra arranque, éxito, lectura y error", async () => {
    const plugin = await readFile("src/plugin.ts", "utf8");
    const controller = await readFile("src/toggle-setting-controller.ts", "utf8");

    assert.match(plugin, /logger\.setLevel\("info"\)/);
    assert.match(plugin, /Iniciando Xbox para Windows/);
    assert.match(controller, /confirmado por Windows/);
    assert.match(controller, /No se pudo alternar/);
    assert.match(controller, /No se pudo leer/);
  });

  it("conserva el notificador de Modo Juego como prueba de regresión", async () => {
    const registry = await readFile("src/windows-registry.ts", "utf8");
    const notifier = await readFile(
      "native/windows-settings-notifier/WindowsSettingsNotifier.cs",
      "utf8"
    );

    assert.match(registry, /AutoGameModeEnabled[\s\S]*notifyWindows:\s*true/);
    assert.match(notifier, /WM_SETTINGCHANGE/);
    assert.match(notifier, /SystemSettings/);
    assert.match(notifier, /"GameBar"/);
  });
});

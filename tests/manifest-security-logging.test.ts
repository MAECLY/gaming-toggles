import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pluginDirectory = "com.maecly.gamingtoggles.sdPlugin";

describe("manifiesto, permisos y observabilidad", () => {
  it("declara únicamente Windows, siete acciones Keypad y ningún requisito de elevación", async () => {
    const manifest = JSON.parse(
      await readFile(`${pluginDirectory}/manifest.json`, "utf8")
    ) as Record<string, unknown>;
    const actions = manifest.Actions as Array<Record<string, unknown>>;
    const operatingSystems = manifest.OS as Array<Record<string, unknown>>;

    assert.deepEqual(operatingSystems.map((item) => item.Platform), ["windows"]);
    assert.equal(actions.length, 7);
    assert.ok(actions.every((action) =>
      (action.Controllers as string[]).length === 1 &&
      (action.Controllers as string[])[0] === "Keypad"
    ));
    assert.equal(JSON.stringify(manifest).match(/admin|elevat|runas/gi), null);
  });

  it("limita la escritura de configuración al perfil HKCU del usuario", async () => {
    const source = (await Promise.all([
      "src/windows-registry.ts",
      "src/services/directx-gaming-settings.ts",
      "src/services/xbox-full-screen.ts",
      "src/services/power-plan-service.ts"
    ].map((path) => readFile(path, "utf8")))).join("\n");
    assert.match(source, /HKCU\\Software\\Microsoft\\GameBar/);
    assert.match(source, /HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences/);
    assert.doesNotMatch(source, /HKLM|HKEY_LOCAL_MACHINE|Start-Process\s+-Verb\s+RunAs/i);
  });

  it("activa logs informativos y registra arranque, éxito, lectura y error", async () => {
    const plugin = await readFile("src/plugin.ts", "utf8");
    const controller = (await Promise.all([
      "src/toggle-setting-controller.ts",
      "src/toggle-feature-controller.ts",
      "src/actions/trigger-xbox-mode.ts",
      "src/actions/toggle-power-plan.ts"
    ].map((path) => readFile(path, "utf8")))).join("\n");

    assert.match(plugin, /logger\.setLevel\("info"\)/);
    assert.match(plugin, /Iniciando Gaming Toggles for PC/);
    assert.match(controller, /confirmado por Windows/);
    assert.match(controller, /No se pudo alternar|Unable to toggle/);
    assert.match(controller, /No se pudo leer|Unable to read/);
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

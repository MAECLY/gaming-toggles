import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const plugin = "com.maecly.gamingtoggles.sdPlugin";

describe("gaming controls product contract", () => {
  it("ships seven unique, localized Keypad actions and labels Labs explicitly", async () => {
    const [manifestText, enText, esText] = await Promise.all([
      readFile(`${plugin}/manifest.json`, "utf8"),
      readFile(`${plugin}/en.json`, "utf8"),
      readFile(`${plugin}/es.json`, "utf8")
    ]);
    const manifest = JSON.parse(manifestText) as { Actions: Array<Record<string, unknown>> };
    const en = JSON.parse(enText) as Record<string, unknown>;
    const es = JSON.parse(esText) as Record<string, unknown>;
    const uuids = manifest.Actions.map((item) => String(item.UUID));
    assert.equal(manifest.Actions.length, 7);
    assert.equal(new Set(uuids).size, 7);
    assert.ok(manifest.Actions.every((item) => (item.Controllers as string[]).join() === "Keypad"));
    for (const uuid of uuids) {
      assert.ok(en[uuid], `missing EN action ${uuid}`);
      assert.ok(es[uuid], `missing ES action ${uuid}`);
    }
    assert.equal(manifest.Actions.filter((item) => String(item.Name).startsWith("[Labs]")).length, 2);
  });

  it("models Xbox mode as a command, not a fabricated boolean state", async () => {
    const manifest = JSON.parse(await readFile(`${plugin}/manifest.json`, "utf8")) as {
      Actions: Array<{ UUID: string; States: unknown[] }>;
    };
    const xbox = manifest.Actions.find((item) => item.UUID.endsWith(".xbox-mode"));
    assert.equal(xbox?.States.length, 1);
    const action = await readFile("src/actions/trigger-xbox-mode.ts", "utf8");
    assert.match(action, /official Win\+F11/);
    assert.doesNotMatch(action, /setState\([12]\)/);
  });

  it("keeps all mutable Windows settings in HKCU and forbids elevation", async () => {
    const paths = [
      "src/windows-registry.ts",
      "src/services/directx-gaming-settings.ts",
      "src/services/xbox-full-screen.ts",
      "src/services/power-plan-service.ts",
      "src/platform/windows-native.ts"
    ];
    const source = (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n");
    assert.match(source, /HKCU\\Software\\Microsoft\\GameBar/);
    assert.match(source, /HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences/);
    assert.doesNotMatch(source, /HKLM|HKEY_LOCAL_MACHINE|-Verb\s+RunAs|runas\.exe/i);
    assert.doesNotMatch(source, /\/delete|\/duplicatescheme|\/changename|\/setacvalueindex/i);
  });
});

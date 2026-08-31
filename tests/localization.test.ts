import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pluginDirectory =
  "com.maecly.gamingtoggles.sdPlugin";
const actionUuids = [
  "com.maecly.gamingtoggles.game-mode",
  "com.maecly.gamingtoggles.controller-game-bar",
  "com.maecly.gamingtoggles.xbox-mode",
  "com.maecly.gamingtoggles.pointer-precision",
  "com.maecly.gamingtoggles.power-plan",
  "com.maecly.gamingtoggles.auto-hdr",
  "com.maecly.gamingtoggles.windowed-optimizations"
];
const titleKeys = [
  "Game Mode\nOFF",
  "Game Mode\nON",
  "Pad → Bar\nOFF",
  "Pad → Bar\nON",
  "Xbox Mode\nWIN+F11",
  "Xbox Mode\nSETUP",
  "Pointer Precision\nOFF",
  "Pointer Precision\nON",
  "Power Plan\nA",
  "Power Plan\nB",
  "Power Plan\nOTHER",
  "Power Plan\nSETUP",
  "Auto HDR LABS\nOFF",
  "Auto HDR LABS\nON",
  "Auto HDR LABS\nUNAVAILABLE",
  "Windowed LABS\nOFF",
  "Windowed LABS\nON",
  "Windowed LABS\nUNAVAILABLE"
];

type JsonObject = Record<string, unknown>;

async function readJson(fileName: string): Promise<JsonObject> {
  return JSON.parse(
    await readFile(`${pluginDirectory}/${fileName}`, "utf8")
  ) as JsonObject;
}

describe("localización ES/EN", () => {
  it("incluye todos los textos de acciones en ambos idiomas", async () => {
    for (const language of ["en", "es"]) {
      const resource = await readJson(`${language}.json`);
      assert.equal(typeof resource.Name, "string");
      assert.equal(typeof resource.Description, "string");
      for (const uuid of actionUuids) {
        const action = resource[uuid] as JsonObject;
        assert.equal(typeof action.Name, "string");
        assert.equal(typeof action.Tooltip, "string");
        assert.ok((action.States as unknown[]).length >= 1);
      }
    }
  });

  it("traduce cada título que el plugin muestra en las teclas", async () => {
    for (const language of ["en", "es"]) {
      const resource = await readJson(`${language}.json`);
      const localization = resource.Localization as JsonObject;
      for (const key of titleKeys) {
        assert.equal(typeof localization[key], "string");
        assert.notEqual((localization[key] as string).length, 0);
      }
    }
  });

  it("mantiene los UUID del manifiesto sincronizados", async () => {
    const manifest = await readJson("manifest.json");
    const actions = manifest.Actions as Array<{ UUID: string }>;
    assert.deepEqual(
      actions.map((action) => action.UUID),
      actionUuids
    );
  });
});

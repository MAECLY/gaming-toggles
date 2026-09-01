import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { describe, it } from "node:test";

const base = "assets/maker_console/v2.1.0";

describe("Maker Console 2.1.0", () => {
  it("ships a complete versioned upload set with correct dimensions and hashes", async () => {
    const media = JSON.parse(await readFile(`${base}/media.json`, "utf8"));
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    const manifest = JSON.parse(await readFile("com.maecly.gamingtoggles.sdPlugin/manifest.json", "utf8"));
    assert.equal(media.version, pkg.version);
    assert.equal(media.imageLanguage, "en");
    assert.deepEqual(media.copyLanguages, ["en", "es"]);
    assert.deepEqual(media.actionUUIDs, manifest.Actions.map(({ UUID }) => UUID));
    assert.equal(media.files.length, 7);
    assert.equal(media.files.filter(({ file }) => file.includes("gallery-")).length, 5);
    for (const entry of media.files) {
      const png = await readFile(`${base}/${entry.file}`);
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(png.readUInt32BE(16), entry.width);
      assert.equal(png.readUInt32BE(20), entry.height);
      assert.equal(entry.width, entry.file.includes("icon-") ? 288 : 1920);
      assert.equal(entry.height, entry.file.includes("icon-") ? 288 : 960);
      assert.equal(createHash("sha256").update(png).digest("hex"), entry.sha256);
    }
    assert.deepEqual((await readdir(`${base}/upload`)).sort(), media.files.map(({ file }) => file.split("/").pop()).sort());
  });

  it("retains the previous two-action listing separately", async () => {
    const old = "assets/maker_console/v2.0.0";
    assert.match(await readFile(`${old}/description/description.en.md`, "utf8"), /Two actions/);
    await readFile(`${old}/upload/gallery-1-two-keys.png`);
    const root = await readdir("assets/maker_console");
    for (const unversioned of ["src", "upload", "description", "release-notes"]) assert.ok(!root.includes(unversioned));
  });

  it("depicts exactly 15 physical slots with seven real action icons", async () => {
    const thumbnail = await readFile(`${base}/src/thumbnail.svg`, "utf8");
    assert.equal(thumbnail.match(/data-slot="/g)?.length, 15);
    assert.equal(thumbnail.match(/data-asset="/g)?.length, 7);
    for (const asset of ["game-mode-on", "game-bar-on", "xbox-mode", "pointer-precision-on", "power-plan-a", "auto-hdr-on", "windowed-on"]) {
      assert.match(thumbnail, new RegExp(`data-asset="${asset}"`));
    }
    assert.match(thumbnail, /ILLUSTRATED STREAM DECK/);
    assert.match(thumbnail, /v2\.1\.0/);
  });

  it("keeps Labs, command state and plan setup limitations explicit in both languages", async () => {
    for (const lang of ["en", "es"]) {
      const description = await readFile(`${base}/description/description.${lang}.md`, "utf8");
      const notes = await readFile(`${base}/release-notes/release-notes.${lang}.md`, "utf8");
      for (const term of ["Game Mode|Modo Juego", "Game Bar", "Win\\+F11", "GamingHomeApp", "pointer|puntero", "power plans|planes", "Auto HDR", "Windowed|ventana", "experimental", "2[.,]5", "MAECLY"]) {
        assert.match(description, new RegExp(term, "i"));
      }
      assert.match(notes, /2\.1\.0/);
      assert.match(notes, /com\.maecly\.gamingtoggles/);
      assert.doesNotMatch(description, /two values|dos valores|both settings|ambos ajustes/i);
    }
    const states = await readFile(`${base}/src/gallery-2-key-state.svg`, "utf8");
    assert.match(states, /stateless/);
    const labs = await readFile(`${base}/src/gallery-4-labs.svg`, "utf8");
    assert.match(labs, /EXPERIMENTAL/);
    assert.match(labs, /does not guarantee/);
    assert.match(await readFile(`${base}/src/gallery-3-power-plans.svg`, "utf8"), /EXAMPLE CONFIGURATION/);
  });
});

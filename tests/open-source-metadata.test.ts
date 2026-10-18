import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pluginDirectory =
  "com.maecly.gamingtoggles.sdPlugin";

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("metadatos de código abierto", () => {
  it("declara autor, contacto, sitio y licencia", async () => {
    const packageJson = await readJson("package.json");
    const author = packageJson.author as Record<string, string>;
    const manifest = await readJson(`${pluginDirectory}/manifest.json`);

    assert.equal(packageJson.license, "MIT");
    assert.equal(packageJson.homepage, "https://gaming-toggles.maecly.com/");
    assert.deepEqual(author, {
      name: "MAECLY",
      email: "hola@maecly.com",
      url: "https://www.maecly.com/"
    });
    assert.equal(manifest.Author, author.name);
    assert.equal(
      manifest.URL,
      "https://gaming-toggles.maecly.com/"
    );
    const contributors = packageJson.contributors as Array<Record<string, string>>;
    assert.equal(contributors[0].name, "Miguel Esparza");
  });

  it("incluye el aviso MIT íntegro dentro del instalador", async () => {
    const rootLicense = await readFile("LICENSE", "utf8");
    const packagedLicense = await readFile(
      `${pluginDirectory}/LICENSE.txt`,
      "utf8"
    );

    assert.equal(packagedLicense, rootLicense);
    assert.match(rootLicense, /Copyright \(c\) 2026 Miguel Esparza/);
  });

  it("enlaza la ficha del Marketplace en la documentación", async () => {
    const marketplace = "https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4";
    for (const file of ["README.md", "RELEASING.md"]) {
      const content = await readFile(file, "utf8");
      assert.ok(content.includes(marketplace), `${file} must link to the product listing`);
      assert.doesNotMatch(content, /etapa previa al Marketplace|Marketplace está pendiente|Cuando Elgato apruebe/i);
    }
  });
});

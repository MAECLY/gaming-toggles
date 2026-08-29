import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pluginDirectory =
  "com.miguelangelstream.windows-xbox-settings.sdPlugin";

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("metadatos de código abierto", () => {
  it("declara autor, contacto, sitio y licencia", async () => {
    const packageJson = await readJson("package.json");
    const author = packageJson.author as Record<string, string>;
    const manifest = await readJson(`${pluginDirectory}/manifest.json`);

    assert.equal(packageJson.license, "MIT");
    assert.deepEqual(author, {
      name: "Miguel Esparza",
      email: "hola@maecly.com",
      url: "https://www.maecly.com/"
    });
    assert.equal(manifest.Author, author.name);
    assert.equal(manifest.URL, author.url);
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
});

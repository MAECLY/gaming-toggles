import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLatestRelease } from "../docs/assets/main.js";

describe("API de GitHub Releases", () => {
  it("elige el instalador de Stream Deck e ignora otros assets", () => {
    assert.deepEqual(parseLatestRelease({
      tag_name: "v2.0.0",
      assets: [
        { name: "SHA256SUMS.txt", browser_download_url: "https://example.test/hash" },
        { name: "Gaming-Toggles-for-PC-v2.0.0.streamDeckPlugin", browser_download_url: "https://example.test/plugin" }
      ]
    }), {
      version: "v2.0.0",
      downloadUrl: "https://example.test/plugin",
      fileName: "Gaming-Toggles-for-PC-v2.0.0.streamDeckPlugin"
    });
  });

  it("rechaza respuestas inválidas y Releases sin instalador", () => {
    assert.throws(() => parseLatestRelease(null), /Release inválida/);
    assert.throws(
      () => parseLatestRelease({ tag_name: "v2.0.0", assets: [] }),
      /no contiene un instalador/
    );
  });
});

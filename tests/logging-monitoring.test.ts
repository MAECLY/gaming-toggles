import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("logs and monitoring", () => {
  it("logs startup, confirmed mutations, reads and actionable failures", async () => {
    const source = (await Promise.all([
      "src/plugin.ts",
      "src/toggle-setting-controller.ts",
      "src/toggle-feature-controller.ts",
      "src/actions/trigger-xbox-mode.ts",
      "src/actions/toggle-power-plan.ts"
    ].map((path) => readFile(path, "utf8")))).join("\n");
    assert.match(source, /logger\.setLevel\("info"\)/);
    assert.match(source, /Iniciando Gaming Toggles for PC/);
    assert.match(source, /confirmed by Windows|confirmado por Windows/);
    assert.match(source, /Unable to read|No se pudo leer/);
    assert.match(source, /Unable to (toggle|trigger|switch|list)/);
    assert.doesNotMatch(source, /console\.(log|error)|configuredApp.*logger/i);
  });
});

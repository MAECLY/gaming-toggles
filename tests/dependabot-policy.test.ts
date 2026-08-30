import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const dependabotPath = new URL("../.github/dependabot.yml", import.meta.url);
const workflowPath = new URL(
  "../.github/workflows/dependabot-automerge.yml",
  import.meta.url,
);

describe("política de actualizaciones de Dependabot", () => {
  it("agrupa únicamente cambios minor y patch y mantiene majors sensibles fuera", async () => {
    const config = await readFile(dependabotPath, "utf8");

    assert.match(config, /development-dependencies:[\s\S]*?- minor\s+- patch/);
    assert.match(
      config,
      /dependency-name: typescript[\s\S]*?version-update:semver-major/,
    );
    assert.match(
      config,
      /dependency-name: "@types\/node"[\s\S]*?version-update:semver-major/,
    );
    assert.match(config, /rebase-strategy: auto/);
  });

  it("solo permite auto-merge de minor/patch y no ejecuta el código del PR", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    assert.match(workflow, /pull_request_target:/);
    assert.match(workflow, /dependabot\[bot\]/);
    assert.match(workflow, /version-update:semver-minor/);
    assert.match(workflow, /version-update:semver-patch/);
    assert.doesNotMatch(workflow, /version-update:semver-major/);
    assert.doesNotMatch(workflow, /actions\/checkout/);
    assert.match(workflow, /gh pr merge --auto --squash --delete-branch/);
  });
});

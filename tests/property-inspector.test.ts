import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("power-plan Property Inspector", () => {
  it("is local, responsive, accessible and bilingual", async () => {
    const [html, css, script] = await Promise.all([
      readFile("com.maecly.gamingtoggles.sdPlugin/property-inspector/power-plan.html", "utf8"),
      readFile("com.maecly.gamingtoggles.sdPlugin/property-inspector/power-plan.css", "utf8"),
      readFile("com.maecly.gamingtoggles.sdPlugin/property-inspector/power-plan.js", "utf8")
    ]);
    assert.match(html, /<label for="plan-a"/);
    assert.match(html, /role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.match(css, /@media \(max-width: 260px\)/);
    assert.match(css, /focus-visible/);
    assert.match(script, /connectElgatoStreamDeckSocket/);
    assert.match(script, /registerPropertyInspector|registerEvent/);
    assert.match(script, /\ben:\s*\{/);
    assert.match(script, /\bes:\s*\{/);
  });

  it("only persists selected GUIDs and requests plans from the plugin", async () => {
    const script = await readFile(
      "com.maecly.gamingtoggles.sdPlugin/property-inspector/power-plan.js",
      "utf8"
    );
    assert.match(script, /command: "getPowerPlans"/);
    assert.match(script, /event, context: uuid, action: actionUuid, payload/);
    assert.match(script, /planA: planA\.value, planB: planB\.value/);
    assert.doesNotMatch(script, /powercfg|exec|RunAs|HKEY_LOCAL_MACHINE/i);
  });
});

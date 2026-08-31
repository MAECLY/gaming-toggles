import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { metrics, rasterise } from "./icon-lab/legibility.mjs";

// A Stream Deck key is a 72px emissive LCD behind a diffusing keycap. The state a key
// is in has to survive that, so ON/OFF must differ in luminance and shape — not in hue.
// The art this replaced differed on 3.4% of pixels and rendered OFF *brighter* than ON.
const PAIRS = [
  ["assets/icons/game-mode-on.svg", "assets/icons/game-mode-off.svg"],
  ["assets/icons/game-bar-on.svg", "assets/icons/game-bar-off.svg"]
] as const;

const NEW_BOOLEAN_PAIRS = [
  ["assets/icons/pointer-precision-on.svg", "assets/icons/pointer-precision-off.svg"],
  ["assets/icons/auto-hdr-on.svg", "assets/icons/auto-hdr-off.svg"],
  ["assets/icons/windowed-on.svg", "assets/icons/windowed-off.svg"]
] as const;

// The SDK paints a two-line Title over the lower third of the key.
const TITLE_BAND_TOP = 92;
const SAFE_INSET = 12;

const luma = (pixels: Buffer, index: number) =>
  0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];

function glyphBox(file: string) {
  const { width, pixels } = rasterise(file, 144);
  const tile = luma(pixels, (72 * width + 3) * 4);
  let minX = width, minY = width, maxX = -1, maxY = -1;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] < 128) continue;
      if (Math.abs(luma(pixels, index) - tile) < 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

describe("legibilidad de los iconos de tecla", () => {
  for (const [on, off] of PAIRS) {
    const name = on.split("/").pop()!.replace("-on.svg", "");

    it(`${name}: ON y OFF se distinguen en escala de grises`, () => {
      const result = metrics(on, off, 72);
      assert.ok(
        result.meanAbsDiff > 40,
        `diferencia media ${result.meanAbsDiff} debe superar 40/255`
      );
      assert.ok(
        result.pctOver25 > 25,
        `solo ${result.pctOver25}% de píxeles difieren >25L, se requiere >25%`
      );
      assert.ok(
        result.meanLumaOn > result.meanLumaOff,
        `ON (${result.meanLumaOn}) debe ser más luminoso que OFF (${result.meanLumaOff})`
      );
    });

    it(`${name}: el arte respeta el margen seguro y la banda del título`, () => {
      for (const file of [on, off]) {
        const box = glyphBox(file);
        const inset = Math.min(box.minX, box.minY, 143 - box.maxX, 143 - box.maxY);
        assert.ok(inset >= SAFE_INSET, `${file}: margen ${inset}px < ${SAFE_INSET}px`);
        assert.ok(
          box.maxY <= TITLE_BAND_TOP,
          `${file}: el arte llega a y=${box.maxY} e invade la banda del título (y>${TITLE_BAND_TOP})`
        );
      }
    });
  }

  for (const [on, off] of NEW_BOOLEAN_PAIRS) {
    it(`${on.split("/").pop()}: conserva contraste ON/OFF a 72 px`, () => {
      const result = metrics(on, off, 72);
      assert.ok(result.meanAbsDiff > 40);
      assert.ok(result.pctOver25 > 25);
      assert.ok(result.meanLumaOn > result.meanLumaOff);
    });
  }

  it("los planes A, B y OTRO se distinguen a resolución de Stream Deck", () => {
    const ab = metrics("assets/icons/power-plan-a.svg", "assets/icons/power-plan-b.svg", 72);
    const other = metrics("assets/icons/power-plan-a.svg", "assets/icons/power-plan-other.svg", 72);
    assert.ok(ab.meanAbsDiff > 40);
    assert.ok(other.meanAbsDiff > 40);
  });
});

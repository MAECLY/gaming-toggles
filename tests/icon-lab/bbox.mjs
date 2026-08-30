// Confirms load-bearing artwork stays inside the safe inset. The tile itself is
// intentionally full-bleed; what must stay inset is the glyph drawn on top of it.
import { rasterise } from "./legibility.mjs";

const luma = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];

for (const file of process.argv.slice(2)) {
  const { width: w, pixels } = rasterise(file, 144);
  const tile = luma(pixels, (72 * w + 72 * 0 + 3) * 4); // inside the tile, near left edge, no glyph
  let minX = w, minY = w, maxX = -1, maxY = -1;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (pixels[i + 3] < 128) continue;               // outside the rounded tile
    if (Math.abs(luma(pixels, i) - tile) < 40) continue; // tile fill, not glyph
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const inset = Math.min(minX, minY, w - 1 - maxX, w - 1 - maxY);
  console.log(`${file.split("/").pop().padEnd(22)} glyph x${minX}-${maxX} y${minY}-${maxY}  min inset ${inset}px  ${inset >= 12 ? "OK" : "TIGHT"}`);
}

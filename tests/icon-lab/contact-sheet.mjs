// Scratch harness: renders candidate icon SVGs at real Stream Deck key sizes
// onto one contact sheet so the result can be judged visually, not from source.
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const SIZES = [72, 144, 288];
const PAD = 24;
const LABEL = 22;

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: node tests/icon-lab/contact-sheet.mjs <out.png> <icon.svg...>");
  process.exit(1);
}
const [out, ...icons] = files;

const rowWidth = PAD + SIZES.reduce((acc, s) => acc + s + PAD, 0) + 260;
const rowHeight = Math.max(...SIZES) + PAD * 2 + LABEL;

const rows = await Promise.all(
  icons.map(async (file, index) => {
    const raw = await readFile(file, "utf8");
    const inner = raw
      .replace(/<\?xml[^>]*\?>/g, "")
      .replace(/<!DOCTYPE[^>]*>/g, "")
      .trim();
    const y = index * rowHeight;
    let x = PAD;
    const stamps = SIZES.map((size) => {
      const cy = y + PAD + (Math.max(...SIZES) - size) / 2;
      const node = inner.replace(
        /^<svg/,
        `<svg x="${x}" y="${cy}" width="${size}" height="${size}"`
      );
      const caption = `<text x="${x}" y="${y + rowHeight - 6}" fill="#8b8b8b" font-family="monospace" font-size="13">${size}px</text>`;
      x += size + PAD;
      return node + caption;
    }).join("");
    const name = `<text x="${x + 12}" y="${y + rowHeight / 2}" fill="#e6e6e6" font-family="monospace" font-size="15">${basename(file)}</text>`;
    return stamps + name;
  })
);

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${rowWidth}" height="${rowHeight * icons.length}" viewBox="0 0 ${rowWidth} ${rowHeight * icons.length}">
<rect width="100%" height="100%" fill="#111113"/>
${rows.join("\n")}
</svg>`;

const png = new Resvg(sheet, { fitTo: { mode: "width", value: rowWidth } }).render().asPng();
await writeFile(out, png);
console.log(`contact sheet -> ${out} (${icons.length} icons, ${png.length} bytes)`);

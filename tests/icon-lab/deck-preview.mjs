// Renders candidate key images into a simulated Stream Deck MK.2 (5x3 @72px keys)
// so ON/OFF pairs can be judged at true glanceable size, next to blank keys.
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const KEY = 72, GAP = 14, COLS = 5, ROWS = 3, BEZEL = 26;
const W = BEZEL * 2 + COLS * KEY + (COLS - 1) * GAP;
const H = BEZEL * 2 + ROWS * KEY + (ROWS - 1) * GAP;

const icons = process.argv.slice(3);
const out = process.argv[2];
const scale = Number(process.env.SCALE || 2);

const placed = await Promise.all(
  icons.map(async (file, i) => {
    const raw = (await readFile(file, "utf8"))
      .replace(/<\?xml[^>]*\?>/g, "").replace(/<!DOCTYPE[^>]*>/g, "").trim();
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = BEZEL + col * (KEY + GAP);
    const y = BEZEL + row * (KEY + GAP);
    return raw.replace(/^<svg/, `<svg x="${x}" y="${y}" width="${KEY}" height="${KEY}"`);
  })
);

const blanks = [];
for (let i = icons.length; i < COLS * ROWS; i++) {
  const col = i % COLS, row = Math.floor(i / COLS);
  blanks.push(`<rect x="${BEZEL + col * (KEY + GAP)}" y="${BEZEL + row * (KEY + GAP)}" width="${KEY}" height="${KEY}" rx="8" fill="#0d0d0f"/>`);
}

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" rx="18" fill="#232326"/>
${blanks.join("")}
${placed.join("")}
</svg>`;

const png = new Resvg(sheet, { fitTo: { mode: "width", value: W * scale } }).render().asPng();
await writeFile(out, png);
console.log(`deck preview -> ${out} (${icons.length} keys @${KEY}px, ${scale}x)`);

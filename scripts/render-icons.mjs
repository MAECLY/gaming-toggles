import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";

// Single source of truth: assets/icons/*.svg. Everything the plugin and the site
// ship is rasterised from those files, so the art can never drift between the two.
//
// Sizes come from the Stream Deck SDK, which wants a different pair per slot:
//   plugin Icon   256 / 512  (PNG only)
//   CategoryIcon   28 /  56  (monochrome white on transparent — shipped as SVG)
//   Action Icon    20 /  40  (monochrome white on transparent — shipped as SVG)
//   State Image    72 / 144
// Manifest paths stay extension-less, so each slot ships exactly one format.

const root = new URL("../", import.meta.url);
const plugin = new URL("com.maecly.gamingtoggles.sdPlugin/", root);
const web = new URL("docs/assets/", root);
const source = (name) => new URL(`assets/icons/${name}.svg`, root);
const socialSource = (name) => new URL(`assets/social/${name}.svg`, root);
const readSource = (name) => readFile(source(name), "utf8");

/** @type {{from: string, to: URL, sizes: [number, number]}[]} */
const raster = [
  { from: "plugin-mark", to: new URL("imgs/plugin/marketplace", plugin), sizes: [256, 512] },
  { from: "game-mode-on", to: new URL("imgs/actions/game-mode/on", plugin), sizes: [72, 144] },
  { from: "game-mode-off", to: new URL("imgs/actions/game-mode/off", plugin), sizes: [72, 144] },
  { from: "game-bar-on", to: new URL("imgs/actions/controller-game-bar/on", plugin), sizes: [72, 144] },
  { from: "game-bar-off", to: new URL("imgs/actions/controller-game-bar/off", plugin), sizes: [72, 144] }
];

/** Vector slots keep their SVG so they stay crisp at 20px and in the Marketplace. */
const vector = [
  { from: "category-glyph", to: new URL("imgs/plugin/category.svg", plugin) },
  { from: "game-mode-glyph", to: new URL("imgs/actions/game-mode/action.svg", plugin) },
  { from: "game-bar-glyph", to: new URL("imgs/actions/controller-game-bar/action.svg", plugin) }
];

/** The landing reuses the same art; the demo keys are displayed around 120 CSS px. */
const site = [
  { from: "plugin-mark", to: new URL("plugin-icon.png", web), size: 512 },
  { from: "plugin-mark", to: new URL("favicon.png", web), size: 64 },
  { from: "game-mode-on", to: new URL("game-mode-on.png", web), size: 256 },
  { from: "game-mode-off", to: new URL("game-mode-off.png", web), size: 256 },
  { from: "game-bar-on", to: new URL("game-bar-on.png", web), size: 256 },
  { from: "game-bar-off", to: new URL("game-bar-off.png", web), size: 256 }
];

/** The social card is hand-composed rather than an icon, but it must not drift. */
const social = [{ from: "og", to: new URL("og.png", web), size: 1200 }];

async function render(svg, destination, width) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
  await writeFile(destination, png);
  return png.length;
}

let count = 0;
for (const entry of raster) {
  const svg = await readSource(entry.from);
  const [base, retina] = entry.sizes;
  await render(svg, new URL(`${entry.to.href}.png`), base);
  await render(svg, new URL(`${entry.to.href}@2x.png`), retina);
  count += 2;
}

for (const entry of vector) {
  await mkdir(dirname(fileURLToPath(entry.to)), { recursive: true });
  await copyFile(source(entry.from), entry.to);
  count += 1;
}

for (const entry of site) {
  await render(await readSource(entry.from), entry.to, entry.size);
  count += 1;
}

for (const entry of social) {
  await render(await readFile(socialSource(entry.from), "utf8"), entry.to, entry.size);
  count += 1;
}

console.log(`Generados ${count} recursos desde assets/icons/.`);

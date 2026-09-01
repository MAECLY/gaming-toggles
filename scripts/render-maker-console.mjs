import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = new URL("../", import.meta.url);
const ink = "#f2f2f3";
const muted = "#a3a3ad";
const green = "#46c246";
const purple = "#b39aff";
const blue = "#54b8ff";
const sans = "Segoe UI, Arial, sans-serif";
const mono = "Consolas, monospace";
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const text = (x, y, value, size = 28, color = ink, weight = 400, anchor = "start", family = sans) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escape(value)}</text>`;
const lines = (x, y, values, size = 28, color = muted, gap = size * 1.4, weight = 400) =>
  values.map((value, i) => text(x, y + gap * i, value, size, color, weight)).join("\n");
const rect = (x, y, w, h, fill = "#161619", radius = 16, stroke = "#29292f") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const label = (x, y, value, color = muted) => text(x, y, value, 22, color, 400, "start", mono);

export const mediaNames = [
  "thumbnail", "gallery-1-seven-actions", "gallery-2-key-state",
  "gallery-3-power-plans", "gallery-4-labs", "gallery-5-local-controls"
];

// Template content is version-specific. A future release must deliberately add a
// new layout instead of silently relabelling these seven-action claims.
export async function renderMakerConsole() {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  if (pkg.version !== "2.1.0") throw new Error("Add Maker Console layouts for the new version before rendering.");
  const manifest = JSON.parse(await readFile(new URL("com.maecly.gamingtoggles.sdPlugin/manifest.json", root), "utf8"));
  const version = `v${pkg.version}`;
  const destination = new URL(`assets/maker_console/${version}/`, root);
  await mkdir(new URL("src/", destination), { recursive: true });
  await mkdir(new URL("upload/", destination), { recursive: true });
  const icons = new Map();
  let serial = 0;
  const icon = async (name, x, y, size) => {
    if (!icons.has(name)) icons.set(name, await readFile(new URL(`assets/icons/${name}.svg`, root), "utf8"));
    const original = icons.get(name);
    const prefix = `icon-${serial++}-`;
    const inner = original.replace(/^[\s\S]*?<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "")
      .replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
    return `<svg data-asset="${name}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 144 144">${inner}</svg>`;
  };
  const frame = (title, content, section) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="960" viewBox="0 0 1920 960" role="img" aria-label="${escape(title)}">
  <title>${escape(title)}</title>
  <rect width="1920" height="960" fill="#0a0a0b"/>
  ${rect(96, 65, 48, 48, "#132013", 8, "#294429")}
  ${text(120, 99, "M", 29, green, 700, "middle")}
  ${text(164, 100, "MAECLY", 26, ink, 700)}
  ${label(330, 99, section)}
  ${text(1824, 100, version, 23, green, 600, "end", mono)}
  ${content}
  <path d="M96 854H1824" stroke="#29292f"/>
  ${label(96, 902, "WINDOWS 11  /  STREAM DECK 7.1+")}
  ${text(1824, 902, "MIT · OPEN SOURCE · EN / ES", 21, muted, 400, "end", mono)}
</svg>\n`;

  const deckSlots = [null, ["game-mode-on", "Game Mode", "ON"], ["xbox-mode", "Xbox Mode", "WIN+F11"], ["game-bar-on", "Pad → Bar", "ON"], null,
    ["pointer-precision-on", "Pointer", "ON"], ["power-plan-a", "Power Plan", "A"], null, ["auto-hdr-on", "Auto HDR LABS", "ON"], ["windowed-on", "Windowed LABS", "ON"], null, null, null, null, null];
  let deck = rect(954, 255, 870, 538, "#161619", 24, "#39393f");
  for (const [i, entry] of deckSlots.entries()) {
    const x = 990 + (i % 5) * 164;
    const y = 291 + Math.floor(i / 5) * 164;
    deck += `<g data-slot="${i + 1}">`;
    if (entry) {
      deck += await icon(entry[0], x, y, 142);
      deck += `<g paint-order="stroke" stroke="#101014" stroke-opacity=".8" stroke-width="1.4" stroke-linejoin="round">`;
      deck += text(x + 71, y + 121, entry[1], 12, ink, 600, "middle");
      deck += text(x + 71, y + 136, entry[2], 12, ink, 700, "middle") + "</g>";
    } else deck += rect(x, y, 142, 142, "#0d0d10", 13, "#1d1d22");
    deck += "</g>";
  }

  const slides = new Map();
  slides.set("thumbnail", frame("Gaming Toggles for PC 2.1.0 — seven controls for Stream Deck",
    label(96, 233, "SEVEN CONTROLS. ONE TOUCH AWAY.", green) +
    lines(96, 353, ["Gaming Toggles", "for PC"], 84, ink, 94, 700) +
    lines(96, 543, ["Xbox, mouse, power and graphics.", "Windows gaming, at your fingertips."], 32) +
    label(96, 714, "5 CORE ACTIONS  +  2 LABS", purple) +
    label(96, 756, "NO ADMIN RIGHTS · NO TELEMETRY") +
    deck + label(954, 221, "ILLUSTRATED STREAM DECK MK.2 PROFILE"), "GAMING TOGGLES FOR PC"));

  const core = [
    ["game-mode-on", ["Game Mode"]], ["game-bar-on", ["Controller opens", "Game Bar"]],
    ["xbox-mode", ["Enter / exit", "Xbox Mode"]], ["pointer-precision-on", ["Enhance pointer", "precision"]],
    ["power-plan-a", ["Power plan A / B"]]
  ];
  let overview = text(96, 214, "More control. Same single press.", 65, ink, 700) + label(96, 275, "CORE / 5 ACTIONS", green);
  for (const [i, [name, title]] of core.entries()) {
    const x = 96 + i * 350;
    overview += rect(x, 306, 328, 245) + await icon(name, x + 104, 330, 120);
    title.forEach((value, row) => { overview += text(x + 164, 494 + row * 32, value, 26, ink, 600, "middle"); });
  }
  overview += label(96, 609, "LABS / 2 EXPERIMENTAL ACTIONS", purple);
  overview += rect(96, 635, 850, 161) + await icon("auto-hdr-on", 120, 655, 120) + text(274, 692, "Auto HDR", 35, ink, 600) + text(274, 745, "Current-user graphics preference", 26, muted);
  overview += rect(974, 635, 850, 161) + await icon("windowed-on", 998, 655, 120) + text(1152, 692, "Windowed game optimizations", 35, ink, 600) + text(1152, 745, "Current-user graphics preference", 26, muted);
  slides.set("gallery-1-seven-actions", frame("All seven actions: five Core and two experimental Labs controls", overview, "01 / ACTIONS"));

  let state = text(96, 217, "The right feedback for every action.", 64, ink, 700);
  for (const x of [96, 684, 1272]) state += rect(x, 275, 552, 440);
  state += label(128, 324, "BOOLEAN SETTINGS", green);
  state += await icon("pointer-precision-on", 177, 365, 156) + await icon("pointer-precision-off", 411, 365, 156);
  state += text(255, 563, "ON", 31, green, 700, "middle") + text(489, 563, "OFF", 31, muted, 700, "middle");
  state += lines(128, 630, ["Write, re-read, confirm.", "Show the value Windows kept."], 26);
  state += label(716, 324, "POWER PLANS", blue);
  for (const [i, plan] of ["a", "b", "other"].entries()) {
    const x = 724 + i * 172;
    state += await icon(`power-plan-${plan}`, x, 388, 128) + text(x + 64, 563, plan.toUpperCase(), 27, blue, 700, "middle");
  }
  state += lines(716, 630, ["A, B or another active plan.", "No invented ON/OFF state."], 26);
  state += label(1304, 324, "XBOX COMMAND", green) + await icon("xbox-mode", 1470, 365, 156);
  state += text(1548, 563, "WIN + F11", 31, green, 700, "middle") + lines(1304, 630, ["Send the full-screen shortcut.", "A command, not a toggle state."], 26);
  state += text(96, 794, "Stateful actions re-check Windows every 2.5 seconds. Xbox Mode remains stateless.", 28, muted);
  slides.set("gallery-2-key-state", frame("Boolean states, power-plan states and the stateless Xbox command", state, "02 / FEEDBACK"));

  let power = lines(96, 268, ["Your plans.", "Your shortcut."], 78, ink, 88, 700) +
    lines(96, 492, ["Choose two installed power plans", "in the Property Inspector.", "Press the key to switch A ↔ B."], 31) +
    label(96, 702, "NO PLAN CREATION. NO DELETION.", blue) +
    text(96, 758, "Plan names and availability vary by PC.", 27, muted);
  power += rect(920, 221, 904, 560) + label(960, 276, "EXAMPLE CONFIGURATION", blue);
  power += rect(960, 310, 824, 148, "#101014") + await icon("power-plan-a", 982, 330, 108) + label(1120, 359, "PLAN A") + text(1120, 410, "Balanced", 40, ink, 600);
  power += rect(960, 488, 824, 148, "#101014") + await icon("power-plan-b", 982, 508, 108) + label(1120, 537, "PLAN B") + text(1120, 588, "High performance", 40, ink, 600);
  power += lines(960, 700, ["Select from existing plans on your computer.", "The key confirms the active plan after switching."], 26);
  slides.set("gallery-3-power-plans", frame("Power plan A / B — select two existing Windows power plans", power, "03 / POWER"));

  let labs = text(96, 212, "Graphics controls. Clearly experimental.", 62, ink, 700) +
    text(96, 274, "Labs exposes Windows preferences; it does not guarantee game or hardware support.", 29, muted);
  const labCards = [
    [96, "auto-hdr-on", "Auto HDR", ["Toggle the current-user Auto HDR preference.", "Compatible games and an HDR display are needed."]],
    [976, "windowed-on", "Windowed optimizations", ["Toggle the windowed-game optimization preference.", "Applicability depends on the game and Windows."]]
  ];
  for (const [x, name, title, details] of labCards) {
    labs += rect(x, 330, 848, 365) + await icon(name, x + 36, 370, 152) + label(x + 225, 393, "LABS / EXPERIMENTAL", purple) + text(x + 225, 455, title, 36, ink, 600) + lines(x + 36, 592, details, 26);
  }
  labs += lines(96, 762, ["Unknown settings are preserved. Unexpected formats are not overwritten.", "Windows or GPU updates may affect these experimental controls."], 27, muted, 40);
  slides.set("gallery-4-labs", frame("Experimental Labs graphics controls: Auto HDR and windowed game optimizations", labs, "04 / LABS"));

  let local = text(96, 213, "Local controls. Clear boundaries.", 68, ink, 700) + text(96, 281, "No administrator rights. No telemetry. No external service required.", 31, muted);
  const lanes = [
    ["01", "USER PREFERENCES", "HKCU", green, ["Game Mode · controller Game Bar", "Auto HDR · windowed optimizations"]],
    ["02", "WINDOWS APIS", "Win32", purple, ["Pointer precision · Win+F11", "Keeps custom mouse thresholds"]],
    ["03", "EXISTING POWER PLANS", "powercfg", blue, ["List, read and activate only", "No plan creation, editing or deletion"]]
  ];
  for (const [i, [number, title, tech, color, details]] of lanes.entries()) {
    const x = 96 + 588 * i;
    local += rect(x, 357, 552, 350) + label(x + 32, 407, `${number} / ${title}`, color) + text(x + 32, 516, tech, 65, ink, 700) + lines(x + 32, 607, details, 24);
  }
  local += text(96, 783, "Xbox Mode requires compatible Windows 11 and GamingHomeApp configured.", 28, muted);
  slides.set("gallery-5-local-controls", frame("Local Windows controls without administrator rights or telemetry", local, "05 / BOUNDARIES"));

  const files = [];
  for (const [name, svg] of slides) {
    await writeFile(new URL(`src/${name}.svg`, destination), svg);
    const png = new Resvg(svg).render().asPng();
    await writeFile(new URL(`upload/${name}.png`, destination), png);
    files.push({ file: `upload/${name}.png`, width: 1920, height: 960, sha256: createHash("sha256").update(png).digest("hex") });
  }
  const mark = await readFile(new URL("assets/icons/plugin-mark.svg", root), "utf8");
  const appIcon = new Resvg(mark, { fitTo: { mode: "width", value: 288 } }).render().asPng();
  await writeFile(new URL("upload/icon-288.png", destination), appIcon);
  files.push({ file: "upload/icon-288.png", width: 288, height: 288, sha256: createHash("sha256").update(appIcon).digest("hex") });
  await writeFile(new URL("media.json", destination), JSON.stringify({
    version: pkg.version, imageLanguage: "en", copyLanguages: ["en", "es"],
    actionUUIDs: manifest.Actions.map(({ UUID }) => UUID),
    guidelines: "https://docs.elgato.com/guidelines/products/", files
  }, null, 2) + "\n");
  return files.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Generated ${await renderMakerConsole()} versioned Maker Console images.`);
}

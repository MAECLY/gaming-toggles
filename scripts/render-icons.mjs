import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";

const sourceUrl = new URL(
  "../com.miguelangelstream.windows-xbox-settings.sdPlugin/imgs/plugin/marketplace.svg",
  import.meta.url
);
const svg = await readFile(sourceUrl, "utf8");
const variants = [
  { file: "marketplace.png", width: 144 },
  { file: "marketplace@2x.png", width: 288 }
];

for (const variant of variants) {
  const destinationUrl = new URL(
    `../com.miguelangelstream.windows-xbox-settings.sdPlugin/imgs/plugin/${variant.file}`,
    import.meta.url
  );
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: variant.width }
  }).render().asPng();

  await writeFile(destinationUrl, png);
  console.log(`Generado ${fileURLToPath(destinationUrl)}`);
}

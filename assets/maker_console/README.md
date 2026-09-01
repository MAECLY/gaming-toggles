# Maker Console assets

The listing material is archived by plugin version. Do not overwrite a previous version when preparing a new release.

- `v2.0.0/` — original two-action listing, preserved unchanged.
- `v2.1.0/` — seven-action listing: five Core actions and two experimental Labs actions.

Each version separates editable SVG sources (`src/`), ready-to-upload PNGs (`upload/`), bilingual descriptions (`description/`) and bilingual release notes (`release-notes/`).

For 2.1.0, run `npm run render:maker` to regenerate only the current listing. `npm run render:icons` also invokes that renderer. Neither command rewrites `v2.0.0/`. The renderer deliberately refuses an unimplemented version; a future release needs its own reviewed copy and layouts.

Images use English text, as required by the [Elgato product guidelines](https://docs.elgato.com/guidelines/products/). Descriptions and release notes are supplied in English and Spanish. The thumbnail and galleries are 1920 × 960 PNGs; the app icon is a 288 × 288 PNG. The existing MAECLY plugin mark and canonical action icons are reused, not redrawn.

Publishing the GitHub Release does **not** submit these materials to Elgato. Upload the selected version's PNGs and copy to Maker Console separately.

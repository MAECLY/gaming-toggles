# Gaming Toggles for PC — Maker Console v2.1.0

## Upload order

| Maker Console field | File |
| --- | --- |
| App icon | `upload/icon-288.png` |
| Thumbnail | `upload/thumbnail.png` |
| Gallery 1 — all seven actions | `upload/gallery-1-seven-actions.png` |
| Gallery 2 — state and command feedback | `upload/gallery-2-key-state.png` |
| Gallery 3 — power-plan setup | `upload/gallery-3-power-plans.png` |
| Gallery 4 — experimental graphics controls | `upload/gallery-4-labs.png` |
| Gallery 5 — scope and requirements | `upload/gallery-5-local-controls.png` |

Use the matching `description/*.md` and `release-notes/*.md` for English or Spanish text. `media.json` records the version, seven action UUIDs, dimensions and SHA-256 checksums of every PNG.

The profile and power-plan panels are labelled illustrations, not screenshots. Plan names are examples; only plans already installed on the user's PC can be selected. Xbox Mode sends Win+F11 without claiming an ON/OFF state. Auto HDR and windowed game optimizations are labelled Labs and are not advertised as guaranteed performance improvements.

The product remains **Gaming Toggles for PC**, published by **MAECLY**, authored by Miguel Esparza. Contact: [hola@maecly.com](mailto:hola@maecly.com). Website: [maecly.com](https://www.maecly.com/). Support and source: [MAECLY/gaming-toggles](https://github.com/MAECLY/gaming-toggles).

Regenerate with `npm run render:maker`; validate with `npm run test:maker`. This folder does not contain the installer. Use the `.streamDeckPlugin` from the tagged GitHub Release when submitting the plugin itself.

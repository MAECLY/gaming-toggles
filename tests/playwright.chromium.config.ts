// Local mirror of playwright.config.ts for machines without Microsoft Edge (macOS/Linux).
// CI keeps using the msedge config; this only swaps the browser channel.
// Paths are re-anchored to the repository root because this config lives one level down.
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

import base from "../playwright.config";

const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  ...base,
  testDir: `${root}tests/e2e`,
  webServer: { ...base.webServer, command: "node scripts/serve-docs.mjs", cwd: root },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true
      }
    }
  ]
});

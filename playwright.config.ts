import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 45_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "node scripts/serve-docs.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 20_000
  },
  projects: [
    {
      name: "desktop-edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" }
    },
    {
      name: "mobile-edge",
      use: {
        channel: "msedge",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});

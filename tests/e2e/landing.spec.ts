import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const marketplace = "https://marketplace.elgato.com/product/gaming-toggles-for-pc-404d89bd-746d-4d2e-ac66-ac87ef96d2e4";

async function expectMarketplaceLinks(page: Page) {
  await expect(page.locator("[data-marketplace-link]")).toHaveCount(3);
  for (const link of await page.locator("[data-marketplace-link]").all()) {
    await expect(link).toHaveAttribute("href", marketplace);
    await expect(link).not.toHaveAttribute("download");
  }
}

test.describe("landing funcional y responsive", () => {
  test("carga la versión española y alterna ambas teclas", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Gaming Toggles for PC/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Un toque más cerca");

    const gameMode = page.locator('[data-setting="game"]');
    await gameMode.click();
    await expect(gameMode).toHaveAttribute("aria-pressed", "false");
    await expect(gameMode.locator("strong")).toHaveText("OFF");
    await expect(gameMode.locator("img")).toHaveAttribute("src", /game-mode-off\.png$/);

    const gameBar = page.locator('[data-setting="bar"]');
    await gameBar.click();
    await expect(gameBar).toHaveAttribute("aria-pressed", "false");
    await expect(gameBar.locator("img")).toHaveAttribute("src", /game-bar-off\.png$/);
  });

  test("el hero demuestra las siete acciones con su comportamiento correcto", async ({ page }) => {
    await page.goto("/");
    const keys = page.locator(".deck-key[data-demo]");
    await expect(keys).toHaveCount(7);

    const pointer = page.locator('[data-setting="pointer"]');
    await pointer.click();
    await expect(pointer).toHaveAttribute("aria-pressed", "false");
    await expect(pointer.locator("img")).toHaveAttribute("src", /pointer-precision-off\.png$/);
    await expect(pointer.locator("strong")).toHaveText("OFF");

    const power = page.locator('[data-setting="power"]');
    await power.click();
    await expect(power.locator("strong")).toHaveText("B");
    await expect(power.locator("img")).toHaveAttribute("src", /power-plan-b\.png$/);
    await power.click();
    await expect(power.locator("strong")).toHaveText("OTRO");
    await expect(power.locator("img")).toHaveAttribute("src", /power-plan-other\.png$/);

    const xbox = page.locator('[data-setting="xbox"]');
    await xbox.click();
    await expect(xbox).not.toHaveAttribute("aria-pressed", /.+/);
    await expect(xbox.locator("strong")).toHaveText("ENVIADO");
    await expect(xbox.locator("strong")).toHaveText("WIN+F11", { timeout: 2000 });

    for (const setting of ["hdr", "windowed"]) {
      const labs = page.locator(`[data-setting="${setting}"]`);
      await labs.click();
      await expect(labs).toHaveAttribute("aria-pressed", "false");
      await expect(labs.locator("strong")).toHaveText("OFF");
    }
  });

  test("mantiene un perfil físico 5 por 3 equilibrado", async ({ page }) => {
    await page.goto("/");
    const slots = await page.locator(".deck > *").evaluateAll((items) => items.map((item) =>
      item instanceof HTMLElement ? item.dataset.setting ?? "blank" : "blank"
    ));

    expect(slots).toEqual([
      "blank", "game", "xbox", "bar", "blank",
      "pointer", "power", "blank", "hdr", "windowed",
      "blank", "blank", "blank", "blank", "blank"
    ]);

    const geometry = await page.locator(".deck > *").evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect();
      return { width: box.width, height: box.height, top: box.top };
    }));
    expect(geometry).toHaveLength(15);
    expect(new Set(geometry.map(({ width }) => Math.round(width))).size).toBe(1);
    expect(new Set(geometry.map(({ height }) => Math.round(height))).size).toBe(1);
    expect(new Set(geometry.map(({ top }) => Math.round(top))).size).toBe(3);
  });

  test("navega a inglés y conserva la descarga oficial", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View in English" }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("One touch closer");
    await expect(page.locator("[data-latest-download]").first()).toHaveAttribute("href", /github\.com\/MAECLY/);
  });

  test("hidrata todas las descargas, versiones y JSON-LD desde el último Release", async ({ page }) => {
    const assetUrl = "https://github.com/MAECLY/gaming-toggles/releases/download/v9.8.7/Gaming-Toggles-v9.8.7.streamDeckPlugin";
    await page.route("https://api.github.com/repos/MAECLY/gaming-toggles/releases/latest", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          tag_name: "v9.8.7",
          assets: [
            { name: "SHA256SUMS.txt", browser_download_url: "https://example.test/checksums" },
            { name: "Gaming-Toggles-v9.8.7.streamDeckPlugin", browser_download_url: assetUrl }
          ]
        }
      });
    });

    await page.goto("/");
    await expect(page.locator("[data-release-version]")).toHaveCount(2);
    await expect(page.locator("[data-release-version]")).toHaveText(["v9.8.7", "v9.8.7"]);
    await expect(page.locator("[data-release-version]").first()).not.toHaveAttribute("aria-busy", /.+/);
    for (const download of await page.locator("[data-latest-download]").all()) {
      await expect(download).toHaveAttribute("href", assetUrl);
      await expect(download).toHaveAttribute("download", "Gaming-Toggles-v9.8.7.streamDeckPlugin");
    }
    await expect(page.locator("[data-release-status]")).toContainText("Gaming-Toggles-v9.8.7.streamDeckPlugin");

    const schema = await page.locator("[data-release-schema]").textContent();
    const software = JSON.parse(schema ?? "{}")["@graph"].find((item) => item["@type"] === "SoftwareApplication");
    expect(software.softwareVersion).toBe("9.8.7");
    expect(software.downloadUrl).toBe(assetUrl);
    expect(software.sameAs).toEqual([marketplace]);
    await expectMarketplaceLinks(page);
  });

  test("conserva el enlace latest y evita una versión falsa si GitHub falla", async ({ page }) => {
    await page.route("https://api.github.com/repos/MAECLY/gaming-toggles/releases/latest", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
    );
    await page.goto("/");

    await expect(page.locator("[data-latest-download]")).toHaveCount(3);
    for (const download of await page.locator("[data-latest-download]").all()) {
      await expect(download).toHaveAttribute("href", "https://github.com/MAECLY/gaming-toggles/releases/latest");
    }
    await expect(page.locator("[data-release-version]").first()).toHaveText("más reciente");
    await expect(page.locator("[data-release-version]").first()).not.toHaveAttribute("aria-busy", /.+/);
    await expectMarketplaceLinks(page);
  });

  test("ofrece ambos canales en ES/EN incluso sin JavaScript", async ({ browser, page: configuredPage }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: configuredPage.viewportSize() });
    const page = await context.newPage();
    try {
      for (const path of ["/", "/en/"]) {
        await page.goto(`http://127.0.0.1:4173${path}`);
        await expectMarketplaceLinks(page);
        await expect(page.locator(".hero [data-marketplace-link]")).toBeVisible();
        await expect(page.locator(".hero [data-latest-download]")).toHaveAttribute("href", "https://github.com/MAECLY/gaming-toggles/releases/latest");
        await expect(page.locator(".distribution-note")).toContainText(/puede ser distinta|may differ/);
      }
    } finally {
      await context.close();
    }
  });

  test("no genera desbordamiento horizontal", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".download-panel")).toBeVisible();
  });

  test("presenta los siete controles y diferencia Labs del núcleo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Siete controles. Un solo plugin." })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Entrar o salir del modo Xbox/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Precisión del puntero/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Plan de energía A \/ B/ })).toBeVisible();
    await expect(page.locator(".labs-badge")).toHaveCount(2);
    await expect(page.getByText("Win", { exact: true })).toBeVisible();
  });

  test("no presenta violaciones de accesibilidad críticas o serias", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const important = results.violations.filter((item) =>
      item.impact === "critical" || item.impact === "serious"
    );
    expect(important).toEqual([]);
  });

  test("expone archivos SEO y de agentes", async ({ request }) => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/agents.txt", "/llms.txt", "/site.webmanifest", "/en/"]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} debe responder 200`).toBeTruthy();
    }
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
    await expect(page.locator('[data-indicator="pointer"]')).toHaveText("OFF");

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
      await expect(page.locator(`[data-indicator="${setting}"]`)).toHaveText("OFF");
    }
  });

  test("navega a inglés y conserva la descarga oficial", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View in English" }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("One touch closer");
    await expect(page.locator("[data-latest-download]").first()).toHaveAttribute("href", /github\.com\/MAECLY/);
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

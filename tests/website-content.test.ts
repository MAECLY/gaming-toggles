import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const canonicalRoot = "https://gaming-toggles.maecly.com/";

describe("landing estática ES/EN", () => {
  it("incluye canonical, hreflang, Open Graph, Twitter y JSON-LD válidos", async () => {
    for (const page of ["docs/index.html", "docs/en/index.html"]) {
      const html = await readFile(page, "utf8");
      assert.match(html, /rel="canonical" href="https:\/\/gaming-toggles\.maecly\.com\//);
      assert.match(html, /hreflang="es"/);
      assert.match(html, /hreflang="en"/);
      assert.match(html, /property="og:image" content="https:\/\/gaming-toggles\.maecly\.com\/assets\/og\.png"/);
      assert.match(html, /name="twitter:card" content="summary_large_image"/);
      const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
      assert.ok(jsonLd);
      const parsed = JSON.parse(jsonLd);
      assert.equal(parsed["@context"], "https://schema.org");
      assert.ok(Array.isArray(parsed["@graph"]));
    }
  });

  it("publica robots, sitemap, agents, llms, manifest y CNAME coherentes", async () => {
    const [cname, robots, sitemap, agents, llms, manifest] = await Promise.all([
      readFile("docs/CNAME", "utf8"),
      readFile("docs/robots.txt", "utf8"),
      readFile("docs/sitemap.xml", "utf8"),
      readFile("docs/agents.txt", "utf8"),
      readFile("docs/llms.txt", "utf8"),
      readFile("docs/site.webmanifest", "utf8")
    ]);
    assert.equal(cname.trim(), "gaming-toggles.maecly.com");
    assert.match(robots, /Sitemap: https:\/\/gaming-toggles\.maecly\.com\/sitemap\.xml/);
    assert.match(sitemap, new RegExp(canonicalRoot.replaceAll(".", "\\.")));
    assert.match(agents, /MAECLY/);
    assert.match(llms, /Open-source Stream Deck plugin/i);
    assert.equal(JSON.parse(manifest).start_url, "/");
  });

  it("incluye todos los recursos visuales críticos", async () => {
    await Promise.all([
      "docs/assets/plugin-icon.png",
      "docs/assets/game-mode-on.png",
      "docs/assets/game-mode-off.png",
      "docs/assets/game-bar-on.png",
      "docs/assets/game-bar-off.png",
      "docs/assets/xbox-mode.png",
      "docs/assets/pointer-precision-on.png",
      "docs/assets/pointer-precision-off.png",
      "docs/assets/power-plan-a.png",
      "docs/assets/power-plan-b.png",
      "docs/assets/power-plan-other.png",
      "docs/assets/auto-hdr-on.png",
      "docs/assets/auto-hdr-off.png",
      "docs/assets/windowed-on.png",
      "docs/assets/windowed-off.png",
      "docs/assets/og.png"
    ].map((path) => access(path)));
  });

  it("presenta las siete acciones en el live demo del hero", async () => {
    for (const page of ["docs/index.html", "docs/en/index.html"]) {
      const html = await readFile(page, "utf8");
      assert.equal(html.match(/<button class="deck-key/g)?.length, 7);
      assert.equal(html.match(/data-demo="toggle"/g)?.length, 5);
      assert.equal(html.match(/data-demo="command"/g)?.length, 1);
      assert.equal(html.match(/data-demo="cycle"/g)?.length, 1);
      assert.match(html, /La demo no cambia tu PC|The demo never changes your PC/);
    }
  });
});

const RELEASE_API = "https://api.github.com/repos/MAECLY/stream-deck-windows-xbox-settings/releases/latest";

export function parseLatestRelease(release) {
  if (!release || typeof release !== "object") {
    throw new TypeError("GitHub devolvió una Release inválida.");
  }
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const installer = assets.find((asset) =>
    typeof asset?.name === "string" &&
    asset.name.endsWith(".streamDeckPlugin") &&
    typeof asset.browser_download_url === "string"
  );
  if (!installer) {
    throw new Error("La Release no contiene un instalador .streamDeckPlugin.");
  }
  return {
    version: typeof release.tag_name === "string" ? release.tag_name : "",
    downloadUrl: installer.browser_download_url,
    fileName: installer.name
  };
}

export function toggleDemoKey(key, root = document) {
  const setting = key.dataset.setting;
  const isOn = key.classList.toggle("is-on");
  key.setAttribute("aria-pressed", String(isOn));
  const label = isOn ? key.dataset.onLabel : key.dataset.offLabel;
  const image = isOn ? key.dataset.onImage : key.dataset.offImage;
  const strong = key.querySelector("strong");
  const icon = key.querySelector("img");
  const indicator = root.querySelector(`[data-indicator="${setting}"]`);
  if (strong && label) strong.textContent = label;
  if (icon && image) icon.src = image;
  if (indicator) indicator.classList.toggle("is-on", isOn);
  return isOn;
}

async function hydrateLatestRelease() {
  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const latest = parseLatestRelease(await response.json());
    document.querySelectorAll("[data-latest-download]").forEach((link) => {
      link.href = latest.downloadUrl;
      link.setAttribute("download", latest.fileName);
    });
    document.querySelectorAll("[data-release-version]").forEach((node) => {
      node.textContent = latest.version;
    });
    const status = document.querySelector("[data-release-status]");
    if (status) status.textContent = `${latest.fileName} · descarga oficial de GitHub`;
  } catch (error) {
    console.info("No se pudo consultar la última Release; se conserva el enlace general.", error);
  }
}

function initialize() {
  document.querySelectorAll(".deck-key").forEach((key) => {
    key.addEventListener("click", () => toggleDemoKey(key));
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });
    document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
  }

  void hydrateLatestRelease();
}

if (typeof document !== "undefined") initialize();

const RELEASE_API = "https://api.github.com/repos/MAECLY/gaming-toggles/releases/latest";

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
  if (indicator) {
    indicator.classList.toggle("is-on", isOn);
    indicator.textContent = label;
    indicator.dataset.state = isOn ? "on" : "off";
  }
  return isOn;
}

export function cycleDemoKey(key, root = document) {
  const labels = (key.dataset.cycleLabels ?? "").split("|").filter(Boolean);
  const images = (key.dataset.cycleImages ?? "").split("|").filter(Boolean);
  if (labels.length === 0 || labels.length !== images.length) {
    throw new Error("La tecla cíclica de la demo no tiene estados válidos.");
  }
  const previous = Number.parseInt(key.dataset.demoIndex ?? "0", 10);
  const index = (Number.isFinite(previous) ? previous + 1 : 0) % labels.length;
  const label = labels[index];
  key.dataset.demoIndex = String(index);
  const strong = key.querySelector("strong");
  const icon = key.querySelector("img");
  const indicator = root.querySelector(`[data-indicator="${key.dataset.setting}"]`);
  if (strong) strong.textContent = label;
  if (icon) icon.src = images[index];
  if (indicator) {
    indicator.textContent = label;
    indicator.dataset.state = "cycle";
  }
  return label;
}

export function triggerDemoCommand(key, root = document) {
  const strong = key.querySelector("strong");
  const indicator = root.querySelector(`[data-indicator="${key.dataset.setting}"]`);
  const original = strong?.textContent ?? "WIN+F11";
  const ready = document.documentElement.lang === "es" ? "LISTO" : "READY";
  key.classList.add("is-command-active");
  if (strong) strong.textContent = key.dataset.commandLabel ?? "SENT";
  if (indicator) {
    indicator.textContent = key.dataset.commandLabel ?? "SENT";
    indicator.dataset.state = "command";
  }
  window.setTimeout(() => {
    key.classList.remove("is-command-active");
    if (strong) strong.textContent = original;
    if (indicator) {
      indicator.textContent = ready;
      indicator.dataset.state = "command";
    }
  }, 900);
  return true;
}

export function activateDemoKey(key, root = document) {
  if (key.dataset.demo === "toggle") return toggleDemoKey(key, root);
  if (key.dataset.demo === "cycle") return cycleDemoKey(key, root);
  if (key.dataset.demo === "command") return triggerDemoCommand(key, root);
  return false;
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
    // Each page supplies its own wording so the English build stops printing Spanish.
    const status = document.querySelector("[data-release-status]");
    if (status) {
      const suffix = status.dataset.releaseStatus;
      status.textContent = suffix ? `${latest.fileName} · ${suffix}` : latest.fileName;
    }
  } catch (error) {
    console.info("No se pudo consultar la última Release; se conserva el enlace general.", error);
  }
}

function initialize() {
  document.querySelectorAll(".deck-key[data-demo]").forEach((key) => {
    key.addEventListener("click", () => activateDemoKey(key));
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

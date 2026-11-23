const toast = document.querySelector("[data-toast]");
let toastTimer;

document.querySelectorAll("[data-download-button]").forEach((button) => {
  button.addEventListener("click", () => {
    clearTimeout(toastTimer);
    toast?.classList.add("is-visible");
    toastTimer = setTimeout(() => toast?.classList.remove("is-visible"), 3200);
  });
});

const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector(".site-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  navigation?.classList.toggle("is-open", !open);
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  });
});

/* Floating header: compress the pill once the page is scrolled */
const header = document.querySelector("[data-header]");

function syncHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

/* Demo: inline iframe on desktop, fullscreen overlay on touch devices */
const DEMO_URL = "./app-demo/index.html?v=4.13.0-preview";
const DEMO_STAGE_WIDTH = 1280;
const DEMO_STAGE_HEIGHT = 800;
const inlineDemo = document.querySelector("[data-demo-inline]");
const demoOverlay = document.querySelector("[data-demo-overlay]");
const demoStage = document.querySelector("[data-demo-stage]");
const fullDemo = document.querySelector("[data-demo-full]");
const demoOpenButton = document.querySelector("[data-demo-open]");
const demoCloseButtons = document.querySelectorAll("[data-demo-close]");
const desktopQuery = window.matchMedia("(min-width: 861px)");
let lastFocused = null;
let closeTimer;

function loadInlineDemo() {
  if (!desktopQuery.matches || !inlineDemo) return;
  if (!inlineDemo.getAttribute("src")) {
    inlineDemo.setAttribute("src", inlineDemo.dataset.src || DEMO_URL);
  }
}

function fitDemoStage() {
  if (!demoOverlay || !demoStage) return;
  const width = demoOverlay.clientWidth;
  const height = demoOverlay.clientHeight;
  if (!width || !height) return;
  const scale = Math.min(width / DEMO_STAGE_WIDTH, height / DEMO_STAGE_HEIGHT);
  demoStage.style.setProperty("--demo-scale", String(Math.max(scale, 0.1)));
}

loadInlineDemo();
desktopQuery.addEventListener?.("change", loadInlineDemo);

function openDemo() {
  if (!demoOverlay) return;
  lastFocused = document.activeElement;
  clearTimeout(closeTimer);

  if (fullDemo && !fullDemo.getAttribute("src")) {
    fullDemo.setAttribute("src", DEMO_URL);
  }

  demoOverlay.hidden = false;
  void demoOverlay.offsetHeight;
  demoOverlay.classList.add("is-open");
  document.documentElement.classList.add("demo-lock");
  fitDemoStage();
  demoCloseButtons[0]?.focus({ preventScroll: true });

  if (history.state?.demo !== true) {
    history.pushState({ demo: true }, "");
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    demoOverlay.requestFullscreen?.({ navigationUI: "hide" })?.catch?.(() => {});
    screen.orientation?.lock?.("landscape")?.catch?.(() => {});
  }
}

function closeDemo({ fromHistory = false } = {}) {
  if (!demoOverlay) return;

  if (!demoOverlay.classList.contains("is-open")) {
    if (!fromHistory && history.state?.demo === true) history.back();
    return;
  }

  demoOverlay.classList.remove("is-open");
  document.documentElement.classList.remove("demo-lock");
  screen.orientation?.unlock?.();
  if (document.fullscreenElement) {
    document.exitFullscreen?.()?.catch?.(() => {});
  }

  closeTimer = setTimeout(() => {
    demoOverlay.hidden = true;
    fullDemo?.removeAttribute("src");
  }, 320);

  lastFocused?.focus?.({ preventScroll: true });

  if (!fromHistory && history.state?.demo === true) history.back();
}

demoOpenButton?.addEventListener("click", openDemo);
demoCloseButtons.forEach((button) => {
  button.addEventListener("click", () => closeDemo());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && demoOverlay?.classList.contains("is-open")) {
    closeDemo();
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && demoOverlay?.classList.contains("is-open")) {
    closeDemo();
  } else {
    fitDemoStage();
  }
});

window.addEventListener("resize", () => {
  if (demoOverlay?.classList.contains("is-open")) fitDemoStage();
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (demoOverlay?.classList.contains("is-open")) fitDemoStage();
  }, 250);
});

window.addEventListener("popstate", () => {
  if (demoOverlay?.classList.contains("is-open")) {
    closeDemo({ fromHistory: true });
  }
});

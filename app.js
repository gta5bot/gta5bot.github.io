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

/* Header: keep its shape, slide away on scroll down, return on scroll up */
const header = document.querySelector("[data-header]");
let lastScrollY = window.scrollY;
let scrollIntent = 0;
let lastDirection = 0;
let navScrollUntil = 0;

function syncHeader(y) {
  const delta = y - lastScrollY;
  const inJourney =
    journeyMedia.matches && y >= journeyTop - 2 && y <= journeyTop + journeyRange + 2;
  const forceVisible = inJourney || performance.now() < navScrollUntil;

  header?.classList.toggle("has-scrolled", y > 90);

  if (y < 90 || forceVisible) {
    scrollIntent = 0;
    header?.classList.remove("is-hidden");
  } else if (delta !== 0) {
    const direction = delta > 0 ? 1 : -1;
    if (direction !== lastDirection) scrollIntent = 0;
    lastDirection = direction;
    scrollIntent = Math.max(Math.min(scrollIntent + delta, 240), -240);
    if (scrollIntent > 70) header?.classList.add("is-hidden");
    else if (scrollIntent < -40) header?.classList.remove("is-hidden");
  }
  lastScrollY = y;
}

/* Journey: vertical scroll drives horizontal panels (desktop only) */
const journey = document.querySelector("[data-journey]");
const journeyTrack = document.querySelector("[data-journey-track]");
const journeyDots = Array.from(document.querySelectorAll("[data-journey-dots] span"));
const panels = Array.from(document.querySelectorAll("[data-panel]"));
const navLinks = Array.from(document.querySelectorAll("[data-nav-panel]"));
const journeyMedia = window.matchMedia("(min-width: 861px)");

let journeyTop = 0;
let journeyRange = 1;
let snapLockUntil = 0;
let previousY = window.scrollY;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function measureJourney() {
  if (!journey) return;
  journeyTop = journey.getBoundingClientRect().top + window.scrollY;
  journeyRange = Math.max(journey.offsetHeight - window.innerHeight, 1);
}

function setActivePanel(index) {
  const visible = index >= 0;
  navLinks.forEach((link) => {
    const id = (link.getAttribute("href") || "").replace("#", "");
    const target = panels.findIndex((panel) => panel.id === id);
    const active = visible && target === index;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  journeyDots.forEach((dot, i) => dot.classList.toggle("is-active", visible && i === index));
}

function renderJourney() {
  if (!journey || !journeyTrack) return;
  if (!journeyMedia.matches) {
    journeyTrack.style.transform = "";
    setActivePanel(-1);
    return;
  }
  const segments = panels.length - 1;
  const raw = (window.scrollY - journeyTop) / journeyRange;
  const clamped = Math.min(Math.max(raw, 0), 1);
  const position = clamped * segments;
  journeyTrack.style.transform = `translate3d(${(-position * window.innerWidth).toFixed(2)}px, 0, 0)`;
  const active = raw > -0.02 && raw < 1.02 ? Math.round(position) : -1;
  setActivePanel(active);
}

const rootEl = document.documentElement;
let scrollAnim = 0;
let scrollFallback = 0;
let snapTimer = 0;
let savedScrollBehavior = null;

function lockScrollBehavior() {
  if (savedScrollBehavior !== null) return;
  savedScrollBehavior = rootEl.style.scrollBehavior;
  rootEl.style.scrollBehavior = "auto";
}

function unlockScrollBehavior() {
  if (savedScrollBehavior === null) return;
  rootEl.style.scrollBehavior = savedScrollBehavior;
  savedScrollBehavior = null;
}

function jumpTo(targetY) {
  lockScrollBehavior();
  window.scrollTo(0, targetY);
  unlockScrollBehavior();
}

function cancelScrollAnimation() {
  clearTimeout(snapTimer);
  clearTimeout(scrollFallback);
  if (!scrollAnim) return;
  cancelAnimationFrame(scrollAnim);
  scrollAnim = 0;
  unlockScrollBehavior();
  snapLockUntil = performance.now() + 240;
}

function animateScrollTo(targetY, duration = 620) {
  cancelAnimationFrame(scrollAnim);
  clearTimeout(scrollFallback);
  clearTimeout(snapTimer);
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;
  const start = performance.now();
  lockScrollBehavior();
  snapLockUntil = performance.now() + duration + 220;

  let lastTick = 0;

  const step = (now) => {
    lastTick = now;
    const t = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOut(t));
    renderJourney();
    if (t < 1) {
      scrollAnim = requestAnimationFrame(step);
      clearTimeout(scrollFallback);
      scrollFallback = setTimeout(() => {
        if (lastTick === now) {
          cancelAnimationFrame(scrollAnim);
          step(performance.now());
        }
      }, 48);
    } else {
      scrollAnim = 0;
      unlockScrollBehavior();
    }
  };
  step(start);
}

function journeyY(index) {
  return journeyTop + (index / (panels.length - 1)) * journeyRange;
}

function snapJourney(y, direction) {
  if (!journeyMedia.matches || !journey) return;
  const now = performance.now();
  if (now < snapLockUntil) return;
  const raw = (y - journeyTop) / journeyRange;
  if (raw <= 0.001 || raw >= 0.999) return;

  const segments = panels.length - 1;
  const position = raw * segments;
  const index = Math.floor(position);
  const progress = position - index;

  let target;
  if (direction > 0) {
    if (progress >= 0.7) target = index + 1;
    else if (progress < 0.05) target = index;
    else return;
  } else if (direction < 0) {
    if (progress <= 0.3) target = index;
    else if (progress > 0.95) target = index + 1;
    else return;
  } else {
    target = Math.round(position);
  }
  if (target < 0 || target > segments) return;
  if (Math.abs(journeyY(target) - y) < 2) return;

  animateScrollTo(journeyY(target), 640);
}

function scrollToPanel(id, smooth = true) {
  const index = panels.findIndex((panel) => panel.id === id);
  if (index < 0 || !journeyMedia.matches) return false;
  const targetY = journeyTop + (index / (panels.length - 1)) * journeyRange;
  cancelScrollAnimation();
  snapLockUntil = performance.now() + 1000;
  navScrollUntil = performance.now() + 1100;
  if (smooth) animateScrollTo(targetY, 680);
  else jumpTo(targetY);
  return true;
}

let lastScrollDirection = 0;

function onScroll() {
  const y = window.scrollY;
  const delta = y - previousY;
  if (delta !== 0) lastScrollDirection = delta > 0 ? 1 : -1;
  syncHeader(y);
  renderJourney();
  previousY = y;

  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => snapJourney(window.scrollY, lastScrollDirection), 150);
}

measureJourney();
renderJourney();
syncHeader(window.scrollY);
window.addEventListener("scroll", onScroll, { passive: true });
["wheel", "touchstart"].forEach((type) => {
  window.addEventListener(type, cancelScrollAnimation, { passive: true });
});
window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
    cancelScrollAnimation();
  }
});
window.addEventListener("resize", () => {
  measureJourney();
  renderJourney();
});
window.addEventListener("load", () => {
  measureJourney();
  renderJourney();
});
journeyMedia.addEventListener?.("change", () => {
  measureJourney();
  renderJourney();
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const id = (link.getAttribute("href") || "").slice(1);
  if (!panels.some((panel) => panel.id === id)) return;
  link.addEventListener("click", (event) => {
    if (!scrollToPanel(id)) return;
    event.preventDefault();
    history.replaceState(null, "", `#${id}`);
  });
});

if (location.hash) {
  const id = location.hash.slice(1);
  setTimeout(() => scrollToPanel(id, false), 120);
}

/* Demo: inline iframe on desktop, fullscreen overlay on touch devices */
const DEMO_URL = "./app-demo/index.html?v=4.13.0-theme4";
const DEMO_STAGE_WIDTH = 1280;
const DEMO_STAGE_HEIGHT = 800;
const inlineDemo = document.querySelector("[data-demo-inline]");
const inlineStage = document.querySelector("[data-demo-stage-inline]");
const inlineWindow = document.querySelector("[data-demo-window]");
const demoOverlay = document.querySelector("[data-demo-overlay]");
const demoStage = document.querySelector("[data-demo-stage]");
const fullDemo = document.querySelector("[data-demo-full]");
const demoOpenButton = document.querySelector("[data-demo-open]");
const demoCloseButtons = document.querySelectorAll("[data-demo-close]");
const desktopQuery = window.matchMedia("(min-width: 861px)");
let lastFocused = null;
let closeTimer;

/* Demo theme: dark / light / glass, applied to the demo iframes */
const THEME_KEY = "stake-drop-demo-theme";
const THEMES = ["dark", "light", "glass"];
const themeButtons = Array.from(document.querySelectorAll("[data-theme-set]"));
let demoTheme = document.documentElement.classList.contains("light") ? "light" : "dark";

/* The demo follows the site theme on load; a saved glass preview stays as-is. */
try {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "glass") demoTheme = "glass";
} catch (error) {}

function applyThemeToDoc(doc) {
  if (!doc) return;
  const docRoot = doc.documentElement;
  docRoot.classList.toggle("light", demoTheme === "light");
  docRoot.classList.toggle("glass-mode", demoTheme === "glass");
  docRoot.style.colorScheme = demoTheme === "light" ? "light" : "dark";
}

function applyThemeToFrames() {
  [inlineDemo, fullDemo].forEach((frame) => {
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      applyThemeToDoc(doc);
      frame.contentWindow?.postMessage({ type: "stake-drop-theme", theme: demoTheme }, "*");
    } catch (error) {}
  });
}

function renderThemeButtons() {
  themeButtons.forEach((button) => {
    const active = button.dataset.themeSet === demoTheme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setDemoTheme(next, { persist = true } = {}) {
  if (!THEMES.includes(next)) return;
  demoTheme = next;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {}
  }
  renderThemeButtons();
  applyThemeToFrames();
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setDemoTheme(button.dataset.themeSet));
});

inlineDemo?.addEventListener("load", applyThemeToFrames);
fullDemo?.addEventListener("load", applyThemeToFrames);

window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY && THEMES.includes(event.newValue)) {
    setDemoTheme(event.newValue, { persist: false });
  }
});

/* Demo -> site: keep the switches in sync when the theme is changed inside the app */
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "stake-drop-theme-changed" || !THEMES.includes(data.theme)) return;
  if (data.theme !== demoTheme) setDemoTheme(data.theme);
});

/* Site theme -> demo: the app preview follows the site's light/dark switch */
window.addEventListener("stake-drop-site-theme-change", (event) => {
  const theme = event.detail === "light" ? "light" : "dark";
  if (theme !== demoTheme) setDemoTheme(theme);
});

/* Wheel forwarded from the inline demo: the page keeps scrolling under the cursor */
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "stake-drop-demo-wheel") return;
  if (event.source !== inlineDemo?.contentWindow && event.source !== fullDemo?.contentWindow) return;
  if (document.documentElement.classList.contains("demo-lock")) return;
  const step = Number(data.deltaY);
  if (!Number.isFinite(step) || step === 0) return;
  cancelScrollAnimation();
  jumpTo(window.scrollY + step);
});

renderThemeButtons();

function loadInlineDemo() {
  if (!desktopQuery.matches || !inlineDemo) return;
  if (!inlineDemo.getAttribute("src")) {
    const src = inlineDemo.dataset.src || DEMO_URL;
    inlineDemo.setAttribute("src", `${src}&theme=${demoTheme}`);
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

function fitInlineDemo() {
  if (!inlineStage || !inlineWindow) return;
  const width = inlineWindow.clientWidth;
  if (!width) return;
  inlineStage.style.setProperty("--demo-scale", String(width / DEMO_STAGE_WIDTH));
}

loadInlineDemo();
fitInlineDemo();
desktopQuery.addEventListener?.("change", loadInlineDemo);

if (typeof ResizeObserver !== "undefined" && inlineWindow) {
  new ResizeObserver(fitInlineDemo).observe(inlineWindow);
}

function openDemo() {
  if (!demoOverlay) return;
  lastFocused = document.activeElement;
  clearTimeout(closeTimer);

  if (fullDemo && !fullDemo.getAttribute("src")) {
    fullDemo.setAttribute("src", `${DEMO_URL}&theme=${demoTheme}`);
  }

  demoOverlay.hidden = false;
  void demoOverlay.offsetHeight;
  demoOverlay.classList.add("is-open");
  document.documentElement.classList.add("demo-lock");
  fitDemoStage();
  if (!window.matchMedia("(pointer: coarse)").matches) {
    demoCloseButtons[0]?.focus({ preventScroll: true });
  }

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

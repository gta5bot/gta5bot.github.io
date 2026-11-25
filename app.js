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
  const index = Math.min(Math.floor(position), segments - 1);
  const progress = position - index;
  const x = (index + easeInOut(progress)) * window.innerWidth;
  journeyTrack.style.transform = `translate3d(${-x.toFixed(2)}px, 0, 0)`;
  const active = raw > -0.02 && raw < 1.02 ? Math.round(position) : -1;
  setActivePanel(active);
}

const rootEl = document.documentElement;
let scrollTimer = 0;
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

function animateScrollTo(targetY, duration = 560) {
  clearTimeout(scrollTimer);
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;
  const start = performance.now();
  lockScrollBehavior();

  const step = () => {
    const t = Math.min((performance.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo(0, startY + distance * eased);
    renderJourney();
    if (t < 1) {
      scrollTimer = setTimeout(step, 16);
    } else {
      unlockScrollBehavior();
    }
  };
  step();
}

function snapJourney(y) {
  if (!journeyMedia.matches || !journey) return;
  const now = performance.now();
  if (now < snapLockUntil) return;
  const raw = (y - journeyTop) / journeyRange;
  if (raw <= 0.001 || raw >= 0.999) return;

  const segments = panels.length - 1;
  const position = raw * segments;
  const index = Math.floor(position);
  const progress = position - index;
  const goingDown = y > previousY;

  let target = -1;
  if (goingDown && progress >= 0.7) target = index + 1;
  else if (!goingDown && progress <= 0.3) target = index;
  if (target < 0 || target > segments) return;

  snapLockUntil = now + 700;
  animateScrollTo(journeyTop + (target / segments) * journeyRange, 560);
}

function scrollToPanel(id, smooth = true) {
  const index = panels.findIndex((panel) => panel.id === id);
  if (index < 0 || !journeyMedia.matches) return false;
  const targetY = journeyTop + (index / (panels.length - 1)) * journeyRange;
  snapLockUntil = performance.now() + 900;
  navScrollUntil = performance.now() + 1000;
  if (smooth) animateScrollTo(targetY, 640);
  else jumpTo(targetY);
  return true;
}

function onScroll() {
  const y = window.scrollY;
  syncHeader(y);
  renderJourney();
  snapJourney(y);
  previousY = y;
}

measureJourney();
renderJourney();
syncHeader(window.scrollY);
window.addEventListener("scroll", onScroll, { passive: true });
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
const DEMO_URL = "./app-demo/index.html?v=4.13.0-preview";
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

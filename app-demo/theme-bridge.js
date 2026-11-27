/* Demo-only theme bridge.
   - Keeps the demo theme (dark / light / glass) applied even though the app
     resets its own appearance on boot.
   - Adds a "Скло PRO" option to the app's theme segmented control.
   - Syncs the theme with the marketing site via postMessage. */
(function () {
  var KEY = "stake-drop-demo-theme";
  var THEMES = ["dark", "light", "glass"];
  var root = document.documentElement;
  var theme = "dark";
  var seg = null;

  try {
    var param = new URLSearchParams(location.search).get("theme");
    var stored = localStorage.getItem(KEY);
    var initial = param || stored || "dark";
    if (THEMES.indexOf(initial) >= 0) theme = initial;
  } catch (error) {}

  function persist(next) {
    try {
      localStorage.setItem(KEY, next);
    } catch (error) {}
  }

  function apply() {
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("glass-mode", theme === "glass");
    root.style.colorScheme = theme === "light" ? "light" : "dark";
    updateSegment();
  }

  function setTheme(next, options) {
    if (THEMES.indexOf(next) < 0) return;
    var opts = options || {};
    theme = next;
    if (opts.persist !== false) persist(next);
    apply();
    if (opts.broadcast !== false) {
      try {
        parent.postMessage({ type: "stake-drop-theme-changed", theme: next }, "*");
      } catch (error) {}
    }
  }

  /* Keep our theme applied even if the app rewrites the root class. */
  new MutationObserver(function () {
    var wantsLight = theme === "light";
    var wantsGlass = theme === "glass";
    if (root.classList.contains("light") !== wantsLight) {
      root.classList.toggle("light", wantsLight);
    }
    if (root.classList.contains("glass-mode") !== wantsGlass) {
      root.classList.toggle("glass-mode", wantsGlass);
    }
    root.style.colorScheme = wantsLight ? "light" : "dark";
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  /* Site -> demo */
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "stake-drop-theme") return;
    if (THEMES.indexOf(data.theme) < 0) return;
    setTheme(data.theme, { broadcast: false });
  });

  /* ---- "Скло PRO" option inside the app's theme switcher ---- */

  var BASE =
    "transition-ui flex items-center justify-center gap-[var(--space-2)] rounded-[7px] py-[var(--space-2)] font-semibold active:scale-[0.985]";
  var ACTIVE = "bg-accent-soft text-accent border-accent/40 border";
  var IDLE = "text-fg-muted hover:text-fg";

  var GLASS_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-[var(--icon-sm)] w-[var(--icon-sm)]" aria-hidden="true">' +
    '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9z"/>' +
    '<path d="m18.5 15.5.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" stroke="none"/></svg>';

  function findSegment() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button[aria-pressed]"));
    var dark = null;
    var light = null;
    for (var i = 0; i < buttons.length; i++) {
      var text = (buttons[i].textContent || "").trim();
      if (!dark && text === "Темна") dark = buttons[i];
      else if (!light && text === "Світла") light = buttons[i];
    }
    if (!dark || !light || dark.parentElement !== light.parentElement) return null;
    return dark.parentElement;
  }

  function labelTheme(segEl) {
    var buttons = segEl.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var text = (buttons[i].textContent || "").trim();
      if (text === "Темна") buttons[i].dataset.themeApp = "dark";
      else if (text === "Світла") buttons[i].dataset.themeApp = "light";
    }
  }

  function buildGlassButton() {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.themeGlass = "";
    button.className = BASE + " " + IDLE;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("title", "Скло — стиль для PRO-користувачів");
    button.innerHTML = GLASS_ICON + "<span>Скло</span><span class=\"pro-badge-app\">PRO</span>";
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setTheme("glass");
    });
    return button;
  }

  function updateSegment() {
    if (!seg) return;
    var glass = seg.querySelector("[data-theme-glass]");
    if (glass) {
      var active = theme === "glass";
      glass.className = BASE + " " + (active ? ACTIVE : IDLE);
      glass.setAttribute("aria-pressed", String(active));
    }
  }

  function ensureSegment() {
    var found = findSegment();
    if (!found) {
      seg = null;
      return;
    }
    if (found !== seg) {
      seg = found;
      seg.setAttribute("data-theme-seg", "");
      if (!seg.style.gridTemplateColumns) {
        seg.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      }
      if (!seg.dataset.themeBound) {
        seg.dataset.themeBound = "1";
        seg.addEventListener(
          "click",
          function (event) {
            var button = event.target.closest ? event.target.closest("button") : null;
            if (!button || button.hasAttribute("data-theme-glass")) return;
            var text = (button.textContent || "").trim();
            if (text === "Темна") setTheme("dark");
            else if (text === "Світла") setTheme("light");
          },
          true
        );
      }
    }
    labelTheme(seg);
    if (!seg.querySelector("[data-theme-glass]")) {
      seg.appendChild(buildGlassButton());
    }
    updateSegment();
  }

  var scheduled = false;
  function scheduleEnsure() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensureSegment();
    });
  }

  if (document.body) {
    new MutationObserver(scheduleEnsure).observe(document.body, { childList: true, subtree: true });
  }
  setInterval(ensureSegment, 900);

  apply();
  window.addEventListener("load", function () {
    apply();
    ensureSegment();
    var tries = 0;
    var timer = setInterval(function () {
      apply();
      ensureSegment();
      if (++tries > 24) clearInterval(timer);
    }, 200);
  });
})();

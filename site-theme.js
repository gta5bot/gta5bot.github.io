/* Site-wide light/dark theme switch. */
(function () {
  var KEY = "stake-drop-site-theme";
  var root = document.documentElement;
  var button = document.querySelector("[data-site-theme-toggle]");
  var themeColor = document.querySelector('meta[name="theme-color"]');

  function isLight() {
    return root.classList.contains("light");
  }

  function apply(light, persist, notify) {
    root.classList.toggle("light", light);
    root.style.colorScheme = light ? "light" : "dark";
    if (themeColor) themeColor.setAttribute("content", light ? "#f4f1ef" : "#232023");
    if (button) {
      button.setAttribute("aria-pressed", String(light));
      button.setAttribute("aria-label", light ? "Увімкнути темну тему" : "Увімкнути світлу тему");
      button.title = light ? "Темна тема" : "Світла тема";
    }
    if (persist) {
      try {
        localStorage.setItem(KEY, light ? "light" : "dark");
      } catch (error) {}
    }
    if (notify !== false) {
      window.dispatchEvent(new CustomEvent("stake-drop-site-theme-change", { detail: light ? "light" : "dark" }));
    }
  }

  var saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (error) {}
  apply(saved ? saved === "light" : isLight(), false, false);

  button?.addEventListener("click", function () {
    apply(!isLight(), true);
    if (button.animate) {
      button.animate(
        [{ transform: "scale(1)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }],
        { duration: 320, easing: "ease-out" }
      );
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key === KEY && (event.newValue === "light" || event.newValue === "dark")) {
      apply(event.newValue === "light", false);
    }
  });
})();

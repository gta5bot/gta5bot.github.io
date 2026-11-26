/* Demo-only theme bridge.
   The app's appearance effect resets the `light` class on boot, so this keeps
   the demo theme applied and accepts updates from the marketing site. */
(function () {
  var KEY = "stake-drop-demo-theme";
  var theme = "dark";

  try {
    var param = new URLSearchParams(location.search).get("theme");
    var stored = localStorage.getItem(KEY);
    theme = param || stored || "dark";
  } catch (error) {}

  if (theme !== "light" && theme !== "glass") theme = "dark";

  function apply() {
    var root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("glass-mode", theme === "glass");
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  }

  apply();

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "stake-drop-theme") return;
    if (data.theme !== "light" && data.theme !== "glass" && data.theme !== "dark") return;
    theme = data.theme;
    apply();
  });

  window.addEventListener("load", function () {
    apply();
    var tries = 0;
    var timer = setInterval(function () {
      apply();
      if (++tries > 24) clearInterval(timer);
    }, 200);
  });
})();

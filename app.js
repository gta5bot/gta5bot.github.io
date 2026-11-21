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

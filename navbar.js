document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const hamburger = nav.querySelector("#hamburger");
  const mainMenu = nav.querySelector("#mainMenu");
  const submenuToggles = nav.querySelectorAll(".toggle-submenu");
  const isMobile = () => window.innerWidth <= 900;

  hamburger?.addEventListener("click", () => {
    mainMenu.classList.toggle("show");
  });

  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      if (!isMobile()) return;

      e.preventDefault();

      const parent = this.closest(".dropdown");
      const alreadyOpen = parent.classList.contains("show");

      nav.querySelectorAll(".dropdown.show").forEach(item => {
        item.classList.remove("show");
      });

      if (!alreadyOpen) {
        parent.classList.add("show");
      }
    });
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      mainMenu?.classList.remove("show");
      nav.querySelectorAll(".dropdown.show").forEach(item => {
        item.classList.remove("show");
      });
    }
  });
});

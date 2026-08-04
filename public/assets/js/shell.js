// Bootstrapper equivalente ao layout de src/routes/__root.tsx: liga o toggle
// do menu (mobile = sheet deslizante, desktop = colapsar), o botão de tema,
// o widget de tradução, o banner de cookies e a renderização da nav conforme
// a sessão muda.
(function () {
  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function wireSidebarToggle() {
    const toggle = document.getElementById("sidebar-toggle");
    const overlay = document.getElementById("sidebar-overlay");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      if (isMobile()) {
        document.body.classList.toggle("sidebar-open");
      } else {
        document.body.classList.toggle("sidebar-collapsed");
      }
    });

    if (overlay) {
      overlay.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
    }

    // Ao navegar (clicar num item do menu) no mobile, fecha o sheet.
    document.getElementById("sidebar-nav")?.addEventListener("click", (e) => {
      if (isMobile() && e.target.closest(".nav-item")) {
        document.body.classList.remove("sidebar-open");
      }
    });
  }

  function wireThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn || !window.AppTheme) return;
    btn.addEventListener("click", () => window.AppTheme.cycleTheme());
  }

  function wireAuthArea(user) {
    const area = document.getElementById("auth-area");
    if (!area) return;

    if (user) {
      area.innerHTML = `<button type="button" class="btn btn-outline btn-sm" id="logout-btn" data-i18n="common.logout"></button>`;
      if (window.i18n) window.i18n.applyI18n(area);
      document.getElementById("logout-btn")?.addEventListener("click", async () => {
        await window.AppAuth.logout();
        window.location.href = "/index.html";
      });
    } else {
      area.innerHTML = "";
    }
  }

  function boot() {
    wireSidebarToggle();
    wireThemeToggle();
    if (window.i18n) window.i18n.applyI18n();
    if (window.mountCookieConsent) window.mountCookieConsent();
    if (window.mountGoogleTranslate) window.mountGoogleTranslate("google_translate_element");
    if (window.lucide) window.lucide.createIcons();

    if (window.AppAuth) {
      const render = (user) => {
        if (window.AppNav) window.AppNav.render(user);
        wireAuthArea(user);
        document.dispatchEvent(new CustomEvent("app-user-changed", { detail: { user } }));
      };
      render(window.AppAuth.getUser());
      window.AppAuth.onChange(render);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

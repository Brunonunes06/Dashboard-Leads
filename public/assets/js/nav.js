// Porta de src/components/AppSidebar.tsx — mesmos itens, mesmo filtro
// admin-only, mesmo destaque de rota ativa.
(function () {
  const ALL_ITEMS = [
    { key: "nav.dashboard", url: "/index.html", icon: "layout-dashboard", adminOnly: false },
    { key: "nav.chat", url: "/leads/chat.html", icon: "messages-square", adminOnly: false },
    { key: "nav.plans", url: "/plans.html", icon: "credit-card", adminOnly: false },
    { key: "nav.instagram", url: "/instagram.html", icon: "instagram", adminOnly: true },
    { key: "nav.settings", url: "/settings.html", icon: "settings-2", adminOnly: true },
    { key: "nav.profile", url: "/profile.html", icon: "user-circle", adminOnly: false },
  ];

  function render(user) {
    const nav = document.getElementById("sidebar-nav");
    if (!nav) return;

    const isAdmin = !!(user && user.role === "admin");
    const path = window.location.pathname;

    const items = ALL_ITEMS.filter((item) => isAdmin || !item.adminOnly);

    nav.innerHTML = items
      .map((item) => {
        const active = path === item.url || (item.url === "/index.html" && path === "/");
        return `
          <a class="nav-item${active ? " active" : ""}" href="${item.url}">
            <i data-lucide="${item.icon}"></i>
            <span data-i18n="${item.key}"></span>
          </a>
        `;
      })
      .join("");

    if (window.i18n) window.i18n.applyI18n(nav);
    if (window.lucide) window.lucide.createIcons();

    const footer = document.getElementById("sidebar-footer");
    if (footer) footer.classList.toggle("hidden", !isAdmin);
  }

  window.AppNav = { render, ALL_ITEMS };
})();

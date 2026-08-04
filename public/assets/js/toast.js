// Toast simples (porta minimalista de sonner, usado em vários pontos do app).
(function () {
  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.style.cssText =
      "position:fixed;bottom:1rem;right:1rem;z-index:60;display:flex;flex-direction:column;gap:0.5rem;max-width:22rem;";
    document.body.appendChild(container);
    return container;
  }

  function show(kind, title, description) {
    const el = document.createElement("div");
    const colors = {
      success: "var(--primary)",
      error: "var(--destructive)",
      warning: "var(--warning)",
      info: "var(--foreground)",
    };
    el.style.cssText = `background:var(--card);border:1px solid var(--border);border-left:3px solid ${colors[kind] || colors.info};border-radius:var(--radius-md);padding:0.75rem 1rem;box-shadow:0 8px 24px rgb(0 0 0 / 0.25);font-size:0.8rem;color:var(--foreground);`;
    el.innerHTML = `<strong style="display:block">${title}</strong>${description ? `<span style="color:var(--muted-foreground)">${description}</span>` : ""}`;
    ensureContainer().appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  window.toast = {
    success: (title, opts) => show("success", title, opts && opts.description),
    error: (title, opts) => show("error", title, opts && opts.description),
    warning: (title, opts) => show("warning", title, opts && opts.description),
    info: (title, opts) => show("info", title, opts && opts.description),
  };
})();

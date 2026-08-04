// Alterna claro/escuro/sistema — mesma chave localStorage e mesma lógica de
// src/components/ThemeProvider.tsx (aplica a classe "light" ou "dark" no
// <html>). O valor inicial já é aplicado por um script inline no <head> de
// cada página (evita flash); este arquivo só cuida do botão de alternância.
(function () {
  const STORAGE_KEY = "resposta-theme";

  function getSystem() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyClass(resolved) {
    const root = document.documentElement;
    root.classList.toggle("light", resolved === "light");
    root.classList.toggle("dark", resolved === "dark");
  }

  function resolve(theme) {
    return theme === "system" ? getSystem() : theme;
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyClass(resolve(theme));
  }

  function cycleTheme() {
    const order = ["dark", "light", "system"];
    const current = getTheme();
    const next = order[(order.indexOf(current) + 1) % order.length];
    setTheme(next);
    return next;
  }

  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", () => {
    if (getTheme() === "system") applyClass(getSystem());
  });

  window.AppTheme = { getTheme, setTheme, cycleTheme, resolve };
})();

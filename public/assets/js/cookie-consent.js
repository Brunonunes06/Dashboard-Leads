// Porta de src/components/CookieConsent.tsx.
(function () {
  const STORAGE_KEY = "lgpd_cookie_consent";

  function mount() {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const el = document.createElement("div");
    el.className = "cookie-banner";
    el.innerHTML = `
      <p><span data-i18n="cookies.message"></span> <a href="/privacy.html" data-i18n="cookies.learnMore"></a></p>
      <div class="actions">
        <button type="button" class="btn btn-outline btn-sm" data-action="decline" data-i18n="cookies.decline"></button>
        <button type="button" class="btn btn-primary btn-sm" data-action="accept" data-i18n="cookies.accept"></button>
      </div>
    `;
    document.body.appendChild(el);
    if (window.i18n) window.i18n.applyI18n(el);

    el.querySelector('[data-action="accept"]').addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEY, "accepted");
      el.remove();
    });
    el.querySelector('[data-action="decline"]').addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEY, "declined");
      localStorage.removeItem("locale");
      localStorage.removeItem("resposta-theme");
      el.remove();
    });
  }

  window.mountCookieConsent = mount;
})();

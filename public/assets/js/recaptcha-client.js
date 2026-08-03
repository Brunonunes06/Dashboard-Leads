// Porta de src/lib/recaptcha-client.ts.
(function () {
  let loadPromise = null;

  function loadScript(siteKey) {
    if (window.grecaptcha) return Promise.resolve();
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar reCAPTCHA"));
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  // Retorna null quando o reCAPTCHA não está configurado ou falha ao carregar —
  // quem chama deve tratar isso como fail-open (não bloquear o usuário).
  async function getRecaptchaToken(action) {
    const siteKey = window.__APP_CONFIG__ && window.__APP_CONFIG__.recaptchaSiteKey;
    if (!siteKey) return null;
    try {
      await loadScript(siteKey);
      await new Promise((resolve) => window.grecaptcha.ready(resolve));
      return await window.grecaptcha.execute(siteKey, { action });
    } catch (error) {
      console.warn("[reCAPTCHA] Não foi possível obter token:", error);
      return null;
    }
  }

  window.getRecaptchaToken = getRecaptchaToken;
})();

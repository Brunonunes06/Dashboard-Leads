// Porta de src/lib/google-translate.ts (sem o patch de removeChild/insertBefore
// — esse patch existe só pra não quebrar o reconciler do React; sem React,
// não é necessário).
(function () {
  const CUSTOM_DICTIONARY_LOCALES = ["pt", "en", "es"];
  let widgetMounted = false;

  function detectDeviceLanguage() {
    const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const raw of candidates) {
      const lang = String(raw || "").slice(0, 2).toLowerCase();
      if (lang) return lang;
    }
    return "pt";
  }

  function getGoogTransCookie() {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function setGoogTransCookie(targetLang) {
    const value = `/pt/${targetLang}`;
    document.cookie = `googtrans=${value}; path=/`;
    const host = location.hostname;
    if (host && host.includes(".")) {
      document.cookie = `googtrans=${value}; path=/; domain=.${host}`;
    }
  }

  function clearGoogTransCookie() {
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  }

  function mountGoogleTranslate(containerId) {
    if (widgetMounted || document.getElementById("google-translate-script")) return;
    widgetMounted = true;

    const deviceLang = detectDeviceLanguage();
    const alreadyHandled = CUSTOM_DICTIONARY_LOCALES.includes(deviceLang);
    const existingCookie = getGoogTransCookie();

    if (!alreadyHandled && !existingCookie) {
      setGoogTransCookie(deviceLang);
    } else if (alreadyHandled && existingCookie) {
      clearGoogTransCookie();
    }

    window.googleTranslateElementInit = function () {
      if (!window.google || !window.google.translate) return;
      new window.google.translate.TranslateElement({ pageLanguage: "pt", autoDisplay: false, layout: 0 }, containerId);
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
  }

  window.mountGoogleTranslate = mountGoogleTranslate;
})();

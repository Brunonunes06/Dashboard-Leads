// Google Translate widget: adds automatic translation into 100+ languages on
// top of the hand-written pt/en/es dictionary in src/lib/i18n.ts. Google
// rewrites text nodes across the whole page, which can crash React's
// reconciler on the next render (removeChild/insertBefore "Node not found"
// errors) since React no longer recognizes the DOM it manipulated. The patch
// below makes those two DOM methods tolerate nodes that already moved instead
// of throwing. This is a widely used workaround for combining Google
// Translate with React SPAs (see facebook/react#11538).
let domPatched = false;
export function patchDomForGoogleTranslate() {
  if (domPatched || typeof Node === "undefined") return;
  domPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (console) console.warn("[google-translate] skipped removeChild on a detached node", child, this);
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn("[google-translate] skipped insertBefore on a detached reference node", referenceNode, this);
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: unknown, containerId: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

// Idiomas ja cobertos pelo dicionario manual (src/lib/i18n.ts) — para esses,
// deixamos o useTranslation() cuidar e nao acionamos o Google por cima.
const CUSTOM_DICTIONARY_LOCALES = ["pt", "en", "es"];

function detectDeviceLanguage(): string {
  if (typeof navigator === "undefined") return "pt";
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const lang = String(raw || "").slice(0, 2).toLowerCase();
    if (lang) return lang;
  }
  return "pt";
}

function getGoogTransCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function setGoogTransCookie(targetLang: string) {
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

let widgetMounted = false;
/**
 * Sem botao visivel: detecta o idioma do dispositivo do cliente e, se for um
 * idioma fora do dicionario manual (pt/en/es), aciona a traducao automatica
 * do Google via cookie antes do widget inicializar.
 */
export function mountGoogleTranslate(containerId: string) {
  if (widgetMounted || typeof document === "undefined") return;
  if (document.getElementById("google-translate-script")) return;
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
    if (!window.google?.translate) return;
    new window.google.translate.TranslateElement(
      { pageLanguage: "pt", autoDisplay: false, layout: 0 },
      containerId,
    );
  };

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(script);
}

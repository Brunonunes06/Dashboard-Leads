// Carrega o SDK Mercado Pago.js V2 (Bricks) uma única vez e expõe uma
// instância pronta pra montar o Card Payment Brick. A Public Key é segura de
// expor no navegador (é feita pra isso, diferente do Access Token) — só o
// token gerado pelo Brick (nunca o número do cartão) chega no nosso backend.
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => any;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o SDK do Mercado Pago."));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function getMercadoPagoPublicKey(): string | undefined {
  return import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY as string | undefined;
}

let mpInstance: any = null;

export async function getMercadoPago() {
  const publicKey = getMercadoPagoPublicKey();
  if (!publicKey) return null;

  await loadSdk();
  if (!window.MercadoPago) return null;

  if (!mpInstance) {
    mpInstance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
  }
  return mpInstance;
}

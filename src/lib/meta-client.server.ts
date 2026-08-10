// Envio de WhatsApp/Instagram via Meta Graph API — twin em TypeScript de
// backend/meta-client.js + backend/instagram-client.js, pra uso dentro de
// server functions (createServerFn). Sufixo ".server.ts" garante que esse
// código com fetch pra Graph API nunca entra no bundle do navegador (mesma
// convenção de src/lib/rate-limit.server.ts).
const GRAPH_API = "https://graph.facebook.com/v21.0";

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

// profiles.phone é texto livre (ex: "(11) 91234-5678") — normaliza pro
// formato que a Meta exige: só dígitos, com DDI, sem "+". Assume Brasil
// quando o número não vem com código de país.
function normalizePhoneDigits(rawPhone: string | null | undefined): string | null {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 12 || digits.length === 13) return digits; // já com DDI 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`; // DDD + número
  return null;
}

function getWhatsappConfig() {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

async function postToGraph(path: string, accessToken: string, body: unknown): Promise<SendResult> {
  const response = await fetch(`${GRAPH_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}) as any);
  if (!response.ok) {
    return { ok: false, error: data.error?.message || "Erro ao enviar mensagem pela Meta." };
  }
  return { ok: true, id: data.messages?.[0]?.id ?? data.message_id };
}

// Texto livre — só entrega dentro da janela de 24h após a pessoa mandar
// mensagem pro número (regra da própria Meta/WhatsApp).
export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<SendResult> {
  const config = getWhatsappConfig();
  if (!config) {
    console.error("[Meta] META_WHATSAPP_ACCESS_TOKEN/META_WHATSAPP_PHONE_NUMBER_ID não configurados.");
    return { ok: false, error: "Meta WhatsApp não configurado." };
  }

  const to = normalizePhoneDigits(toPhone);
  if (!to) return { ok: false, error: "Telefone inválido." };

  return postToGraph(`${config.phoneNumberId}/messages`, config.accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

function getInstagramConfig() {
  const accessToken = process.env.META_INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!accessToken || !igAccountId) return null;
  return { accessToken, igAccountId };
}

// recipientId é o IGSID (ID do Instagram da pessoa, específico dessa conta —
// não é o @usuário nem um ID reaproveitável em outra conta/app).
export async function sendInstagramMessage(recipientId: string, text: string): Promise<SendResult> {
  const config = getInstagramConfig();
  if (!config) {
    console.error("[Instagram] META_INSTAGRAM_ACCESS_TOKEN/META_INSTAGRAM_ACCOUNT_ID não configurados.");
    return { ok: false, error: "Instagram não configurado." };
  }
  if (!recipientId) return { ok: false, error: "ID do destinatário do Instagram ausente." };

  return postToGraph(`${config.igAccountId}/messages`, config.accessToken, {
    recipient: { id: recipientId },
    message: { text },
  });
}

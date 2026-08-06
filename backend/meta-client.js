// Envio de WhatsApp via Meta Cloud API (WhatsApp Business Platform) —
// chamada direta à Graph API, sem SDK, mesmo padrão do resto do backend (ver
// payments-routes.js pro Mercado Pago).
const GRAPH_API = "https://graph.facebook.com/v21.0";

// profiles.phone é texto livre (ex: "(11) 91234-5678") — normaliza pro
// formato que a Meta exige: só dígitos, com DDI, sem "+". Assume Brasil
// quando o número não vem com código de país.
function normalizePhoneDigits(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 12 || digits.length === 13) return digits; // já com DDI 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`; // DDD + número
  return null;
}

function getConfig() {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

async function postMessage(config, body) {
  const response = await fetch(`${GRAPH_API}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: data.error?.message || "Erro ao enviar mensagem pela Meta." };
  }
  return { ok: true, id: data.messages?.[0]?.id };
}

// Texto livre — só entrega dentro da janela de 24h após a pessoa mandar
// mensagem pro número (regra da própria Meta/WhatsApp, vale pra qualquer
// provedor). Serve pra testar rápido, não pra cobrança automática de
// produção — use sendWhatsAppTemplate nesse caso.
async function sendWhatsAppMessage(toPhone, body) {
  const config = getConfig();
  if (!config) {
    console.error("[Meta] META_WHATSAPP_ACCESS_TOKEN/META_WHATSAPP_PHONE_NUMBER_ID não configurados.");
    return { ok: false, error: "Meta WhatsApp não configurado." };
  }

  const to = normalizePhoneDigits(toPhone);
  if (!to) return { ok: false, error: "Telefone inválido." };

  return postMessage(config, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

// Message Template — funciona fora da janela de 24h, exigido pra mensagem
// iniciada pela empresa (nosso caso: cobrança automática). O nome e os
// components precisam bater com o template criado no WhatsApp Manager (Meta
// Business Suite) — ver backend/bible-verses.js::getTemplateBodyDraft e
// buildTemplateComponents.
async function sendWhatsAppTemplate(toPhone, templateName, components, languageCode = "pt_BR") {
  const config = getConfig();
  if (!config) {
    console.error("[Meta] META_WHATSAPP_ACCESS_TOKEN/META_WHATSAPP_PHONE_NUMBER_ID não configurados.");
    return { ok: false, error: "Meta WhatsApp não configurado." };
  }
  if (!templateName) return { ok: false, error: "Nome do template não configurado." };

  const to = normalizePhoneDigits(toPhone);
  if (!to) return { ok: false, error: "Telefone inválido." };

  return postMessage(config, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

module.exports = { sendWhatsAppMessage, sendWhatsAppTemplate, normalizePhoneDigits };

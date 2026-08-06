// Envio de mensagem via Instagram Messaging API (Graph API da Meta) — mesmo
// padrão de backend/meta-client.js pro WhatsApp.
const GRAPH_API = "https://graph.facebook.com/v21.0";

function getConfig() {
  const accessToken = process.env.META_INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!accessToken || !igAccountId) return null;
  return { accessToken, igAccountId };
}

// recipientId é o IGSID (ID do Instagram da pessoa, específico dessa conta —
// não é o @usuário nem um ID reaproveitável em outra conta/app).
async function sendInstagramMessage(recipientId, text) {
  const config = getConfig();
  if (!config) {
    console.error("[Instagram] META_INSTAGRAM_ACCESS_TOKEN/META_INSTAGRAM_ACCOUNT_ID não configurados.");
    return { ok: false, error: "Instagram não configurado." };
  }
  if (!recipientId) return { ok: false, error: "ID do destinatário do Instagram ausente." };

  const response = await fetch(`${GRAPH_API}/${config.igAccountId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: data.error?.message || "Erro ao enviar mensagem pelo Instagram." };
  }
  return { ok: true, id: data.message_id };
}

module.exports = { sendInstagramMessage };

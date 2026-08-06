// Webhook único da Meta pra WhatsApp E Instagram (as duas plataformas
// notificam no mesmo formato de endpoint, só o campo "object" no corpo
// muda). Recebe mensagem nova → acha ou cria o lead → se ai_auto_reply
// estiver ligado pra esse lead, gera resposta com a IA (backend/ai-bot.js) e
// manda de volta pelo canal certo (backend/meta-client.js pro WhatsApp,
// backend/instagram-client.js pro Instagram).
//
// Isso é o que falta pra virar um bot de verdade, rodando 24h no servidor —
// diferente do modo atual descrito em supabase/011_ai_auto_reply.sql, que só
// funciona com um admin de chat aberto no navegador.
const { Router } = require("express");
const crypto = require("crypto");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { getServiceClient } = require("./supabase-admin");
const { sendWhatsAppMessage } = require("./meta-client");
const { sendInstagramMessage } = require("./instagram-client");
const { generateReply } = require("./ai-bot");

const router = Router();

// Verificação de assinatura (a "porta de entrada" de verdade — a etapa GET
// abaixo só acontece uma vez, na hora de configurar o webhook no painel da
// Meta). Sem META_APP_SECRET configurada, qualquer POST forjado faria o bot
// responder em nome da empresa pra quem quisesse.
function verifySignature(req) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.warn("[Webhook Meta] META_APP_SECRET não configurada — pulando verificação de assinatura.");
    return true;
  }

  const signatureHeader = req.headers["x-hub-signature-256"];
  if (!signatureHeader || !req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signatureHeader)));
  } catch {
    return false;
  }
}

// A Meta chama isso uma única vez, na hora de você configurar o webhook no
// painel do app — precisa devolver exatamente o hub.challenge (texto puro)
// se o verify_token bater com o que você mesmo escolheu e configurou nos
// dois lugares (aqui no .env e no painel da Meta).
router.get("/api/webhooks/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function getBotSettings(supabase) {
  const { data } = await supabase.from("bot_settings").select("settings").eq("id", true).maybeSingle();
  const settings = data?.settings || {};
  return {
    botEnabled: settings.botEnabled !== false,
    aiName: settings.aiName || "",
    aiBrand: settings.aiBrand || "",
    aiTone: settings.aiTone || "",
  };
}

async function findOrCreateLead(supabase, { channel, phone, instagramId, name }) {
  const selectCols = "id, name, phone, ai_auto_reply";
  const { data: existing } =
    channel === "whatsapp"
      ? await supabase.from("leads").select(selectCols).eq("phone", phone).maybeSingle()
      : await supabase.from("leads").select(selectCols).eq("instagram_id", instagramId).maybeSingle();

  if (existing) return existing;

  // user_id fica NULL de propósito — só o admin vê leads sem dono
  // atribuído (comportamento já documentado em
  // supabase/010_multitenant_leads.sql). Rotear pro dono certo automaticamente
  // exigiria mapear qual número/conta pertence a qual cliente pagante desse
  // SaaS, o que ainda não existe.
  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      name: name || (channel === "whatsapp" ? phone : "Lead do Instagram"),
      phone: channel === "whatsapp" ? phone : null,
      instagram_id: channel === "instagram" ? instagramId : null,
      channel,
      status: "novo",
      score: 0,
    })
    .select("id, name, phone, ai_auto_reply")
    .single();

  if (error) {
    console.error("[Webhook Meta] Erro ao criar lead:", error.message);
    return null;
  }
  return created;
}

async function insertMessage(supabase, { leadId, senderId, senderRole, content }) {
  const { error } = await supabase.from("messages").insert({
    lead_id: leadId,
    sender_id: senderId,
    sender_role: senderRole,
    content,
  });
  if (error) console.error("[Webhook Meta] Erro ao salvar mensagem:", error.message);
}

async function maybeAutoReply(supabase, { lead, channel, recipient }) {
  if (!lead.ai_auto_reply) return;

  const botSettings = await getBotSettings(supabase);
  if (!botSettings.botEnabled) return;

  const { data: history } = await supabase
    .from("messages")
    .select("sender_role, content")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const result = await generateReply({
    aiName: botSettings.aiName,
    aiBrand: botSettings.aiBrand,
    aiTone: botSettings.aiTone,
    leadName: lead.name,
    leadPhone: lead.phone,
    history: history || [],
  });

  if (!result.ok || !result.text) {
    if (!result.ok) console.error("[Bot] Falha ao gerar resposta automática:", result.error);
    return;
  }

  const sendResult =
    channel === "whatsapp" ? await sendWhatsAppMessage(recipient, result.text) : await sendInstagramMessage(recipient, result.text);

  if (!sendResult.ok) {
    console.error(`[Bot] Falha ao enviar resposta automática (${channel}):`, sendResult.error);
    return;
  }

  await insertMessage(supabase, { leadId: lead.id, senderId: "bot", senderRole: "admin", content: result.text });

  if (result.handoff) {
    await supabase.from("leads").update({ status: "transferido" }).eq("id", lead.id);
  }
}

async function handleWhatsappEvent(supabase, body) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        if (msg.type !== "text" || !msg.text?.body) continue; // outros tipos (imagem, áudio) ficam de fora por enquanto

        const phone = msg.from;
        const contactName = value.contacts?.find((c) => c.wa_id === phone)?.profile?.name;

        const lead = await findOrCreateLead(supabase, { channel: "whatsapp", phone, name: contactName });
        if (!lead) continue;

        await insertMessage(supabase, { leadId: lead.id, senderId: phone, senderRole: "client", content: msg.text.body });
        await maybeAutoReply(supabase, { lead, channel: "whatsapp", recipient: phone });
      }
    }
  }
}

async function handleInstagramEvent(supabase, body) {
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text || event.message.is_echo) continue; // is_echo = mensagem que a própria página mandou, ignora

      const igsid = event.sender?.id;
      if (!igsid) continue;

      const lead = await findOrCreateLead(supabase, { channel: "instagram", instagramId: igsid });
      if (!lead) continue;

      await insertMessage(supabase, { leadId: lead.id, senderId: igsid, senderRole: "client", content: event.message.text });
      await maybeAutoReply(supabase, { lead, channel: "instagram", recipient: igsid });
    }
  }
}

router.post("/api/webhooks/meta", async (req, res) => {
  // A Meta espera 200 rápido (poucos segundos) e reenvia se não receber —
  // responde na hora e processa depois, igual ao webhook do Mercado Pago
  // (backend/payments-routes.js).
  res.status(200).send("EVENT_RECEIVED");

  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "webhooks.meta", { windowMs: 60_000, max: 240 });
    if (!rateLimit.allowed) {
      console.warn("[Webhook Meta] Rate limit excedido, ignorando notificação de", ip);
      return;
    }

    if (!verifySignature(req)) {
      console.warn("[Webhook Meta] Assinatura inválida, ignorando notificação.");
      return;
    }

    const supabase = getServiceClient();
    if (!supabase) {
      console.error("[Webhook Meta] SUPABASE_SERVICE_ROLE_KEY não configurada — não foi possível processar.");
      return;
    }

    const body = req.body || {};
    if (body.object === "whatsapp_business_account") {
      await handleWhatsappEvent(supabase, body);
    } else if (body.object === "instagram") {
      await handleInstagramEvent(supabase, body);
    }
  } catch (error) {
    console.error("[Webhook Meta] Erro ao processar notificação:", error);
  }
});

module.exports = router;

const { Router } = require("express");
const crypto = require("crypto");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { getServiceClient } = require("./supabase-admin");
const { verifySupabaseAccessToken } = require("./verify-supabase-token");

const router = Router();
const MP_API = "https://api.mercadopago.com";

// "semanal" é o plano grátis (7 dias) — tratado 100% no frontend, sem cobrança.
// Só mensal/anual passam por aqui.
const PLANS = {
  mensal: { description: "Plano mensal TEAM WOLF", amount: 299.99, frequencyMonths: 1 },
  anual: { description: "Plano anual TEAM WOLF", amount: 1600, frequencyMonths: 12 },
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function mpPost(path, body, idempotencyKeyPrefix) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, data: { message: "MERCADO_PAGO_ACCESS_TOKEN não configurado." } };
  }
  const response = await fetch(`${MP_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKeyPrefix
        ? { "X-Idempotency-Key": `${idempotencyKeyPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}` }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

async function mpGet(path) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return { ok: false, data: {} };
  const response = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

// Todas as rotas de criação de pagamento exigem sessão válida — o plano fica
// atrelado ao user_id de verdade (nunca confiamos em quem o cliente afirma
// ser), consistente com o que já é feito em server-ai-routes.js/lgpd-routes.js.
async function requireUser(req, res) {
  const user = await verifySupabaseAccessToken(req.body.accessToken);
  if (!user) {
    res.status(401).json({ success: false, error: "Sessão inválida ou expirada. Faça login novamente." });
    return null;
  }
  return user;
}

// Registra a tentativa de pagamento como 'pending' — só o webhook (mais
// abaixo) promove pra 'active' depois de confirmar de verdade com o Mercado
// Pago. src/routes/profile.tsx só mostra a tag do plano quando status='active'.
async function recordSubscription({ userId, plan, method, status, mpPaymentId, mpPreapprovalId }) {
  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[Pagamentos] SUPABASE_SERVICE_ROLE_KEY não configurada — assinatura não registrada.");
    return;
  }
  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan,
    method,
    status,
    mp_payment_id: mpPaymentId ?? null,
    mp_preapproval_id: mpPreapprovalId ?? null,
    started_at: status === "active" ? new Date().toISOString() : null,
  });
  if (error) console.error("[Pagamentos] Erro ao registrar assinatura:", error.message);
}

// ============================================================
// Pix
// ============================================================
router.post("/api/payments/pix", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "payments.pix", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return res.status(429).json({ success: false, error: rateLimit.message });

    const user = await requireUser(req, res);
    if (!user) return;

    const plan = PLANS[req.body.plan];
    if (!plan) return res.status(400).json({ success: false, error: "Plano inválido." });

    const payerEmail = normalizeEmail(req.body.email) || user.email || "cliente@teamwolf.local";
    const { ok, data } = await mpPost(
      "/v1/payments",
      {
        transaction_amount: plan.amount,
        description: plan.description,
        payment_method_id: "pix",
        payer: { email: payerEmail },
      },
      req.body.plan,
    );

    if (!ok) {
      return res
        .status(200)
        .json({ success: false, error: data.message || "Erro ao criar pagamento Pix no Mercado Pago." });
    }

    await recordSubscription({
      userId: user.id,
      plan: req.body.plan,
      method: "pix",
      status: "pending",
      mpPaymentId: data.id ? String(data.id) : null,
    });

    return res.json({
      success: true,
      qrCode: data.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    });
  } catch (error) {
    console.error("[Mercado Pago] Erro ao criar Pix:", error);
    return res.status(200).json({ success: false, error: "Erro ao conectar com o Mercado Pago." });
  }
});

// ============================================================
// Cartão de crédito (à vista) — "token" vem do Payment Brick no navegador,
// o número do cartão nunca passa pelo nosso servidor.
// ============================================================
router.post("/api/payments/card", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "payments.card", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return res.status(429).json({ success: false, error: rateLimit.message });

    const user = await requireUser(req, res);
    if (!user) return;

    const plan = PLANS[req.body.plan];
    const { token, installments, paymentMethodId, issuerId, identificationType, identificationNumber } = req.body;
    if (!plan) return res.status(400).json({ success: false, error: "Plano inválido." });
    if (!token || !paymentMethodId) {
      return res.status(400).json({ success: false, error: "Dados do cartão incompletos." });
    }

    const payerEmail = normalizeEmail(req.body.email) || user.email || "cliente@teamwolf.local";
    // O Card Brick, pra pagadores no Brasil, sempre coleta o CPF junto do
    // cartão — sem repassar isso no payer.identification, o Mercado Pago
    // recusa a cobrança com um "internal_error" genérico (regra fiscal
    // brasileira, não é específico de boleto).
    const { ok, data } = await mpPost(
      "/v1/payments",
      {
        transaction_amount: plan.amount,
        description: plan.description,
        token,
        installments: Number(installments) || 1,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        payer: {
          email: payerEmail,
          ...(identificationType && identificationNumber
            ? { identification: { type: identificationType, number: identificationNumber } }
            : {}),
        },
      },
      req.body.plan,
    );

    if (!ok) {
      console.error("[Mercado Pago] Pagamento no cartão recusado:", JSON.stringify(data));
      return res.status(200).json({ success: false, error: data.message || "Erro ao processar pagamento no cartão." });
    }

    const status = data.status === "approved" ? "active" : data.status === "rejected" ? "rejected" : "pending";
    await recordSubscription({
      userId: user.id,
      plan: req.body.plan,
      method: "card",
      status,
      mpPaymentId: data.id ? String(data.id) : null,
    });

    return res.json({ success: true, status: data.status, statusDetail: data.status_detail });
  } catch (error) {
    console.error("[Mercado Pago] Erro ao criar pagamento no cartão:", error);
    return res.status(200).json({ success: false, error: "Erro ao conectar com o Mercado Pago." });
  }
});

// ============================================================
// Boleto bancário
// ============================================================
router.post("/api/payments/boleto", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "payments.boleto", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return res.status(429).json({ success: false, error: rateLimit.message });

    const user = await requireUser(req, res);
    if (!user) return;

    const plan = PLANS[req.body.plan];
    const { cpf, firstName, lastName, zipCode, streetName, streetNumber, neighborhood, city, federalUnit } = req.body;
    if (!plan) return res.status(400).json({ success: false, error: "Plano inválido." });
    if (!cpf || !firstName || !zipCode || !streetName || !streetNumber || !city || !federalUnit) {
      return res
        .status(400)
        .json({ success: false, error: "CPF, nome e endereço completo são obrigatórios para gerar o boleto." });
    }

    const payerEmail = normalizeEmail(req.body.email) || user.email || "cliente@teamwolf.local";
    // Boleto no Brasil ("bolbradesco") exige o endereço completo do pagador
    // além do CPF — sem isso o Mercado Pago recusa com "insufficient_data",
    // mesmo respondendo HTTP 201 (por isso checamos data.status abaixo, não
    // só o "ok" da requisição).
    const { ok, data } = await mpPost(
      "/v1/payments",
      {
        transaction_amount: plan.amount,
        description: plan.description,
        payment_method_id: "bolbradesco",
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName || "",
          identification: { type: "CPF", number: String(cpf).replace(/\D/g, "") },
          address: {
            zip_code: String(zipCode).replace(/\D/g, ""),
            street_name: streetName,
            street_number: streetNumber,
            neighborhood,
            city,
            federal_unit: federalUnit,
          },
        },
      },
      req.body.plan,
    );

    if (!ok || data.status === "rejected") {
      await recordSubscription({
        userId: user.id,
        plan: req.body.plan,
        method: "boleto",
        status: "rejected",
        mpPaymentId: data.id ? String(data.id) : null,
      });
      return res.status(200).json({
        success: false,
        error: data.message || `Boleto recusado pelo Mercado Pago (${data.status_detail || "dados inválidos"}).`,
      });
    }

    await recordSubscription({
      userId: user.id,
      plan: req.body.plan,
      method: "boleto",
      status: "pending",
      mpPaymentId: data.id ? String(data.id) : null,
    });

    return res.json({
      success: true,
      boletoUrl: data.transaction_details?.external_resource_url,
      barcode: data.barcode?.content,
    });
  } catch (error) {
    console.error("[Mercado Pago] Erro ao gerar boleto:", error);
    return res.status(200).json({ success: false, error: "Erro ao conectar com o Mercado Pago." });
  }
});

// ============================================================
// Assinatura recorrente no cartão (Preapproval) — cobrança automática a
// cada frequencyMonths, sem o cliente precisar voltar aqui pra pagar de novo.
// ============================================================
router.post("/api/payments/subscription", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "payments.subscription", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return res.status(429).json({ success: false, error: rateLimit.message });

    const user = await requireUser(req, res);
    if (!user) return;

    const plan = PLANS[req.body.plan];
    const { token } = req.body;
    if (!plan) return res.status(400).json({ success: false, error: "Plano inválido." });
    if (!token) return res.status(400).json({ success: false, error: "Token do cartão é obrigatório." });

    const payerEmail = normalizeEmail(req.body.email) || user.email || "cliente@teamwolf.local";
    const { ok, data } = await mpPost(
      "/preapproval",
      {
        reason: `Assinatura recorrente — ${plan.description}`,
        external_reference: `${user.id}:${req.body.plan}`,
        payer_email: payerEmail,
        card_token_id: token,
        auto_recurring: {
          frequency: plan.frequencyMonths,
          frequency_type: "months",
          transaction_amount: plan.amount,
          currency_id: "BRL",
        },
        back_url: req.body.backUrl || "https://teamwolf.local/plans",
        status: "authorized",
      },
      req.body.plan,
    );

    if (!ok) {
      return res.status(200).json({ success: false, error: data.message || "Erro ao criar assinatura recorrente." });
    }

    const status = data.status === "authorized" ? "active" : "pending";
    await recordSubscription({
      userId: user.id,
      plan: req.body.plan,
      method: "card_recurring",
      status,
      mpPreapprovalId: data.id ? String(data.id) : null,
    });

    return res.json({ success: true, status: data.status });
  } catch (error) {
    console.error("[Mercado Pago] Erro ao criar assinatura recorrente:", error);
    return res.status(200).json({ success: false, error: "Erro ao conectar com o Mercado Pago." });
  }
});

// ============================================================
// Webhook — Mercado Pago notifica mudança de status aqui. NUNCA confiamos no
// corpo da notificação por si só (qualquer um pode forjar um POST): sempre
// rebuscamos o pagamento/assinatura direto na API do Mercado Pago usando o
// nosso Access Token antes de gravar qualquer coisa. A verificação de
// assinatura (x-signature) abaixo é uma camada extra, não a única defesa.
// ============================================================
function verifyWebhookSignature(req) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Webhook] MERCADO_PAGO_WEBHOOK_SECRET não configurada — pulando verificação de assinatura (a rebusca do pagamento pela API continua protegendo contra notificação forjada).");
    return true;
  }

  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = req.body?.data?.id || req.query["data.id"];
  if (!signatureHeader || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    String(signatureHeader)
      .split(",")
      .map((p) => p.trim().split("="))
      .filter((pair) => pair.length === 2),
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(parts.v1, "hex"));
  } catch {
    return false;
  }
}

router.post("/api/payments/webhook", async (req, res) => {
  // Responde 200 na hora pro Mercado Pago não ficar reenviando a mesma
  // notificação — o processamento de verdade continua depois, assíncrono.
  res.status(200).json({ received: true });

  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "payments.webhook", { windowMs: 60_000, max: 120 });
    if (!rateLimit.allowed) {
      console.warn("[Webhook] Rate limit excedido, ignorando notificação de", ip);
      return;
    }

    if (!verifyWebhookSignature(req)) {
      console.warn("[Webhook] Assinatura inválida, ignorando notificação.");
      return;
    }

    const type = req.body?.type || req.query.type;
    const dataId = req.body?.data?.id || req.query["data.id"];
    if (!dataId) return;

    const supabase = getServiceClient();
    if (!supabase) {
      console.error("[Webhook] SUPABASE_SERVICE_ROLE_KEY não configurada — não foi possível atualizar a assinatura.");
      return;
    }

    if (type === "payment") {
      const { ok, data } = await mpGet(`/v1/payments/${dataId}`);
      if (!ok) return;
      const newStatus = data.status === "approved" ? "active" : data.status === "rejected" ? "rejected" : "pending";
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: newStatus,
          started_at: newStatus === "active" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("mp_payment_id", String(dataId));
      if (error) console.error("[Webhook] Erro ao atualizar pagamento:", error.message);
    } else if (type === "preapproval" || type === "subscription_preapproval") {
      const { ok, data } = await mpGet(`/preapproval/${dataId}`);
      if (!ok) return;
      const newStatus = data.status === "authorized" ? "active" : data.status === "cancelled" ? "canceled" : "pending";
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: newStatus,
          started_at: newStatus === "active" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("mp_preapproval_id", String(dataId));
      if (error) console.error("[Webhook] Erro ao atualizar assinatura recorrente:", error.message);
    }
  } catch (error) {
    console.error("[Webhook] Erro ao processar notificação:", error);
  }
});

module.exports = router;

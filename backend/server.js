const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const USER_IP_STORE_FILE = path.join(__dirname, "data", "user-ip-accounts.json");

const MERCADO_PAGO_PLANS = {
  mensal: {
    description: "Plano mensal TEAM WOLF",
    transaction_amount: 300,
  },
  anual: {
    description: "Plano anual TEAM WOLF",
    transaction_amount: 1600,
  },
};

const dbLeads = {};

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.get("/", (req, res) => {
  return res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background: #0f172a; color: #f8fafc; padding: 40px; min-height: 100vh;">
      <h1 style="color: #10B981;">🚀 Servidor de CRM Ativo!</h1>
      <p style="color: #94a3b8;">Pronto para receber dados.</p>
    </div>
  `);
});

app.get("/api/leads", (req, res) => {
  return res.json(Object.values(dbLeads));
});

app.post("/api/webhook", (req, res) => {
  try {
    const { id, status, ultimaMensagem } = req.body;

    if (!id) {
      return res.status(400).json({ error: "O campo 'id' é obrigatório." });
    }

    dbLeads[id] = {
      id: id,
      status: status || "Novo Lead",
      ultimaMensagem: ultimaMensagem || "Nenhum histórico registrado.",
    };

    console.log(`[CRM] Lead processado - ID: ${id}`);
    return res.status(200).json({ success: true, message: "Lead processado com sucesso." });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(USER_IP_STORE_FILE), { recursive: true });
}

function readUserIpStore() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(USER_IP_STORE_FILE)) return { ips: {} };
    return JSON.parse(fs.readFileSync(USER_IP_STORE_FILE, "utf8"));
  } catch (error) {
    console.error("[Auth] Erro ao ler limitador de IP:", error);
    return { ips: {} };
  }
}

function writeUserIpStore(store) {
  ensureStoreDir();
  fs.writeFileSync(USER_IP_STORE_FILE, JSON.stringify(store, null, 2));
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.ip || "";
  return (
    String(rawIp)
      .split(",")[0]
      .trim()
      .replace(/^::ffff:/, "") || "unknown"
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

app.post("/api/auth/ip-account", (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();

    if (!email) {
      return res.status(400).json({ error: "E-mail da conta e obrigatorio." });
    }

    const ip = getClientIp(req);
    const store = readUserIpStore();
    const existing = store.ips[ip];

    if (existing && existing.email !== email) {
      return res.status(409).json({
        error: "Este IP ja possui uma conta cadastrada.",
        code: "IP_ACCOUNT_LIMIT_REACHED",
      });
    }

    store.ips[ip] = {
      email,
      name: name || (existing && existing.name) || "",
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    writeUserIpStore(store);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Auth] Erro no limitador de IP:", error);
    return res.status(500).json({ error: "Erro ao validar limite de conta por IP." });
  }
});

app.post("/api/payments/pix", async (req, res) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const plan = MERCADO_PAGO_PLANS[req.body.plan];
    const payerEmail = normalizeEmail(req.body.email) || "cliente@teamwolf.local";

    if (!plan) {
      return res.status(400).json({ error: "Plano invalido." });
    }

    if (!accessToken) {
      return res.status(500).json({
        error: "Configure MERCADO_PAGO_ACCESS_TOKEN no servidor.",
        code: "MERCADO_PAGO_TOKEN_MISSING",
      });
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${req.body.plan}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      body: JSON.stringify({
        transaction_amount: plan.transaction_amount,
        description: plan.description,
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Erro ao criar pagamento Pix no Mercado Pago.",
        details: data,
      });
    }

    return res.json({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
    });
  } catch (error) {
    console.error("[Mercado Pago] Erro ao criar Pix:", error);
    return res.status(500).json({ error: "Erro interno ao criar Pix." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});

// ============================================================
// PASSO 7: Adicione estas rotas ao seu server.js existente
// ============================================================
// Cole este código DENTRO do seu server.js, antes do app.listen()
// ============================================================

// ⚠️ Instale o Stripe no servidor:
// npm install stripe
// ou: bun add stripe

// const Stripe = require('stripe');
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Banco de tokens em memória (use seu banco real / Supabase aqui)
const dbTokens = {};

// POST /api/billing/subscribe
// Recebe o paymentMethodId do frontend e cria a assinatura
app.post("/api/billing/subscribe", async (req, res) => {
  try {
    const { paymentMethodId, userId, email } = req.body;

    if (!paymentMethodId || !userId) {
      return res.status(400).json({ error: "paymentMethodId e userId são obrigatórios." });
    }

    // ─── INTEGRAÇÃO STRIPE REAL (descomente após configurar) ───
    // // 1. Criar ou buscar customer no Stripe
    // const customers = await stripe.customers.list({ email, limit: 1 });
    // let customer = customers.data[0];
    // if (!customer) {
    //   customer = await stripe.customers.create({ email, metadata: { userId } });
    // }
    //
    // // 2. Anexar o cartão ao customer
    // await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    // await stripe.customers.update(customer.id, {
    //   invoice_settings: { default_payment_method: paymentMethodId },
    // });
    //
    // // 3. Criar a assinatura
    // const subscription = await stripe.subscriptions.create({
    //   customer: customer.id,
    //   items: [{ price: process.env.STRIPE_PRICE_ID }], // ID do plano no Stripe
    //   expand: ['latest_invoice.payment_intent'],
    // });
    //
    // // 4. Salvar token no banco
    // const token = subscription.id;
    // ─────────────────────────────────────────────────────────

    // MOCK para desenvolvimento (remova em produção):
    const token = `sub_mock_${userId}_${Date.now()}`;

    dbTokens[userId] = {
      token,
      paymentMethodId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    console.log(`[Billing] Assinatura criada para userId: ${userId}`);
    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("[Billing] Erro:", error);
    return res.status(500).json({ error: "Erro ao processar pagamento." });
  }
});

// GET /api/billing/verify/:userId
// Verifica se o token do usuário ainda é válido
app.get("/api/billing/verify/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const record = dbTokens[userId];

    if (!record || !record.active) {
      return res.json({ valid: false });
    }

    // ─── VERIFICAÇÃO STRIPE REAL ───
    // const subscription = await stripe.subscriptions.retrieve(record.token);
    // const valid = subscription.status === 'active' || subscription.status === 'trialing';
    // return res.json({ valid, status: subscription.status });
    // ──────────────────────────────

    return res.json({ valid: true, token: record.token });
  } catch (error) {
    console.error("[Billing] Erro na verificação:", error);
    return res.status(500).json({ error: "Erro ao verificar assinatura." });
  }
});

// POST /api/billing/cancel/:userId
app.post("/api/billing/cancel/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (dbTokens[userId]) {
      dbTokens[userId].active = false;
      // Stripe: await stripe.subscriptions.cancel(dbTokens[userId].token);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar assinatura." });
  }
});

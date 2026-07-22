const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const aiRoutes = require("./server-ai-routes");

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

// Restringe CORS a origens conhecidas quando CORS_ORIGIN estiver configurado
// no .env (lista separada por vírgula). Sem essa variável, mantém aberto por
// padrão para não quebrar deploys existentes (ex: túneis ngrok) — mas isso
// deve ser configurado em produção.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    "[CORS] CORS_ORIGIN não configurado no .env — aceitando requisições de qualquer origem. " +
      "Defina CORS_ORIGIN=https://seu-dominio.com em produção.",
  );
}

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error("Origem não permitida por CORS."));
          },
        }
      : undefined,
  ),
);
app.use(express.json());
app.set("trust proxy", true);

// Rate limit simples em memoria (sem dependencia externa) pra endpoints caros
// ou sensiveis a abuso (gerar Pix, checar/gravar conta por IP, chamar a
// OpenAI). Nao substitui um rate limiter distribuido de verdade em producao
// com varias instancias, mas fecha a porta de "gastar sua cota so batendo no
// endpoint em loop" sem precisar adicionar uma dependencia nova.
const rateLimitHits = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.path}:${getClientIp(req)}`;
    const now = Date.now();
    const entry = rateLimitHits.get(key);

    if (!entry || now - entry.start > windowMs) {
      rateLimitHits.set(key, { start: now, count: 1 });
      return next();
    }

    if (entry.count >= max) {
      return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    }

    entry.count += 1;
    return next();
  };
}
// Limpeza periódica pra não deixar o Map crescer pra sempre.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitHits) {
      if (now - entry.start > 10 * 60 * 1000) rateLimitHits.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(aiRoutes);

app.get("/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(`window.__SUPABASE_CONFIG__ = ${JSON.stringify({
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  })};`);
});

app.get("/", (req, res) => {
  return res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background: #0f172a; color: #f8fafc; padding: 40px; min-height: 100vh;">
      <h1 style="color: #10B981;">🚀 Servidor de CRM Ativo!</h1>
      <p style="color: #94a3b8;">Pronto para receber dados.</p>
    </div>
  `);
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

function isPrivateOrLocalIp(ip) {
  if (!ip || ip === "unknown") return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

// Usa a API publica do proxycheck.io (sem chave, limite baixo) para detectar VPN/proxy.
// Em caso de falha ou indisponibilidade do servico, nao bloqueia o login (fail-open).
async function isVpnOrProxyIp(ip) {
  if (isPrivateOrLocalIp(ip)) return false;

  try {
    const apiKey = process.env.PROXYCHECK_API_KEY;
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=0${keyParam}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;

    const data = await response.json();
    const info = data && data[ip];
    return Boolean(info && info.proxy === "yes");
  } catch (error) {
    console.error("[Auth] Erro ao consultar proxycheck.io:", error.message);
    return false;
  }
}

app.post("/api/auth/ip-account", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();

    if (!email) {
      return res.status(400).json({ error: "E-mail da conta e obrigatorio." });
    }

    const ip = getClientIp(req);

    if (await isVpnOrProxyIp(ip)) {
      return res.status(403).json({
        error: "Desligue a VPN para acessar o site.",
        code: "VPN_DETECTED",
      });
    }

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

app.post("/api/payments/pix", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
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
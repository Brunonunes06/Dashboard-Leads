const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const aiRoutes = require("./server-ai-routes");
const recaptchaRoutes = require("./recaptcha-routes");
const lgpdRoutes = require("./lgpd-routes");
const emailRoutes = require("./email-routes");
const paymentsRoutes = require("./payments-routes");
const { securityHeaders } = require("./security-headers");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { getServiceClient } = require("./supabase-admin");
const { verifyGoogleIdToken } = require("./verify-google-token");
const { schedulePaymentReminders, scheduleTestPlanCheck } = require("./payment-reminders-cron");
const metaWebhookRoutes = require("./meta-webhook-routes");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "../public");

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
// "verify" guarda o corpo bruto da requisição em req.rawBody antes do parse
// — necessário pro webhook da Meta (backend/meta-webhook-routes.js) conferir
// a assinatura HMAC, que é calculada sobre os bytes exatos recebidos, não
// sobre o objeto já reserializado.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.set("trust proxy", true);
app.use(securityHeaders);

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(aiRoutes);
app.use(recaptchaRoutes);
app.use(lgpdRoutes);
app.use(emailRoutes);
app.use(paymentsRoutes);
app.use(metaWebhookRoutes);

// Config pública injetada em toda página estática via <script src="/config.js">.
// Só valores seguros pro navegador — nunca chaves de serviço/segredos aqui.
app.get("/config.js", (req, res) => {
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  res.type("application/javascript");
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY || "",
    adminEmails,
  })};`);
});

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// IP_ACCOUNT_GUARD_EXEMPT_IPS no .env: lista de IPs separados por vírgula
// que ficam de fora do limite de "1 conta por IP" — mesma lógica de
// src/lib/ip-guard.server.ts, mantida em sincronia aqui.
function isExemptIp(ip) {
  const exempt = (process.env.IP_ACCOUNT_GUARD_EXEMPT_IPS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return exempt.includes(ip);
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

// Limite de "uma conta por IP" — usa a tabela real do Supabase
// (ip_account_guard, supabase/002_ip_account_guard.sql) em vez de um arquivo
// JSON local, pra sobreviver a redeploys e não divergir do que o resto do
// app (src/lib/ip-guard.server.ts) considera "bloqueado". Se a service role
// key não estiver configurada, falha aberto (não bloqueia ninguém) e loga o
// motivo — nunca deixa o site inacessível por falta de config opcional.
app.post("/api/auth/ip-account", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "ip-account", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: rateLimit.message });
    }

    const verified = await verifyGoogleIdToken(req.body.idToken);
    if (!verified) {
      return res.status(401).json({
        error: "Não foi possível verificar sua conta Google. Tente fazer login novamente.",
        code: "INVALID_CREDENTIAL",
      });
    }
    const email = normalizeEmail(verified.email);
    const name = verified.name;

    if (isExemptIp(ip)) return res.status(200).json({ success: true });

    if (await isVpnOrProxyIp(ip)) {
      return res.status(403).json({
        error: "Desligue a VPN para acessar o site.",
        code: "VPN_DETECTED",
      });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      console.error(
        "[Auth] SUPABASE_SERVICE_ROLE_KEY nao configurada — limite de conta por IP desativado (fail-open).",
      );
      return res.status(200).json({ success: true });
    }

    const { data: existing, error: readError } = await supabase
      .from("ip_account_guard")
      .select("email, name, created_at")
      .eq("ip", ip)
      .maybeSingle();

    if (readError) {
      console.error("[Auth] Erro ao ler limitador de IP:", readError.message);
      return res.status(200).json({ success: true });
    }

    if (existing && existing.email !== email) {
      return res.status(409).json({
        error: "Este IP ja possui uma conta cadastrada.",
        code: "IP_ACCOUNT_LIMIT_REACHED",
      });
    }

    const { error: writeError } = await supabase.from("ip_account_guard").upsert({
      ip,
      email,
      name: name || existing?.name || "",
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (writeError) {
      console.error("[Auth] Erro ao gravar limitador de IP:", writeError.message);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Auth] Erro no limitador de IP:", error);
    return res.status(500).json({ error: "Erro ao validar limite de conta por IP." });
  }
});

// Serve as páginas estáticas em public/ (index.html, plans.html, leads/chat.html
// etc.) — depois das rotas de API acima, pra /api/* e /config.js sempre
// ganharem de um arquivo estático com o mesmo nome.
app.use(express.static(PUBLIC_DIR));

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
  schedulePaymentReminders();
  scheduleTestPlanCheck();
});

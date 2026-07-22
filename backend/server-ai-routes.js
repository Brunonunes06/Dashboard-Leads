const { Router } = require("express");
const OpenAI = require("openai");

const router = Router();
let openai = null;

const ALLOWED_MODELS = new Set(["gpt-5.4-mini", "gpt-5-search-api"]);

// Rate limit simples em memoria — cada chamada custa dinheiro na OpenAI, entao
// nao pode ficar sem nenhum limite so porque ja exige login.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > 60_000) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  if (entry.count >= 15) return true;
  entry.count += 1;
  return false;
}
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now - entry.start > 10 * 60 * 1000) hits.delete(ip);
    }
  },
  5 * 60 * 1000,
).unref();

// Verifica o access token do Supabase direto com o Supabase (GET /auth/v1/user)
// em vez de confiar em qualquer coisa que o cliente afirme no corpo da
// requisicao — mesma logica de src/lib/verify-supabase-token.server.ts.
async function verifySupabaseAccessToken(accessToken) {
  if (!accessToken) return null;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json().catch(() => null);
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

// POST /api/ai-reply
// Recebe { model, input, accessToken } e repassa pra Responses API da OpenAI,
// devolvendo { output_text } pro frontend (leads.html). Exige um access token
// valido do Supabase — sem isso, qualquer um poderia gastar a cota da OpenAI.
router.post("/api/ai-reply", async (req, res) => {
  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.ip || "unknown")
      .split(",")[0]
      .trim();
    if (rateLimited(ip)) {
      return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    }

    const { model, input, accessToken } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Configure OPENAI_API_KEY no .env do backend.",
        code: "OPENAI_KEY_MISSING",
      });
    }

    if (!input) {
      return res.status(400).json({ error: "O campo 'input' é obrigatório." });
    }

    const user = await verifySupabaseAccessToken(accessToken);
    if (!user) {
      return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
    }

    const safeModel = model && ALLOWED_MODELS.has(model) ? model : "gpt-5.4-mini";

    // Instanciado sob demanda: o construtor do SDK lança se a chave não existir,
    // o que derrubaria o processo inteiro se fosse feito no carregamento do módulo.
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: safeModel,
      input,
      store: true,
    });

    return res.json({ output_text: response.output_text });
  } catch (error) {
    console.error("[IA] Erro ao chamar OpenAI:", error);
    return res.status(500).json({ error: error.message || "Erro ao gerar resposta." });
  }
});

module.exports = router;

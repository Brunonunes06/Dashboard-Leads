const { Router } = require("express");
const OpenAI = require("openai");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { verifySupabaseAccessToken } = require("./verify-supabase-token");

const router = Router();
let openai = null;

const ALLOWED_MODELS = new Set(["gpt-5.4-mini", "gpt-5-search-api"]);

// POST /api/ai-reply
// Recebe { model, input, accessToken } e repassa pra Responses API da OpenAI,
// devolvendo { output_text } pro frontend (leads.html). Exige um access token
// valido do Supabase — sem isso, qualquer um poderia gastar a cota da OpenAI.
router.post("/api/ai-reply", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, "ai-reply", { windowMs: 60_000, max: 15 });
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: rateLimit.message });
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

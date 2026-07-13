const { Router } = require("express");
const OpenAI = require("openai");

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai-reply
// Recebe { model, input } e repassa pra Responses API da OpenAI,
// devolvendo { output_text } pro frontend (leads.html / useAIReply.ts).
router.post("/api/ai-reply", async (req, res) => {
  try {
    const { model, input } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Configure OPENAI_API_KEY no .env do backend.",
        code: "OPENAI_KEY_MISSING",
      });
    }

    if (!input) {
      return res.status(400).json({ error: "O campo 'input' é obrigatório." });
    }

    const response = await openai.responses.create({
      model: model || "gpt-5.4-mini",
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

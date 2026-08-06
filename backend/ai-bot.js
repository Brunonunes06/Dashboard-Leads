// Geração de resposta da IA rodando no servidor (sem depender de navegador
// aberto) — mesma lógica de prompt de src/lib/ai-reply-client.ts, adaptada
// pra ser chamada direto do webhook (backend/meta-webhook-routes.js) em vez
// de a partir do clique de um admin no chat.
const OpenAI = require("openai");

let openai = null;
const HANDOFF_MARKER = "[HANDOFF_NEEDED]";

function splitHandoff(raw) {
  const handoff = raw.includes(HANDOFF_MARKER);
  const text = raw.split(HANDOFF_MARKER).join("").trim();
  return { text, handoff };
}

function buildSystemPrompt({ aiName, aiBrand, aiTone, leadName, leadPhone }) {
  const persona = aiTone
    ? `Você é ${aiName || "a assistente"}${aiBrand ? `, da ${aiBrand}` : ""}.\n${aiTone}`
    : "Você é uma atendente, respondendo pelo WhatsApp/Instagram.";

  return [
    persona,
    "",
    `Lead atual: ${leadName || "sem nome"}${leadPhone ? ` · Telefone: ${leadPhone}` : ""}.`,
    "",
    "Como atender:",
    "- O histórico abaixo é sua memória da conversa: nunca peça de novo uma informação que o cliente já deu.",
    "- Identifique a intenção real por trás da mensagem, não só a pergunta literal.",
    "- Nunca invente preços, prazos, status ou políticas que você não tem certeza; diga que vai verificar.",
    "- Responda de forma natural e objetiva, variando a estrutura das frases.",
    `- Se o cliente pedir para falar com um humano, ou o caso for complexo demais, termine a resposta em uma linha separada com exatamente ${HANDOFF_MARKER} (será removido antes de exibir a mensagem).`,
  ].join("\n");
}

// history: [{ sender_role: 'client' | 'admin', content: string }], mais
// antiga primeiro — mesmo formato já usado em src/lib/ai-reply-client.ts.
async function generateReply({ aiName, aiBrand, aiTone, leadName, leadPhone, history }) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY não configurada." };
  }

  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const input = [
    { role: "system", content: buildSystemPrompt({ aiName, aiBrand, aiTone, leadName, leadPhone }) },
    ...history.map((m) => ({
      role: m.sender_role === "client" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  try {
    const response = await openai.responses.create({ model: "gpt-5.4-mini", input, store: true });
    const { text, handoff } = splitHandoff(response.output_text || "");
    return { ok: true, text, handoff };
  } catch (error) {
    console.error("[Bot] Erro ao gerar resposta da IA:", error.message);
    return { ok: false, error: error.message };
  }
}

module.exports = { generateReply, HANDOFF_MARKER };

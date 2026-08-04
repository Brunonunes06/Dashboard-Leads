export const HANDOFF_MARKER = "[HANDOFF_NEEDED]";

export function getAISettings() {
  return {
    botEnabled: localStorage.getItem("botEnabled") !== "false",
    aiName: localStorage.getItem("aiName") || "",
    aiBrand: localStorage.getItem("aiBrand") || "",
    aiTone: localStorage.getItem("aiTone") || "",
  };
}

interface HistoryMessage {
  sender_role: "admin" | "client";
  content: string;
}

interface LeadInfo {
  name: string;
  phone: string;
}

export function buildAIReplyInput(lead: LeadInfo, history: HistoryMessage[]) {
  const settings = getAISettings();
  const input = history.map((m) => ({
    role: (m.sender_role === "client" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  const persona = settings.aiTone
    ? `Você é ${settings.aiName || "a assistente"}${settings.aiBrand ? `, da ${settings.aiBrand}` : ""}.\n${settings.aiTone}`
    : "Você é uma atendente de uma imobiliária, respondendo pelo WhatsApp.";

  const systemContext = [
    persona,
    "",
    `Lead atual: ${lead.name} · Telefone: ${lead.phone || "não informado"}.`,
    "",
    "Como atender:",
    "- O histórico abaixo é sua memória da conversa: nunca peça de novo uma informação que o cliente já deu.",
    "- Identifique a intenção real por trás da mensagem, não só a pergunta literal.",
    "- Nunca invente preços, prazos, status ou políticas que você não tem certeza; diga que vai verificar.",
    "- Responda de forma natural e objetiva, variando a estrutura das frases.",
    `- Se o cliente pedir para falar com um humano, ou o caso for complexo demais, termine a resposta em uma linha separada com exatamente ${HANDOFF_MARKER} (será removido antes de exibir a mensagem).`,
  ].join("\n");

  return [{ role: "system" as const, content: systemContext }, ...input];
}

export function splitHandoff(raw: string) {
  const handoff = raw.includes(HANDOFF_MARKER);
  const text = raw.split(HANDOFF_MARKER).join("").trim();
  return { text, handoff };
}

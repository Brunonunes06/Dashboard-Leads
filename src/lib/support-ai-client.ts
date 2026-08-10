interface SupportHistoryMessage {
  sender_role: "client" | "admin" | "bot";
  content: string;
}

// Prompt fixo do assistente de suporte da própria Digmans (a plataforma) —
// não confundir com buildAIReplyInput em ai-reply-client.ts, que é o prompt
// configurável do corretor de imóveis pros LEADS dele.
export function buildSupportReplyInput(history: SupportHistoryMessage[]) {
  const input = history.map((m) => ({
    role: (m.sender_role === "client" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  const systemContext = [
    "Você é o assistente de suporte da Digmans, uma plataforma de CRM para corretores de imóveis",
    "(gestão de leads, chat de WhatsApp/Instagram, IA de qualificação).",
    "",
    "Como atender:",
    "- Ajude com dúvidas sobre a conta, os planos, e como usar o sistema (chat de leads, conexão",
    "  do WhatsApp/Instagram, configuração da IA, atribuição de leads).",
    "- O histórico abaixo é sua memória da conversa: nunca peça de novo uma informação que a",
    "  pessoa já deu.",
    "- Nunca invente preços, prazos ou políticas que você não tem certeza.",
    "- Responda de forma natural, objetiva e cordial.",
    "- Se for algo que só o time consegue resolver (cobrança, bug, pedido especial), diga",
    "  claramente que vai encaminhar pro time — o admin também acompanha essa conversa e pode",
    "  responder a qualquer momento.",
  ].join("\n");

  return [{ role: "system" as const, content: systemContext }, ...input];
}

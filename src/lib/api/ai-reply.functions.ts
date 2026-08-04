import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";
import { verifySupabaseAccessToken } from "../verify-supabase-token.server";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

// Modelos permitidos — nunca deixamos o cliente escolher um modelo arbitrario
// (poderia pedir um modelo caro so pra gastar a cota da API).
const ALLOWED_MODELS = new Set(["gpt-5.4-mini", "gpt-5-search-api"]);

export const generateAiReply = createServerFn({ method: "POST" })
  .validator(z.object({ model: z.string().optional(), input: z.array(messageSchema), accessToken: z.string() }))
  .handler(async ({ data }): Promise<{ text: string; error: string | null }> => {
    const rateLimit = checkRateLimit(getRequest(), "ai-reply.generate", { windowMs: 60_000, max: 20 });
    if (!rateLimit.allowed) {
      return { text: "", error: rateLimit.message };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { text: "", error: "Configure OPENAI_API_KEY no .env do servidor." };
    }

    // O backend nunca confia em quem afirma ser o cliente: valida o token do
    // Supabase direto com o Supabase antes de gastar cota da API da OpenAI.
    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) {
      return { text: "", error: "Sessão inválida ou expirada. Faça login novamente." };
    }

    const model = data.model && ALLOWED_MODELS.has(data.model) ? data.model : "gpt-5.4-mini";

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: data.input,
        }),
        signal: AbortSignal.timeout(20000),
      });

      const json: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { text: "", error: json?.error?.message || `Falha ao gerar resposta (HTTP ${response.status})` };
      }

      const text = json.output_text || extractOutputText(json);
      return { text: text || "", error: text ? null : "A IA nao retornou uma resposta." };
    } catch (error) {
      return { text: "", error: (error as Error).message || "Erro ao gerar resposta." };
    }
  });

function extractOutputText(data: any): string {
  try {
    return (data.output || [])
      .flatMap((item: any) => item.content || [])
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

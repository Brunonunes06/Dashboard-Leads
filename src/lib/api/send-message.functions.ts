import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";
import { verifySupabaseAccessToken } from "../verify-supabase-token.server";
import { isAdminEmail } from "../permissions";

export type SendOutboundMessageResult = { success: boolean; error?: string };

// Chamado depois que a mensagem do admin já foi gravada em public.messages
// (via ChatWindow.tsx/useRealtimeChat.ts) — esse server function só cuida de
// despachar ela de verdade pro WhatsApp/Instagram do lead pela Graph API. Sem
// isso, a resposta do admin ficava só no banco e nunca chegava no lead.
export const sendOutboundMessage = createServerFn({ method: "POST" })
  .validator(z.object({ accessToken: z.string(), leadId: z.string(), messageId: z.string() }))
  .handler(async ({ data }): Promise<SendOutboundMessageResult> => {
    const rateLimit = checkRateLimit(getRequest(), "messages.send-outbound", { windowMs: 60_000, max: 30 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };

    // "as any": leads/messages ainda não estão nos tipos gerados do Supabase
    // (mesma situação de profiles/subscriptions em outros *.functions.ts).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("content, sender_role")
      .eq("id", data.messageId)
      .eq("lead_id", data.leadId)
      .maybeSingle();

    if (messageError || !message) return { success: false, error: "Mensagem não encontrada." };
    if (message.sender_role !== "admin") return { success: false, error: "Mensagem não pertence ao admin." };

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("channel, phone, instagram_id, user_id")
      .eq("id", data.leadId)
      .maybeSingle();

    if (leadError || !lead) return { success: false, error: "Lead não encontrado." };

    // Autorizado se for admin OU o dono do lead — mesma regra da RLS em
    // clients_insert_own_messages (010_multitenant_leads.sql).
    if (!isAdminEmail(user.email) && lead.user_id !== user.id) {
      return { success: false, error: "Não autorizado." };
    }

    const { sendWhatsAppMessage, sendInstagramMessage } = await import("../meta-client.server");

    const result =
      lead.channel === "instagram"
        ? await sendInstagramMessage(lead.instagram_id, message.content)
        : await sendWhatsAppMessage(lead.phone, message.content);

    if (!result.ok) return { success: false, error: result.error };
    return { success: true };
  });

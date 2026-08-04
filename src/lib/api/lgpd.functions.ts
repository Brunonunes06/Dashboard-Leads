import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";
import { verifySupabaseAccessToken } from "../verify-supabase-token.server";

// LGPD Art. 18, VI — direito à eliminação dos dados. Registra o pedido em vez
// de apagar na hora: exclusão imediata e automática de uma conta a partir de
// um clique é arriscada demais (sem confirmação por e-mail, sem checar
// pagamentos/obrigações fiscais pendentes etc.) — o pedido fica pendente para
// um admin revisar e processar a exclusão de verdade.
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .validator(z.object({ accessToken: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const rateLimit = checkRateLimit(getRequest(), "lgpd.delete", { windowMs: 60_000, max: 5 });
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.message };
    }

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) {
      return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };
    }

    // Import dinâmico: mantém o cliente com a service role fora do bundle do
    // cliente (mesma convenção de src/integrations/supabase/client.server.ts).
    // "as any" pq deletion_requests ainda não está nos tipos gerados do
    // Supabase (tabela nova, criada em supabase/004_deletion_requests.sql).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("deletion_requests").insert({
      user_id: user.id,
      email: user.email ?? "",
    });

    if (error) {
      return { success: false, error: "Não foi possível registrar o pedido. Tente novamente." };
    }

    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";
import { verifySupabaseAccessToken } from "../verify-supabase-token.server";
import { isAdminEmail } from "../permissions";

export type ClientOption = { id: string; name: string; email: string; avatarUrl: string | null };
export type ListClientsResult = { success: true; clients: ClientOption[] } | { success: false; error: string };

// Lista os usuários "cliente" (não-admin) da plataforma, pro admin escolher
// quem é o dono de um lead (ver ChatWindow.tsx::showLeadDetails). Usa
// auth.admin.listUsers() em vez de public.profiles porque nem todo usuário
// chegou a salvar o próprio perfil (profile.tsx só grava em profiles quando
// a pessoa clica "Salvar alterações").
export const listClients = createServerFn({ method: "POST" })
  .validator(z.object({ accessToken: z.string() }))
  .handler(async ({ data }): Promise<ListClientsResult> => {
    const rateLimit = checkRateLimit(getRequest(), "clients.list", { windowMs: 60_000, max: 20 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };
    if (!isAdminEmail(user.email)) return { success: false, error: "Não autorizado." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [{ data: result, error }, { data: avatars }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("profile_avatars").select("user_id, avatar_url"),
    ]);
    if (error) return { success: false, error: error.message };

    // Prioriza a foto salva em profile_avatars (o que a pessoa escolheu em
    // Perfil, pode ser upload próprio) sobre a foto do Google — só cai pro
    // Google se ela nunca trocou a foto no app.
    const avatarByUserId = new Map((avatars ?? []).map((a: any) => [a.user_id, a.avatar_url]));

    // Inclui usuários anônimos (visitantes do chat de suporte sem conta,
    // ver useSupportIdentity.ts) — eles não têm e-mail, então caem no nome
    // genérico "Visitante" em vez de quebrar o lookup por nome no inbox de
    // suporte (useSupportThreads.ts).
    const clients: ClientOption[] = (result?.users ?? [])
      .filter((u: any) => !isAdminEmail(u.email))
      .map((u: any) => ({
        id: u.id,
        name: u.user_metadata?.name || u.email || "Visitante",
        email: u.email || "",
        avatarUrl: avatarByUserId.get(u.id) || u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      }));

    return { success: true, clients };
  });

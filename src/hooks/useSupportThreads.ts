// src/hooks/useSupportThreads.ts — só pro admin: lista de conversas de
// suporte (uma por cliente), mesma ideia de useLeads.ts mas agregando
// public.support_messages por user_id em vez de public.messages por
// lead_id. Nomes/e-mails vêm de listClients() (já existe, admin-only).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listClients } from "@/lib/api/clients.functions";

export interface SupportThread {
  user_id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export function useSupportThreads() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchThreads = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const [{ data: msgs }, clientsResult] = await Promise.all([
      supabase
        .from("support_messages")
        .select("user_id, content, created_at, sender_role, read_at")
        .order("created_at", { ascending: true }),
      listClients({ data: { accessToken: session.access_token } }),
    ]);

    if (!msgs) return;

    const nameByUserId = new Map(
      clientsResult.success ? clientsResult.clients.map((c) => [c.id, c] as const) : [],
    );

    const byUser = new Map<string, { last_message: string; last_message_at: string; unread_count: number }>();
    for (const m of msgs as any[]) {
      const entry = byUser.get(m.user_id) ?? { last_message: "", last_message_at: "", unread_count: 0 };
      entry.last_message = m.content;
      entry.last_message_at = m.created_at;
      if (m.sender_role === "client" && !m.read_at) entry.unread_count += 1;
      byUser.set(m.user_id, entry);
    }

    const result: SupportThread[] = Array.from(byUser.entries()).map(([user_id, meta]) => {
      const client = nameByUserId.get(user_id);
      return {
        user_id,
        name: client?.name ?? "Cliente",
        email: client?.email ?? "",
        avatarUrl: client?.avatarUrl ?? null,
        last_message: meta.last_message,
        last_message_at: meta.last_message_at,
        unread_count: meta.unread_count,
      };
    });

    result.sort(
      (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime(),
    );

    setThreads(result);
    setIsLoading(false);
  };

  const scheduleFetch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchThreads, 400);
  };

  useEffect(() => {
    fetchThreads();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel("admin:support-threads-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, scheduleFetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_messages" }, scheduleFetch)
      // Sem isso, apagar uma mensagem (ver SupportChatWindow.tsx) não
      // atualizava a última mensagem/contagem de não lidas na lista.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "support_messages" }, scheduleFetch)
      // Refaz a busca (que já reconsulta listClients) quando alguém troca de
      // foto — é assim que a lista/conversa aberta atualiza o avatar ao vivo.
      .on("postgres_changes", { event: "*", schema: "public", table: "profile_avatars" }, scheduleFetch)
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { threads, isLoading, refetch: fetchThreads };
}

// src/hooks/useLeads.ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface LeadWithMeta {
  id: string;
  name: string;
  phone: string;
  status: string;
  score: number;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  ai_auto_reply: boolean;
}

export function useLeads() {
  const [leads, setLeads] = useState<LeadWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isFetchingRef = useRef(false);
  const refetchPendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = async () => {
    if (isFetchingRef.current) {
      refetchPendingRef.current = true;
      return;
    }
    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, status, score, created_at, ai_auto_reply")
        .order("created_at", { ascending: false });

      if (error || !data) return;

      const enriched = await Promise.all(
        data.map(async (lead) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("lead_id", lead.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("lead_id", lead.id)
            .eq("sender_role", "client")
            .is("read_at", null);

          return {
            ...lead,
            last_message: lastMsg?.content ?? null,
            last_message_at: lastMsg?.created_at ?? null,
            unread_count: count ?? 0,
          } as LeadWithMeta;
        }),
      );

      enriched.sort((a, b) => {
        const aT = a.last_message_at ?? a.created_at;
        const bT = b.last_message_at ?? b.created_at;
        return new Date(bT).getTime() - new Date(aT).getTime();
      });

      setLeads(enriched);
      setIsLoading(false);
    } finally {
      isFetchingRef.current = false;
      if (refetchPendingRef.current) {
        refetchPendingRef.current = false;
        fetchLeads();
      }
    }
  };

  // Varias mensagens (enviar, receber, marcar como lida) podem disparar esse
  // evento em rajada — sem debounce, cada uma dispara um refetch completo de
  // todos os leads (2 queries por lead), e isso empilhado e que travava a
  // tela ao usar o chat.
  const scheduleFetch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchLeads, 400);
  };

  useEffect(() => {
    fetchLeads();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel("admin:leads-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleFetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, scheduleFetch)
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { leads, isLoading, refetch: fetchLeads };
}

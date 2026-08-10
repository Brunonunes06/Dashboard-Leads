import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeMessage, SenderRole } from "@/data/chatTypes";

export function useRealtimeChat(leadId: string | null) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Carrega mensagens iniciais
  useEffect(() => {
    if (!leadId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (!error && data) {
        setMessages(data as RealtimeMessage[]);
      }

      setIsLoading(false);
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [leadId]);

  // Realtime
  useEffect(() => {
    if (!leadId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat:${leadId}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const nova = payload.new as RealtimeMessage;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === nova.id);

            if (exists) return prev;

            return [...prev, nova].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          });
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const updated = payload.new as RealtimeMessage;

          setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
        },
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages((prev) => prev.filter((msg) => msg.id !== deleted.id));
        },
      )

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Enviar mensagem. Devolve o id da mensagem gravada (ou null se falhar) —
  // quem chama usa esse id pra disparar o despacho de verdade pro
  // WhatsApp/Instagram (ver ChatWindow.tsx::relayOutbound).
  const sendMessage = useCallback(
    async (content: string, senderId: string, senderRole: SenderRole) => {
      if (!leadId) return null;

      const text = content.trim();

      if (!text) return null;

      const optimisticId = crypto.randomUUID();

      const optimistic: RealtimeMessage = {
        id: optimisticId,
        lead_id: leadId,
        sender_id: senderId,
        sender_role: senderRole,
        content: text,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          lead_id: leadId,
          sender_id: senderId,
          sender_role: senderRole,
          content: text,
        })
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));

        console.error(error);
        return null;
      }

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? (data as RealtimeMessage) : m)),
        );
      }

      return (data as RealtimeMessage | null)?.id ?? null;
    },
    [leadId],
  );

  // Apagar mensagem própria — RLS (020_delete_own_messages.sql) só deixa
  // apagar quem realmente mandou (sender_id = auth.uid()), então a policy
  // já barra tentativa de apagar mensagem de outra pessoa; aqui só otimiza a
  // UI removendo na hora, sem esperar o evento DELETE do Realtime.
  const deleteMessage = useCallback(async (messageId: string) => {
    const previous = messages;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      setMessages(previous);
      console.error(error);
      return false;
    }
    return true;
  }, [messages]);

  // Marcar mensagens como lidas
  const markAsRead = useCallback(
    async (readerId: string) => {
      if (!leadId) return;

      await supabase
        .from("messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("lead_id", leadId)
        .neq("sender_id", readerId)
        .is("read_at", null);
    },
    [leadId],
  );

  return {
    messages,
    isLoading,

    // futuros recursos
    isOnline,
    setIsOnline,

    isTyping,
    setIsTyping,

    sendMessage,
    deleteMessage,
    markAsRead,
  };
}

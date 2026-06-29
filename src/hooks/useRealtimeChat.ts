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

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Enviar mensagem
  const sendMessage = useCallback(
    async (content: string, senderId: string, senderRole: SenderRole) => {
      if (!leadId) return false;

      const text = content.trim();

      if (!text) return false;

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
        return false;
      }

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? (data as RealtimeMessage) : m)),
        );
      }

      return true;
    },
    [leadId],
  );

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
    markAsRead,
  };
}

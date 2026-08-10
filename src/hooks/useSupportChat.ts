import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SupportMessage, SupportSenderRole } from "@/data/supportChatTypes";

// Mesmo formato de useRealtimeChat.ts, só que a "conversa" é por user_id (o
// cliente dono da thread) em vez de por lead_id.
export function useSupportChat(threadUserId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!threadUserId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", threadUserId)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (!error && data) {
        setMessages(data as SupportMessage[]);
      }

      setIsLoading(false);
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [threadUserId]);

  useEffect(() => {
    if (!threadUserId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`support-chat:${threadUserId}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${threadUserId}`,
        },
        (payload) => {
          const nova = payload.new as SupportMessage;

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
          table: "support_messages",
          filter: `user_id=eq.${threadUserId}`,
        },
        (payload) => {
          const updated = payload.new as SupportMessage;

          setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
        },
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${threadUserId}`,
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
  }, [threadUserId]);

  // Devolve o id da mensagem gravada (ou null se falhar) — quem chama usa
  // esse id, ex. pra disparar a resposta da IA logo em seguida.
  const sendMessage = useCallback(
    async (content: string, senderId: string, senderRole: SupportSenderRole) => {
      if (!threadUserId) return null;

      const text = content.trim();

      if (!text) return null;

      const optimisticId = crypto.randomUUID();

      const optimistic: SupportMessage = {
        id: optimisticId,
        user_id: threadUserId,
        sender_id: senderId,
        sender_role: senderRole,
        content: text,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          user_id: threadUserId,
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
          prev.map((m) => (m.id === optimisticId ? (data as SupportMessage) : m)),
        );
      }

      return (data as SupportMessage | null)?.id ?? null;
    },
    [threadUserId],
  );

  const markAsRead = useCallback(
    async (readerId: string) => {
      if (!threadUserId) return;

      await supabase
        .from("support_messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("user_id", threadUserId)
        .neq("sender_id", readerId)
        .is("read_at", null);
    },
    [threadUserId],
  );

  // Apagar mensagem própria — RLS (020_delete_own_messages.sql) só deixa
  // apagar quem realmente mandou (sender_id = auth.uid()).
  const deleteMessage = useCallback(
    async (messageId: string) => {
      const previous = messages;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      const { error } = await supabase.from("support_messages").delete().eq("id", messageId);
      if (error) {
        setMessages(previous);
        console.error(error);
        return false;
      }
      return true;
    },
    [messages],
  );

  return {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    markAsRead,
  };
}

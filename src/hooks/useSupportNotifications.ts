// src/hooks/useSupportNotifications.ts — toast global (funciona em qualquer
// página, não só dentro de /support) quando chega mensagem nova no canal de
// suporte: admin é avisado quando um cliente manda mensagem, cliente é
// avisado quando admin (ou a IA) responde. Reaproveita a mesma tabela
// support_messages já com Realtime habilitado (ver hooks/useSupportChat.ts).
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { isImageMessage } from "@/lib/image-message";
import { playNotificationSound } from "@/lib/notification-sound";

interface IncomingSupportMessage {
  user_id: string;
  sender_role: "client" | "admin" | "bot";
  content: string;
}

export function useSupportNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // navigate() de useNavigate() pode não ser referencialmente estável entre
  // renders — via ref pra não recriar o canal Realtime toda hora (o que
  // podia derrubar a inscrição antes dela realmente "pegar").
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!user) return;

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const isAdmin = user.role === "admin";

    const channel = supabase
      .channel(isAdmin ? "notify:support-admin" : `notify:support-client:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          ...(isAdmin ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        (payload) => {
          const msg = payload.new as IncomingSupportMessage;
          const relevant = isAdmin ? msg.sender_role === "client" : msg.sender_role !== "client";
          if (!relevant) return;

          playNotificationSound();

          const preview = isImageMessage(msg.content)
            ? "📷 Foto"
            : msg.content.length > 80
              ? `${msg.content.slice(0, 80)}…`
              : msg.content;
          toast.message(isAdmin ? "Nova mensagem de suporte" : "Nova resposta do suporte", {
            description: preview,
            action: { label: "Ver", onClick: () => navigateRef.current({ to: "/support" }) },
          });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Notificações de suporte] Falha ao assinar o canal Realtime:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);
}

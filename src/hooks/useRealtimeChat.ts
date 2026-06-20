// src/hooks/useRealtimeChat.ts
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeMessage, SenderRole } from "@/data/chatTypes"

export function useRealtimeChat(leadId: string | null) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Busca mensagens iniciais
  useEffect(() => {
    if (!leadId) { setIsLoading(false); return }

    setIsLoading(true)
    supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setMessages(data as RealtimeMessage[])
        setIsLoading(false)
      })
  }, [leadId])

  // Subscribe Realtime
  useEffect(() => {
    if (!leadId) return

    if (channelRef.current) supabase.removeChannel(channelRef.current)

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
          const nova = payload.new as RealtimeMessage
          setMessages((prev) =>
            prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]
          )
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [leadId])

  // Envia mensagem com update otimista
  const sendMessage = useCallback(
    async (content: string, senderId: string, senderRole: SenderRole) => {
      if (!leadId || !content.trim()) return false

      const optimistic: RealtimeMessage = {
        id: crypto.randomUUID(),
        lead_id: leadId,
        sender_id: senderId,
        sender_role: senderRole,
        content: content.trim(),
        created_at: new Date().toISOString(),
        read_at: null,
      }

      setMessages((prev) => [...prev, optimistic])

      const { error } = await supabase.from("messages").insert({
        lead_id: leadId,
        sender_id: senderId,
        sender_role: senderRole,
        content: content.trim(),
      })

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        return false
      }
      return true
    },
    [leadId]
  )

  // Marca como lido
  const markAsRead = useCallback(
    async (readerId: string) => {
      if (!leadId) return
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("lead_id", leadId)
        .neq("sender_id", readerId)
        .is("read_at", null)
    },
    [leadId]
  )

  return { messages, isLoading, sendMessage, markAsRead }
}

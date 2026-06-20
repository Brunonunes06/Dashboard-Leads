// src/components/ChatWindow.tsx
// Estilo: Discord/iMessage — fundo preto, bolhas cinza escuro (outros) e roxo-azul (você)

import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { useRealtimeChat } from "@/hooks/useRealtimeChat"
import { cn } from "@/lib/utils"
import type { LeadWithMeta } from "@/hooks/useLeads"

interface ChatWindowProps {
  lead: LeadWithMeta
  currentUserId: string       // auth.uid()
  currentUserName: string     // nome exibido (ex: "CEO" ou nome do cliente)
  currentRole: "admin" | "client"
}

export function ChatWindow({ lead, currentUserId, currentUserName, currentRole }: ChatWindowProps) {
  const { messages, isLoading, sendMessage, markAsRead } = useRealtimeChat(lead.id)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (messages.length > 0) markAsRead(currentUserId)
  }, [messages.length, currentUserId, markAsRead])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || isSending) return
    setDraft("")
    setIsSending(true)
    await sendMessage(text, currentUserId, currentRole)
    setIsSending(false)
    inputRef.current?.focus()
  }

  // Agrupa mensagens consecutivas do mesmo remetente
  type Group = { senderId: string; senderRole: "admin" | "client"; senderName: string; msgs: typeof messages }
  const groups: Group[] = []
  for (const msg of messages) {
    const last = groups[groups.length - 1]
    const name = msg.sender_role === "admin" ? "CEO" : lead.name
    if (last && last.senderId === msg.sender_id) {
      last.msgs.push(msg)
    } else {
      groups.push({ senderId: msg.sender_id, senderRole: msg.sender_role, senderName: name, msgs: [msg] })
    }
  }

  // Separador de data/hora
  const formatSeparator = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const day = isToday ? "Hoje" : weekdays[d.getDay()]
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    return `${day}, ${time}`
  }

  // Detecta mudança de "sessão" (mais de 30min sem mensagem)
  const SESSION_GAP = 30 * 60 * 1000
  const shouldShowSeparator = (i: number) => {
    if (i === 0) return true
    const prev = messages[i - 1]
    const curr = messages[i]
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() > SESSION_GAP
  }

  // Índice acumulado para o separador
  let msgIndex = 0

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#0e0e10",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid #1e1e22",
        background: "#0e0e10",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "#2d2d32",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
          textTransform: "uppercase",
        }}>
          {lead.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{lead.name}</span>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 16px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        scrollbarWidth: "none",
      }}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "#5865f2",
                animation: "bounce 1.2s infinite",
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "#555", textAlign: "center" }}>Nenhuma mensagem ainda.<br />Inicie a conversa!</p>
          </div>
        ) : (
          groups.map((group, gi) => {
            const isOwn = group.senderId === currentUserId
            const firstMsgIndex = msgIndex
            msgIndex += group.msgs.length

            return (
              <div key={gi}>
                {/* Separador de sessão */}
                {shouldShowSeparator(firstMsgIndex) && (
                  <div style={{
                    textAlign: "center",
                    margin: "16px 0 12px",
                    fontSize: 12,
                    color: "#555",
                  }}>
                    {formatSeparator(group.msgs[0].created_at)}
                  </div>
                )}

                {/* Grupo de mensagens */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isOwn ? "flex-end" : "flex-start",
                  gap: 2,
                  marginBottom: 12,
                }}>
                  {/* Nome do remetente (só para mensagens do outro) */}
                  {!isOwn && (
                    <span style={{ fontSize: 12, color: "#888", marginLeft: 8, marginBottom: 2 }}>
                      {group.senderName}
                    </span>
                  )}

                  {group.msgs.map((msg, mi) => {
                    const isFirst = mi === 0
                    const isLast = mi === group.msgs.length - 1

                    return (
                      <div key={msg.id} style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 8,
                        flexDirection: isOwn ? "row-reverse" : "row",
                      }}>
                        {/* Avatar só na última mensagem do grupo (lado esquerdo) */}
                        {!isOwn && (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: isLast ? "#2d2d32" : "transparent",
                            flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "#aaa",
                            textTransform: "uppercase",
                          }}>
                            {isLast ? group.senderName.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : ""}
                          </div>
                        )}

                        {/* Bolha */}
                        <div style={{
                          maxWidth: "72%",
                          padding: "8px 14px",
                          borderRadius: isOwn
                            ? `18px 18px ${isLast ? "4px" : "18px"} 18px`
                            : `18px 18px 18px ${isLast ? "4px" : "18px"}`,
                          background: isOwn ? "#5865f2" : "#2d2d32",
                          color: "#fff",
                          fontSize: 14.5,
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>

      {/* Input */}
      <div style={{
        padding: "10px 16px 16px",
        background: "#0e0e10",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#1e1e22",
          borderRadius: 24,
          padding: "8px 8px 8px 16px",
        }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Mensagem…"
            disabled={isSending}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14.5,
              color: "#fff",
              caretColor: "#5865f2",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: draft.trim() ? "#5865f2" : "#2d2d32",
              border: "none",
              cursor: draft.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff" stroke="none" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

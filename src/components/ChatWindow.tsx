import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import type { LeadWithMeta } from "@/hooks/useLeads";

interface ChatWindowProps {
  lead: LeadWithMeta;
  currentUserId: string;
  currentUserName?: string;
  currentRole: "admin" | "client";
}

type MessageGroup = {
  senderId: string;
  senderRole: "admin" | "client";
  senderName: string;
  msgs: ReturnType<typeof useRealtimeChat>["messages"];
};

export function ChatWindow({ lead, currentUserId, currentUserName, currentRole }: ChatWindowProps) {
  const { messages, isLoading, sendMessage, markAsRead, isTyping, isOnline } =
    useRealtimeChat(lead.id);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) markAsRead(currentUserId);
  }, [messages.length, currentUserId, markAsRead]);

  const senderLabel = currentRole === "admin" ? currentUserName || "CEO" : lead.name;

  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const senderName = msg.sender_role === "admin" ? senderLabel : lead.name;

    if (last && last.senderId === msg.sender_id) {
      last.msgs.push(msg);
      continue;
    }

    groups.push({
      senderId: msg.sender_id,
      senderRole: msg.sender_role,
      senderName,
      msgs: [msg],
    });
  }

  const shouldShowSeparator = (index: number) => {
    if (index === 0) return true;
    const previous = messages[index - 1];
    const current = messages[index];
    return (
      new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() >
      30 * 60 * 1000
    );
  };

  const formatSeparator = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const day = isToday ? "Hoje" : weekdays[d.getDay()];
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${day}, ${time}`;
  };

  const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getLeadInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const formatLastActivity = (iso: string | null) => {
    if (!iso) return "agora";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    setDraft("");
    setIsSending(true);
    await sendMessage(text, currentUserId, currentRole);
    setIsSending(false);
    inputRef.current?.focus();
  };

  let messageIndex = 0;

  return (
    <div
      className="chat-window"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "transparent",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="chat-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(148,163,184,.14)",
          background: "rgba(7, 10, 20, 0.72)",
          backdropFilter: "blur(18px)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowLeadDetails(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#041b12",
            textTransform: "uppercase",
            flexShrink: 0,
            border: "1px solid rgba(16,185,129,.25)",
            boxShadow: "0 10px 24px rgba(16,185,129,.25)",
            cursor: "pointer",
            padding: 0,
          }}
          title="Ver informações do lead"
        >
          {getLeadInitials(lead.name)}
        </button>

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{lead.name}</span>
          <span
            style={{
              fontSize: 12,
              color: isTyping ? "#5865f2" : isOnline ? "#5ad17a" : "#8a8a8a",
              marginTop: 2,
            }}
          >
            {isTyping ? "digitando..." : isOnline ? "● Online" : "Offline"}
          </span>
        </div>
      </div>

      {showLeadDetails && (
        <div
          onClick={() => setShowLeadDetails(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 100%)",
              borderRadius: 20,
              border: "1px solid #1e1e22",
              background: "#0f1115",
              boxShadow: "0 24px 80px rgba(0,0,0,.45)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#2d2d32",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {getLeadInitials(lead.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{lead.name}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{lead.phone}</div>
                <div
                  style={{
                    display: "inline-flex",
                    marginTop: 10,
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 9999,
                    border: "1px solid rgba(16,185,129,.25)",
                    color: "#34d399",
                    background: "rgba(16,185,129,.08)",
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {lead.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeadDetails(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9999,
                  border: "1px solid #1f2937",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                }}
                aria-label="Fechar informações do lead"
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ border: "1px solid #1e1e22", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                  Score de qualidade
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399", marginTop: 6 }}>
                  {lead.score}
                </div>
              </div>
              <div style={{ border: "1px solid #1e1e22", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                  Última atividade
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 6 }}>
                  {formatLastActivity(lead.last_message_at)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, border: "1px solid #1e1e22", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                Informações
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 10, color: "#e5e7eb", fontSize: 14 }}>
                <div>
                  <span style={{ color: "#94a3b8" }}>Telefone: </span>
                  {lead.phone}
                </div>
                <div>
                  <span style={{ color: "#94a3b8" }}>Mensagens: </span>
                  {messages.length}
                </div>
                <div>
                  <span style={{ color: "#94a3b8" }}>Origem: </span>
                  {lead.last_message ?? "Conversação ativa"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowLeadDetails(false)}
                style={{
                  borderRadius: 12,
                  border: "none",
                  background: "#10b981",
                  color: "#041b12",
                  fontWeight: 700,
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="chat-messages"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 18px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          scrollbarWidth: "none",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Carregando...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
              Nenhuma mensagem ainda.
              <br />
              Inicie a conversa!
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const isOwn = group.senderId === currentUserId;
            const firstIndex = messageIndex;
            messageIndex += group.msgs.length;

            return (
              <div key={`${group.senderId}-${firstIndex}`}>
                {shouldShowSeparator(firstIndex) && (
                  <div
                    style={{
                      textAlign: "center",
                      margin: "18px auto 14px",
                      fontSize: 11,
                      color: "#94a3b8",
                      width: "fit-content",
                      padding: "6px 10px",
                      borderRadius: 9999,
                      background: "rgba(15, 23, 42, 0.72)",
                      border: "1px solid rgba(148,163,184,.16)",
                    }}
                  >
                    {formatSeparator(group.msgs[0].created_at)}
                  </div>
                )}

                <div
                  className={`chat-message-row ${isOwn ? "is-own" : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOwn ? "flex-end" : "flex-start",
                    gap: 2,
                    marginBottom: 12,
                  }}
                >
                  {!isOwn && (
                    <span style={{ fontSize: 12, color: "#888", marginLeft: 8, marginBottom: 2 }}>
                      {group.senderName}
                    </span>
                  )}

                  {group.msgs.map((msg, idx) => {
                    const isLast = idx === group.msgs.length - 1;
                    return (
                      <div
                        key={msg.id}
                        className={`chat-message-row ${isOwn ? "is-own" : ""}`}
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          gap: 8,
                          flexDirection: isOwn ? "row-reverse" : "row",
                        }}
                      >
                        {!isOwn && (
                          <div
                            className="chat-avatar"
                            style={{
                              background: isLast ? "rgba(30,41,59,.9)" : "transparent",
                            }}
                          >
                            {isLast
                              ? group.senderName
                                  .split(" ")
                                  .map((w) => w[0])
                                  .slice(0, 2)
                                  .join("")
                              : ""}
                          </div>
                        )}

                        <div
                          className={`chat-bubble ${isOwn ? "is-own" : "is-incoming"}`}
                          style={{
                            maxWidth: "72%",
                            padding: "10px 14px",
                            borderRadius: isOwn
                              ? `18px 18px ${isLast ? "6px" : "18px"} 18px`
                              : `18px 18px 18px ${isLast ? "6px" : "18px"}`,
                            fontSize: 14.5,
                            lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.content}
                          <div className="chat-timestamp">{formatMessageTime(msg.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
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

      <div
        className="chat-footer"
        style={{
          padding: "12px 16px 16px",
          background: "rgba(7, 10, 20, 0.86)",
          borderTop: "1px solid rgba(148,163,184,.14)",
        }}
      >
        <div
          className="chat-composer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15,23,42,.72)",
            borderRadius: 24,
            padding: "8px 8px 8px 16px",
          }}
        >
          <input
            ref={inputRef}
            className="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Mensagem..."
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
            className="chat-send"
            disabled={!draft.trim() || isSending}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: draft.trim()
                ? "linear-gradient(135deg, #10b981, #06b6d4)"
                : "#2d2d32",
              border: "none",
              cursor: draft.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s, background 0.15s",
              flexShrink: 0,
            }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

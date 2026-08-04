import { useEffect, useRef, useState } from "react";
import { Bot, CheckCheck, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { supabase } from "@/lib/supabase";
import { generateAiReply } from "@/lib/api/ai-reply.functions";
import { buildAIReplyInput, getAISettings, splitHandoff } from "@/lib/ai-reply-client";
import { useTranslation } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import type { LeadWithMeta } from "@/hooks/useLeads";
import type { LeadStatus } from "@/data/mockLeads";

interface ChatWindowProps {
  lead: LeadWithMeta;
  currentUserId: string;
  currentUserName?: string;
  currentRole: "admin" | "client";
  onTransferred?: () => void;
  onAiAutoReplyChange?: (enabled: boolean) => void;
}

type MessageGroup = {
  senderId: string;
  senderRole: "admin" | "client";
  senderName: string;
  msgs: ReturnType<typeof useRealtimeChat>["messages"];
};

export function ChatWindow({
  lead,
  currentUserId,
  currentUserName,
  currentRole,
  onTransferred,
  onAiAutoReplyChange,
}: ChatWindowProps) {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, markAsRead, isTyping, isOnline } =
    useRealtimeChat(lead.id);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAutoRepliedIdRef = useRef<string | null>(null);
  const hasLoadedInitialMessagesRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) markAsRead(currentUserId);
  }, [messages.length, currentUserId, markAsRead]);

  // Reseta os marcadores de "já respondeu automaticamente" ao trocar de
  // conversa, pra não confundir o histórico de um lead com o de outro.
  useEffect(() => {
    hasLoadedInitialMessagesRef.current = false;
    lastAutoRepliedIdRef.current = null;
  }, [lead.id]);

  // IA automática: dispara só quando chega uma mensagem NOVA do lead (não no
  // carregamento inicial da conversa) e o interruptor está ligado — funciona
  // enquanto esse componente estiver montado (aba do navegador aberta), via
  // Supabase Realtime; não é um bot rodando no servidor.
  useEffect(() => {
    if (!hasLoadedInitialMessagesRef.current) {
      hasLoadedInitialMessagesRef.current = true;
      lastAutoRepliedIdRef.current = messages[messages.length - 1]?.id ?? null;
      return;
    }
    if (!lead.ai_auto_reply) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender_role !== "client") return;
    if (lastAutoRepliedIdRef.current === last.id) return;
    lastAutoRepliedIdRef.current = last.id;
    handleAiAutoReply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, lead.ai_auto_reply]);

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

  const handleTransfer = async () => {
    if (isTransferring) return;
    setIsTransferring(true);
    const { error } = await supabase.from("leads").update({ status: "transferido" }).eq("id", lead.id);
    setIsTransferring(false);
    if (error) {
      console.error("Erro ao transferir lead:", error);
      toast.error("Erro ao transferir", { description: error.message });
      return;
    }
    toast.success("Lead transferido", { description: `${lead.name} foi marcado como transferido.` });
    onTransferred?.();
  };

  const handleAiAutoReply = async () => {
    if (getAISettings().botEnabled === false) return;
    try {
      const input = buildAIReplyInput(
        { name: lead.name, phone: lead.phone },
        messages.map((m) => ({ sender_role: m.sender_role, content: m.content })),
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const result = await generateAiReply({ data: { input, accessToken: session.access_token } });
      if (result.error || !result.text) return;
      const { text, handoff } = splitHandoff(result.text);
      if (!text) return;
      await sendMessage(text, currentUserId, "admin");
      if (handoff) {
        toast.warning("IA sinalizou necessidade de humano", {
          description: `${lead.name} pode precisar de atendimento manual — considere desligar a IA automática nessa conversa.`,
        });
      }
    } catch (error) {
      console.error("[IA automática] Erro ao responder:", error);
    }
  };

  const handleToggleAiAutoReply = async () => {
    if (isTogglingAi) return;
    setIsTogglingAi(true);
    const next = !lead.ai_auto_reply;
    const { error } = await supabase.from("leads").update({ ai_auto_reply: next }).eq("id", lead.id);
    setIsTogglingAi(false);
    if (error) {
      toast.error("Erro ao mudar modo da IA", { description: error.message });
      return;
    }
    onAiAutoReplyChange?.(next);
    toast.success(next ? "IA automática ligada" : "IA automática desligada", {
      description: next
        ? `A IA vai responder ${lead.name} sozinha enquanto essa conversa estiver aberta.`
        : "Voltou pro modo manual — você aprova cada resposta antes de enviar.",
    });
  };

  const handleAiSuggest = async () => {
    if (isSuggesting) return;
    if (getAISettings().botEnabled === false) {
      toast.warning("Bot desativado", { description: "Ative o bot em Configurar IA para usar sugestões." });
      return;
    }
    setIsSuggesting(true);
    try {
      const input = buildAIReplyInput(
        { name: lead.name, phone: lead.phone },
        messages.map((m) => ({ sender_role: m.sender_role, content: m.content })),
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada", { description: "Faça login novamente para usar a IA." });
        return;
      }
      const result = await generateAiReply({ data: { input, accessToken: session.access_token } });
      if (result.error || !result.text) {
        toast.error("IA indisponível", { description: result.error || "Não foi possível gerar uma resposta agora." });
        return;
      }
      const { text, handoff } = splitHandoff(result.text);
      setDraft(text);
      inputRef.current?.focus();
      if (handoff) {
        toast.warning("Sugestão de transferência", {
          description: "A IA identificou que este atendimento pode precisar de um humano.",
        });
      }
    } catch (error) {
      toast.error("IA indisponível", { description: (error as Error).message || "Tente novamente." });
    } finally {
      setIsSuggesting(false);
    }
  };

  let messageIndex = 0;

  return (
    <div
      className="chat-window"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
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
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--primary-foreground)",
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
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lead.name}
            </span>
            <StatusBadge status={lead.status as LeadStatus} />
          </span>
          <span
            style={{
              fontSize: 12,
              color: isTyping ? "#5865f2" : isOnline ? "var(--primary)" : "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            {isTyping ? t("common.typing") : isOnline ? `● ${t("common.online")}` : t("common.offline")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleAiAutoReply}
          disabled={isTogglingAi}
          title={
            lead.ai_auto_reply
              ? "IA automática ligada — clique pra voltar ao modo manual"
              : "IA automática desligada — clique pra ligar"
          }
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 9999,
            border: lead.ai_auto_reply ? "1px solid rgba(88,101,242,.4)" : "1px solid rgba(148,163,184,.3)",
            background: lead.ai_auto_reply ? "rgba(88,101,242,.15)" : "transparent",
            color: lead.ai_auto_reply ? "#5865f2" : "var(--muted-foreground)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            opacity: isTogglingAi ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Bot size={14} />
          {lead.ai_auto_reply ? "IA automática" : "IA manual"}
        </button>

        <button
          type="button"
          onClick={handleTransfer}
          disabled={isTransferring || lead.status === "transferido"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 9999,
            border: "1px solid rgba(16,185,129,.3)",
            background: lead.status === "transferido" ? "transparent" : "var(--gradient-primary)",
            color: lead.status === "transferido" ? "var(--primary)" : "var(--primary-foreground)",
            fontSize: 13,
            fontWeight: 600,
            cursor: lead.status === "transferido" ? "default" : "pointer",
            opacity: isTransferring ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <CheckCheck size={14} />
          {lead.status === "transferido" ? t("lead.transferred") : t("lead.transfer")}
        </button>
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
              border: "1px solid var(--border)",
              background: "var(--card)",
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
                  background: "var(--secondary)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {getLeadInitials(lead.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>{lead.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{lead.phone}</div>
                <div style={{ marginTop: 10 }}>
                  <StatusBadge status={lead.status as LeadStatus} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeadDetails(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9999,
                  border: "1px solid var(--border)",
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
                aria-label={t("lead.close")}
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
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  {t("lead.score")}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)", marginTop: 6 }}>
                  {lead.score}
                </div>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  {t("lead.lastActivity")}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginTop: 6 }}>
                  {formatLastActivity(lead.last_message_at)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                {t("lead.info")}
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 10, color: "var(--foreground)", fontSize: 14 }}>
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>{t("lead.phone")}: </span>
                  {lead.phone}
                </div>
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>{t("lead.messages")}: </span>
                  {messages.length}
                </div>
                <div>
                  <span style={{ color: "var(--muted-foreground)" }}>{t("lead.origin")}: </span>
                  {lead.last_message ?? t("common.activeConversation")}
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
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  fontWeight: 700,
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {t("lead.close")}
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
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("common.loading")}</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
              {t("common.noMessagesYet")}
              <br />
              {t("common.startConversation")}
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
                      color: "var(--muted-foreground)",
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
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", marginLeft: 8, marginBottom: 2 }}>
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
            placeholder={t("chat.messagePlaceholder")}
            disabled={isSending}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14.5,
              color: "var(--foreground)",
              caretColor: "#5865f2",
            }}
          />
          <button
            onClick={handleAiSuggest}
            disabled={isSuggesting}
            title="Gerar resposta com IA"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "transparent",
              border: "1px solid rgba(148,163,184,.3)",
              cursor: isSuggesting ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: isSuggesting ? 0.5 : 1,
            }}
          >
            <Sparkles size={15} color="var(--chart-5)" />
          </button>
          <button
            onClick={handleSend}
            className="chat-send"
            disabled={!draft.trim() || isSending}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: draft.trim()
                ? "var(--gradient-primary)"
                : "var(--secondary)",
              border: "none",
              cursor: draft.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s, background 0.15s",
              flexShrink: 0,
            }}
          >
            <Send size={16} color="var(--foreground)" />
          </button>
        </div>
      </div>
    </div>
  );
}

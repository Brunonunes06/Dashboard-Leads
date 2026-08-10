import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Bot, Camera, Send } from "lucide-react";
import { toast } from "sonner";
import { useSupportChat } from "@/hooks/useSupportChat";
import { MessageDeleteMenu } from "@/components/MessageDeleteMenu";
import { supabase } from "@/lib/supabase";
import { generateAiReply } from "@/lib/api/ai-reply.functions";
import { buildSupportReplyInput } from "@/lib/support-ai-client";
import { useTranslation } from "@/lib/i18n";
import { isImageMessage, MAX_IMAGE_BYTES } from "@/lib/image-message";
import type { SupportMessage } from "@/data/supportChatTypes";

interface SupportChatWindowProps {
  threadUserId: string;
  currentUserId: string;
  currentRole: "client" | "admin";
  peerName: string;
  peerAvatarUrl?: string | null;
}

type MessageGroup = {
  senderId: string;
  isOwn: boolean;
  msgs: SupportMessage[];
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

function Avatar({ name, avatarUrl, size, isBot }: { name: string; avatarUrl?: string | null; size: number; isBot?: boolean }) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (isBot) {
    return (
      <div style={{ ...base, background: "rgba(88,101,242,.15)", border: "1px solid rgba(88,101,242,.4)" }}>
        <Bot size={size * 0.5} color="#5865f2" />
      </div>
    );
  }

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ ...base, objectFit: "cover" }} referrerPolicy="no-referrer" />;
  }

  return (
    <div
      style={{
        ...base,
        background: "var(--gradient-primary)",
        color: "var(--primary-foreground)",
        fontSize: size * 0.32,
        fontWeight: 700,
        textTransform: "uppercase",
        border: "1px solid rgba(16,185,129,.25)",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export function SupportChatWindow({
  threadUserId,
  currentUserId,
  currentRole,
  peerName,
  peerAvatarUrl,
}: SupportChatWindowProps) {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, deleteMessage, markAsRead } = useSupportChat(threadUserId);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) markAsRead(currentUserId);
  }, [messages.length, currentUserId, markAsRead]);

  // 'admin' e 'bot' são o mesmo "lado" da conversa (o suporte) — visualmente
  // alinhados juntos, do lado oposto do 'client'. Do ponto de vista de quem
  // está olhando (currentRole), esse lado é o "próprio" ou o "de fora".
  const isOwnMessage = (m: SupportMessage) =>
    currentRole === "client" ? m.sender_role === "client" : m.sender_role !== "client";

  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const own = isOwnMessage(msg);

    if (last && last.senderId === msg.sender_id && last.isOwn === own) {
      last.msgs.push(msg);
      continue;
    }

    groups.push({ senderId: msg.sender_id, isOwn: own, msgs: [msg] });
  }

  const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const shouldShowSeparator = (index: number) => {
    if (index === 0) return true;
    const previous = messages[index - 1];
    const current = messages[index];
    return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() > 30 * 60 * 1000;
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

  // Dispara a resposta automática da IA depois que o CLIENTE manda uma
  // mensagem — quem está com a aba aberta nesse instante é sempre o próprio
  // cliente (diferente do chat de leads, aqui não tem WhatsApp/webhook
  // envolvido), então não precisa de bot rodando no servidor.
  const triggerAiReply = async (justSentText: string) => {
    try {
      // Nunca manda a foto (base64) pra IA como texto — estouraria o
      // limite de contexto/custo à toa; ela só sabe que uma imagem foi
      // enviada.
      const history = [...messages, { sender_role: "client" as const, content: justSentText }].map((m) => ({
        sender_role: m.sender_role,
        content: isImageMessage(m.content) ? "[imagem]" : m.content,
      }));
      const input = buildSupportReplyInput(history);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const result = await generateAiReply({ data: { input, accessToken: session.access_token } });
      if (result.error || !result.text) return;
      await sendMessage(result.text, "bot", "bot");
    } catch (error) {
      console.error("[Suporte IA] Erro ao responder:", error);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    setDraft("");
    setIsSending(true);
    const messageId = await sendMessage(text, currentUserId, currentRole);
    setIsSending(false);
    inputRef.current?.focus();

    if (!messageId) {
      toast.error("Erro ao enviar mensagem");
      return;
    }
    if (currentRole === "client") triggerAiReply(text);
  };

  // Mesmo esquema do avatar em profile.tsx: converte pra data URL e manda
  // como o próprio conteúdo da mensagem.
  const handleImageFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande", { description: "Escolha uma foto de até 3MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setIsSending(true);
      const messageId = await sendMessage(dataUrl, currentUserId, currentRole);
      setIsSending(false);
      if (!messageId) {
        toast.error("Erro ao enviar imagem");
        return;
      }
      // A IA não recebe a imagem em si (ver triggerAiReply), mas ainda
      // reage à conversa quando o cliente manda uma foto.
      if (currentRole === "client") triggerAiReply("[imagem]");
    };
    reader.readAsDataURL(file);
  };

  let messageIndex = 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(148,163,184,.14)",
          background: "rgba(7, 10, 20, 0.72)",
          backdropFilter: "blur(18px)",
          minWidth: 0,
        }}
      >
        <Avatar name={peerName} avatarUrl={peerAvatarUrl} size={38} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--foreground)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {peerName}
        </span>
      </div>

      <div
        ref={scrollRef}
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
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const firstIndex = messageIndex;
            messageIndex += group.msgs.length;
            const isBot = group.msgs[0].sender_role === "bot";

            return (
              <div key={`${group.senderId}-${firstIndex}`}>
                {shouldShowSeparator(firstIndex) && (
                  <div style={{ textAlign: "center", margin: "14px 0 8px", fontSize: 11, color: "var(--muted-foreground)" }}>
                    {formatSeparator(group.msgs[0].created_at)}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                    justifyContent: group.isOwn ? "flex-end" : "flex-start",
                    marginBottom: 6,
                  }}
                >
                  {!group.isOwn && (
                    <Avatar name={isBot ? "IA" : peerName} avatarUrl={isBot ? null : peerAvatarUrl} size={26} isBot={isBot} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: group.isOwn ? "flex-end" : "flex-start", gap: 2 }}>
                    {!group.isOwn && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted-foreground)",
                          marginLeft: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {isBot ? "IA" : peerName}
                      </span>
                    )}
                    {group.msgs.map((m) => {
                      const isImage = isImageMessage(m.content);
                      const bubble = (
                        <div
                          style={{
                            maxWidth: "100%",
                            padding: isImage ? 4 : "9px 13px",
                            borderRadius: group.isOwn ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                            background: group.isOwn ? "var(--gradient-primary)" : "var(--secondary)",
                            color: group.isOwn ? "var(--primary-foreground)" : "var(--foreground)",
                            fontSize: 14,
                            lineHeight: 1.4,
                            overflowWrap: "break-word",
                          }}
                        >
                          {isImage ? (
                            <img
                              src={m.content}
                              alt="Foto"
                              style={{ display: "block", maxWidth: 240, maxHeight: 240, borderRadius: 14, objectFit: "cover" }}
                            />
                          ) : (
                            m.content
                          )}
                          <div
                            style={{
                              fontSize: 10,
                              marginTop: 4,
                              opacity: 0.7,
                              textAlign: "right",
                              padding: isImage ? "0 4px" : 0,
                            }}
                          >
                            {formatMessageTime(m.created_at)}
                          </div>
                        </div>
                      );

                      // Admin pode apagar qualquer mensagem da conversa
                      // (incluindo a do cliente ou da IA) — não só a
                      // própria. RLS já cobre isso (admins_all_support_messages).
                      const canDelete = currentRole === "admin" || m.sender_id === currentUserId;

                      if (!canDelete) {
                        return (
                          <div key={m.id} style={{ display: "table", maxWidth: "70%" }}>
                            {bubble}
                          </div>
                        );
                      }

                      return (
                        <MessageDeleteMenu
                          key={m.id}
                          align={group.isOwn ? "right" : "left"}
                          maxWidth="70%"
                          onDelete={async () => {
                            const ok = await deleteMessage(m.id);
                            if (!ok) toast.error("Erro ao excluir mensagem");
                          }}
                        >
                          {bubble}
                        </MessageDeleteMenu>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderTop: "1px solid rgba(148,163,184,.14)",
        }}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={isSending}
          aria-label="Enviar foto"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--muted-foreground)",
            display: "grid",
            placeItems: "center",
            cursor: isSending ? "default" : "pointer",
            opacity: isSending ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Camera size={16} />
        </button>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={t("chat.messagePlaceholder")}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 9999,
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !draft.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
            display: "grid",
            placeItems: "center",
            cursor: isSending || !draft.trim() ? "default" : "pointer",
            opacity: isSending || !draft.trim() ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

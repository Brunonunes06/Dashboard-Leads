import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSupportIdentity } from "@/hooks/useSupportIdentity";
import { useSupportThreads, type SupportThread } from "@/hooks/useSupportThreads";
import { SupportChatWindow } from "@/components/SupportChatWindow";
import { useTranslation } from "@/lib/i18n";
import { formatMessagePreview } from "@/lib/image-message";

// Sem checagem de sessão de propósito: quem ainda não tem conta também
// pode falar com o suporte (ver useSupportIdentity.ts — cria uma sessão
// anônima na hora).
export const Route = createFileRoute("/support")({
  component: SupportPage,
});

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function SupportPage() {
  const { t } = useTranslation();
  const { userId, isAdmin, loading, error } = useSupportIdentity();

  if (loading) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100dvh - 3.5rem)" }}
      >
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100dvh - 3.5rem)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "var(--foreground)", fontWeight: 600 }}>Não foi possível abrir o suporte</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          {error ?? "Tente novamente em instantes."}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{ height: "calc(100dvh - 3.5rem)", background: "var(--background)" }}
      >
        <SupportChatWindow
          threadUserId={userId}
          currentUserId={userId}
          currentRole="client"
          peerName="Digmans"
          peerAvatarUrl="/logo.webp"
        />
      </div>
    );
  }

  return <AdminSupportInbox adminId={userId} />;
}

function AdminSupportInbox({ adminId }: { adminId: string }) {
  const { t } = useTranslation();
  const { threads, isLoading } = useSupportThreads();
  const [selected, setSelected] = useState<SupportThread | null>(null);

  // Mantém a conversa aberta em sincronia com a lista — é assim que o
  // avatar (ou nome/última mensagem) atualiza ao vivo numa conversa que já
  // está aberta, sem precisar reabrir.
  useEffect(() => {
    if (!selected) return;
    const updated = threads.find((t) => t.user_id === selected.user_id);
    if (updated) setSelected(updated);
  }, [threads]);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[300px_1fr]"
      style={{ height: "calc(100dvh - 3.5rem)", background: "var(--background)" }}
    >
      <div
        className={`${selected ? "hidden" : "flex"} md:flex flex-col overflow-hidden`}
        style={{ borderRight: "1px solid var(--border)", background: "var(--background)" }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Suporte</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {isLoading ? (
            <p style={{ padding: 20, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
              {t("common.loading")}
            </p>
          ) : threads.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
              Nenhuma conversa de suporte ainda.
            </p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.user_id}
                onClick={() => setSelected(thread)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: selected?.user_id === thread.user_id ? "var(--secondary)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  margin: "2px 4px",
                  width: "calc(100% - 8px)",
                }}
              >
                <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "var(--secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      overflow: "hidden",
                    }}
                  >
                    {thread.avatarUrl ? (
                      <img
                        src={thread.avatarUrl}
                        alt={thread.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      getInitials(thread.name)
                    )}
                  </div>
                  {/* Fora do círculo com overflow:hidden de propósito — senão
                      a foto corta o selinho que fica pra fora da borda. */}
                  {thread.unread_count > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        background: "#5865f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--foreground)",
                        padding: "0 4px",
                        zIndex: 2,
                      }}
                    >
                      {thread.unread_count}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--foreground)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {thread.name}
                  </span>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--muted-foreground)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMessagePreview(thread.last_message) ?? thread.email}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${selected ? "flex" : "hidden"} md:flex min-h-0 flex-col overflow-hidden`}>
        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 border-b px-4 py-2.5 text-sm text-muted-foreground md:hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <ArrowLeft size={14} /> {t("common.back")}
            </button>
            <SupportChatWindow
              threadUserId={selected.user_id}
              currentUserId={adminId}
              currentRole="admin"
              peerName={selected.name}
              peerAvatarUrl={selected.avatarUrl}
            />
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--muted-foreground)",
            }}
          >
            <p style={{ fontSize: 13 }}>{t("common.selectConversation")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

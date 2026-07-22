// src/routes/admin/chat.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/permissions";
import { useLeads } from "@/hooks/useLeads";
import { ChatWindow } from "@/components/ChatWindow";
import { useTranslation } from "@/lib/i18n";

import type { LeadWithMeta } from "@/hooks/useLeads";

export const Route = createFileRoute("/leads/chat")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/" });
    if (!isAdminEmail(session.user.email)) {
      throw redirect({ to: "/" });
    }
    return { adminId: session.user.id, adminName: "CEO" };
  },
  component: AdminChatPage,
});

function AdminChatPage() {
  const { t } = useTranslation();
  const { adminId, adminName } = Route.useRouteContext();
  const { leads, isLoading, refetch } = useLeads();
  const [selected, setSelected] = useState<LeadWithMeta | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const STATUS_FILTERS: { key: string; label: string }[] = [
    { key: "todos", label: t("chat.filters.all") },
    { key: "novo", label: t("chat.filters.new") },
    { key: "qualificando", label: t("chat.filters.qualifying") },
    { key: "qualificado", label: t("chat.filters.qualified") },
    { key: "transferido", label: t("chat.filters.transferred") },
  ];

  const filteredLeads = useMemo(() => {
    const q = query.toLowerCase().trim();
    return leads.filter((l) => {
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (q && !`${l.name} ${l.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, query, statusFilter]);

  const timeAgo = (iso: string | null) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "calc(100vh - 3.5rem)",
        background: "#0e0e10",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e1e22",
          background: "#0e0e10",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #1e1e22",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t("lead.messages")}</span>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              color="#555"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("chat.searchPlaceholder")}
              style={{
                width: "100%",
                background: "#18181c",
                border: "1px solid #1e1e22",
                borderRadius: 8,
                padding: "8px 10px 8px 30px",
                fontSize: 13,
                color: "#fff",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 9999,
                  fontSize: 11,
                  border: "1px solid #1e1e22",
                  cursor: "pointer",
                  background: statusFilter === f.key ? "rgba(16,185,129,.15)" : "transparent",
                  color: statusFilter === f.key ? "#34d399" : "#777",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {isLoading ? (
            <p style={{ padding: 20, fontSize: 13, color: "#555", textAlign: "center" }}>
              {t("common.loading")}
            </p>
          ) : filteredLeads.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: "#555", textAlign: "center" }}>
              {leads.length ? t("common.noLeadsFiltered") : t("common.noLeadsYet")}
            </p>
          ) : (
            filteredLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelected(lead)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: selected?.id === lead.id ? "#1e1e2e" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  margin: "2px 4px",
                  width: "calc(100% - 8px)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (selected?.id !== lead.id)
                    (e.currentTarget as HTMLElement).style.background = "#18181c";
                }}
                onMouseLeave={(e) => {
                  if (selected?.id !== lead.id)
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#2d2d32",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {lead.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                  {lead.unread_count > 0 && (
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
                        color: "#fff",
                        padding: "0 4px",
                      }}
                    >
                      {lead.unread_count}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#fff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#555", flexShrink: 0, marginLeft: 6 }}>
                      {timeAgo(lead.last_message_at)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "#666",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {lead.last_message ?? lead.phone}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      {selected ? (
        <ChatWindow
          lead={selected}
          currentUserId={adminId}
          currentUserName={adminName}
          currentRole="admin"
          onTransferred={async () => {
            await refetch();
            setSelected((prev) => (prev ? { ...prev, status: "transferido" } : prev));
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "#333",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#333"
            strokeWidth="1.5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p style={{ fontSize: 13, color: "#444" }}>{t("common.selectConversation")}</p>
        </div>
      )}
    </div>
  );
}

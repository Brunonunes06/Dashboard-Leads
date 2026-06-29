// src/pages/ConversasPage.tsx
// VERSÃO REAL — dados vêm do Supabase, não mais de mocks
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";

function timeAgo(value: string): string {
  if (value === "agora") return "agora";
  return value;
}

const statusColors: Record<string, string> = {
  qualificado: "bg-emerald-500",
  qualificando: "bg-yellow-500",
  novo: "bg-blue-500",
  transferido: "bg-purple-500",
  descartado: "bg-slate-500",
};

export function ConversasPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { leads, loading, error, sendMessage, markAsRead } = useLeads();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const selected = leads.find((l) => l.id === selectedId) ?? leads[0] ?? null;

  async function handleSend() {
    if (!newMessage.trim() || !selected || !user) return;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    await sendMessage(selected.id, {
      sender: isAdmin ? "human" : "lead",
      text: newMessage.trim(),
      time,
    });
    setNewMessage("");
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    await markAsRead(id);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <aside className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white">Conversas</h1>
          <p className="text-slate-400 text-xs mt-0.5">{leads.length} leads</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => handleSelect(lead.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-800/50 hover:bg-slate-900 transition-colors ${selected?.id === lead.id ? "bg-slate-900 border-l-2 border-l-emerald-500" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm font-bold">
                    {lead.name[0]}
                  </div>
                  <span className="font-medium text-sm text-white truncate">{lead.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {lead.unread > 0 && (
                    <span className="bg-emerald-500 text-slate-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {lead.unread}
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">{timeAgo(lead.lastActivity)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pl-10">
                <p className="text-slate-400 text-xs truncate max-w-[160px]">{lead.lastMessage}</p>
                <span
                  className={`w-2 h-2 rounded-full ${statusColors[lead.status] ?? "bg-slate-500"}`}
                />
              </div>
            </button>
          ))}
        </div>
      </aside>

      {selected ? (
        <main className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                {selected.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm">{selected.name}</p>
                <p className="text-slate-400 text-xs">{selected.phone}</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 capitalize">
              {selected.status}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selected.messages.map((msg) => {
              const isMine =
                (isAdmin && (msg.sender === "human" || msg.sender === "ai")) ||
                (!isAdmin && msg.sender === "lead");
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === "ai" ? "bg-blue-500/20 border border-blue-500/30 text-blue-100" : isMine ? "bg-emerald-500 text-slate-950 rounded-br-sm" : "bg-slate-800 text-white rounded-bl-sm"}`}
                  >
                    {msg.sender === "ai" && (
                      <p className="text-xs font-semibold mb-1 text-blue-400">🤖 IA</p>
                    )}
                    <p className="leading-relaxed">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${isMine && msg.sender !== "ai" ? "text-slate-800/70 text-right" : "text-slate-500"}`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-slate-800">
            <div className="flex gap-3 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 p-3 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p className="text-slate-600 text-xs mt-2">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl">💬</span>
            <p className="text-slate-400 mt-3">Selecione uma conversa</p>
          </div>
        </main>
      )}
    </div>
  );
}

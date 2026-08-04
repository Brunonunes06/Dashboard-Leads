import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Clock, Inbox, Search, Send, TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Esta tela nao tem uma tabela real de leads do Instagram no Supabase (o site
// antigo tambem usava dados 100% ficticios aqui). Mantido como simulacao para
// paridade visual/funcional com o instagram.html original.

export const Route = createFileRoute("/instagram")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/" });
    if (!isAdminEmail(session.user.email)) throw redirect({ to: "/" });
  },
  component: InstagramCrmPage,
});

type IgStatus = "menu_inicial" | "interessado_painel" | "aguardando_suporte" | "finalizado";

interface IgMessage {
  sender: "lead" | "bot" | "human";
  text: string;
  time: string;
}

interface IgLead {
  id: string;
  senderId: string;
  avatar: string;
  status: IgStatus;
  lastMessage: string;
  lastContactIso: string;
  unread: number;
  messages: IgMessage[];
}

const STATUS_META: Record<IgStatus, { label: string; color: string }> = {
  menu_inicial: { label: "Menu Inicial", color: "var(--muted-foreground)" },
  interessado_painel: { label: "Interessado em Painel", color: "var(--primary)" },
  aguardando_suporte: { label: "Aguardando Suporte Humano", color: "var(--chart-2)" },
  finalizado: { label: "Finalizado", color: "var(--chart-5)" },
};

const MOCK_LEADS: IgLead[] = [
  {
    id: "l1",
    senderId: "@mariana.costa",
    avatar: "MC",
    status: "interessado_painel",
    lastMessage: "Quero saber o preço do painel solar de 5kW",
    lastContactIso: "2026-07-16T13:58:00.000Z",
    unread: 2,
    messages: [
      { sender: "lead", text: "Oi! Vi o anúncio de vocês.", time: "14:02" },
      {
        sender: "bot",
        text: "Olá Mariana! 👋 Eu sou o assistente Express. Como posso ajudar?\n\n1️⃣ Conhecer painéis solares\n2️⃣ Falar com um atendente",
        time: "14:02",
      },
      { sender: "lead", text: "1", time: "14:03" },
      {
        sender: "bot",
        text: "Ótima escolha! ☀️ Temos painéis de 3kW, 5kW e 10kW. Qual te interessa?",
        time: "14:03",
      },
      { sender: "lead", text: "Quero saber o preço do painel solar de 5kW", time: "14:04" },
    ],
  },
];

const WEEKLY_FLOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => ({
  day,
  recebidas: 12 + Math.round(Math.sin(i) * 6 + i * 3),
  qualificados: 4 + Math.round(Math.cos(i) * 3 + i * 1.5),
}));

function WeeklyFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium capitalize text-popover-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 text-popover-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_FILTERS: { value: "todos" | IgStatus; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "menu_inicial", label: "Menu Inicial" },
  { value: "interessado_painel", label: "Interessado em Painel" },
  { value: "aguardando_suporte", label: "Aguardando Suporte Humano" },
  { value: "finalizado", label: "Finalizado" },
];

function useRelativeTime(iso: string) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diffSec < 60) setLabel("agora");
    else if (diffSec < 3600) setLabel(`${Math.floor(diffSec / 60)} min`);
    else if (diffSec < 86400) setLabel(`${Math.floor(diffSec / 3600)}h`);
    else setLabel(`${Math.floor(diffSec / 86400)}d`);
  }, [iso]);
  return label;
}

function RelativeTime({ iso }: { iso: string }) {
  const label = useRelativeTime(iso);
  return <>{label}</>;
}

function InstagramCrmPage() {
  const [leads, setLeads] = useState<IgLead[]>(MOCK_LEADS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | IgStatus>("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  // Mesmo problema do dashboard (src/routes/index.tsx): o ResponsiveContainer
  // do Recharts as vezes nao remede sozinho quando a janela e redimensionada
  // (ex: virar pra largura mobile) ou quando a aba volta a ficar visivel — o
  // grafico renderiza em branco ate algo forcar um remount.
  const [chartEpoch, setChartEpoch] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  function toggleSeries(dataKey: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") setChartEpoch((n) => n + 1);
    };
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setChartEpoch((n) => n + 1), 150);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  const metrics = useMemo(() => {
    const waiting = leads.filter((l) => l.status === "aguardando_suporte").length;
    const finalized = leads.filter((l) => l.status === "finalizado").length;
    const rate = leads.length ? Math.round((finalized / leads.length) * 100) : 0;
    return [
      { icon: Users, label: "Total de Leads", value: leads.length, color: "var(--primary)" },
      { icon: Inbox, label: "Recebidos Hoje", value: leads.length, color: "var(--chart-2)" },
      { icon: Clock, label: "Aguardando Resposta", value: waiting, color: "var(--chart-3)" },
      { icon: TrendingUp, label: "Taxa de Conversão", value: `${rate}%`, color: "var(--chart-5)" },
    ];
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return leads
      .filter((l) => statusFilter === "todos" || l.status === statusFilter)
      .filter(
        (l) =>
          !q ||
          l.senderId.toLowerCase().includes(q) ||
          l.lastMessage.toLowerCase().includes(q) ||
          l.messages.some((m) => m.text.toLowerCase().includes(q)),
      )
      .sort((a, b) => +new Date(b.lastContactIso) - +new Date(a.lastContactIso));
  }, [leads, query, statusFilter]);

  const openLead = leads.find((l) => l.id === openId) ?? null;

  function selectLead(id: string) {
    setOpenId(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, unread: 0 } : l)));
  }

  function sendReply() {
    const text = reply.trim();
    if (!text || !openId) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === openId
          ? {
              ...l,
              lastMessage: text,
              lastContactIso: new Date().toISOString(),
              messages: [
                ...l.messages,
                {
                  sender: "human",
                  text,
                  time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : l,
      ),
    );
    setReply("");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Camera className="h-3.5 w-3.5" /> CRM · Direct Messages
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Leads do Instagram</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe conversas qualificadas pelo robô Express em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-start justify-between pt-6">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="font-display mt-2 text-2xl font-semibold">{m.value}</p>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary" style={{ color: m.color }}>
                <m.icon className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fluxo de Leads · 7 dias</CardTitle>
          <p className="text-[11px] text-muted-foreground">Mensagens recebidas vs. leads qualificados</p>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer key={chartEpoch} width="100%" height="100%">
            <LineChart data={WEEKLY_FLOW}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={24} />
              <Tooltip cursor={{ stroke: "var(--muted)" }} content={<WeeklyFlowTooltip />} />
              <Legend
                iconType="square"
                iconSize={9}
                wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
                onClick={(entry: any) => entry?.dataKey && toggleSeries(String(entry.dataKey))}
                formatter={(value, entry: any) => {
                  const isHidden = entry?.dataKey && hiddenSeries.has(String(entry.dataKey));
                  return (
                    <span
                      className="text-muted-foreground"
                      style={{ opacity: isHidden ? 0.4 : 1, textDecoration: isHidden ? "line-through" : "none" }}
                    >
                      {value}
                    </span>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="recebidas"
                name="Recebidas"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ r: 3 }}
                opacity={hiddenSeries.has("recebidas") ? 0 : 1}
                animationDuration={350}
              />
              <Line
                type="monotone"
                dataKey="qualificados"
                name="Qualificados"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
                opacity={hiddenSeries.has("qualificados") ? 0 : 1}
                animationDuration={350}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por @senderId ou conteúdo…"
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {leads.length} leads
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Sender</th>
                <th className="px-5 py-3">Última mensagem</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Último contato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-sm text-muted-foreground">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const meta = STATUS_META[l.status];
                  return (
                    <tr
                      key={l.id}
                      onClick={() => selectLead(l.id)}
                      className="cursor-pointer border-b last:border-0 hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-[11px] font-medium text-white">
                            {l.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{l.senderId}</span>
                              {l.unread > 0 && (
                                <Badge className="h-4 rounded-full px-1.5 text-[10px]">{l.unread}</Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">Instagram Direct</span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[420px] truncate px-5 py-3">{l.lastMessage}</td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-[11px] text-muted-foreground">
                        <RelativeTime iso={l.lastContactIso} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={openLead !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
          {openLead && (
            <>
              <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b p-4 text-left">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-[13px] font-medium text-white">
                  {openLead.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-display text-[15px]">{openLead.senderId}</SheetTitle>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Camera className="h-3 w-3" /> Direct Message
                  </p>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-2.5 overflow-y-auto bg-black/10 p-4">
                {openLead.messages.map((m, i) => {
                  const mine = m.sender !== "lead";
                  const label = m.sender === "bot" ? "Express Bot" : m.sender === "human" ? "Você" : "Lead";
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : ""}`}>
                      <div className="max-w-[85%] rounded-2xl border bg-card px-3 py-2 text-sm">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </div>
                        <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Responder como humano…"
                  />
                  <Button size="icon" onClick={sendReply} aria-label="Enviar">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Sua resposta substitui o robô Express nesta conversa.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bot,
  Clock3,
  Inbox,
  Instagram,
  MessageSquareText,
  Search,
  Send,
  TrendingUp,
  User2,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  STATUS_META,
  useInstagramStore,
  weeklyFlow,
  type IGStatus,
} from "@/stores/instagramStore";

export const Route = createFileRoute("/instagram")({
  head: () => ({
    meta: [
      { title: "CRM Instagram · Resposta" },
      { name: "description", content: "Painel de leads vindos do Instagram." },
    ],
  }),
  component: InstagramCRM,
});

const STATUS_OPTIONS: { value: "todos" | IGStatus; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "menu_inicial", label: "Menu Inicial" },
  { value: "interessado_painel", label: "Interessado em Painel" },
  { value: "aguardando_suporte", label: "Aguardando Suporte Humano" },
  { value: "finalizado", label: "Finalizado" },
];

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function StatusPill({ status }: { status: IGStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        m.className,
      )}
    >
      <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </Badge>
  );
}

function InstagramCRM() {
  const { leads, sendHumanReply, markRead } = useInstagramStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | IGStatus>("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return leads
      .filter((l) => (statusFilter === "todos" ? true : l.status === statusFilter))
      .filter((l) =>
        q
          ? l.senderId.toLowerCase().includes(q) ||
            l.lastMessage.toLowerCase().includes(q) ||
            l.messages.some((m) => m.text.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => +new Date(b.lastContact) - +new Date(a.lastContact));
  }, [leads, query, statusFilter]);

  const metrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = leads.filter((l) => new Date(l.lastContact) >= todayStart).length;
    const waiting = leads.filter((l) => l.status === "aguardando_suporte").length;
    const finalized = leads.filter((l) => l.status === "finalizado").length;
    const rate = leads.length ? Math.round((finalized / leads.length) * 100) : 0;
    return { total: leads.length, today, waiting, rate };
  }, [leads]);

  const active = openId ? leads.find((l) => l.id === openId) : null;

  function openLead(id: string) {
    setOpenId(id);
    markRead(id);
  }

  function send() {
    if (!draft.trim() || !active) return;
    sendHumanReply(active.id, draft.trim());
    setDraft("");
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Instagram className="h-3.5 w-3.5" />
            CRM · Direct Messages
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Leads do Instagram
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe conversas qualificadas pelo robô Express em tempo real.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total de Leads"
          value={metrics.total}
          accent="text-primary"
        />
        <MetricCard
          icon={Inbox}
          label="Mensagens Recebidas Hoje"
          value={metrics.today}
          accent="text-emerald-400"
        />
        <MetricCard
          icon={Clock3}
          label="Aguardando Resposta"
          value={metrics.waiting}
          accent="text-amber-400"
        />
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${metrics.rate}%`}
          accent="text-sky-400"
        />
      </div>

      {/* Chart */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Fluxo de Leads · 7 dias</h2>
            <p className="text-xs text-muted-foreground">
              Volume de mensagens recebidas vs. leads qualificados
            </p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyFlow} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="recebidas"
                name="Recebidas"
                stroke="oklch(0.65 0.18 200)"
                fill="url(#g1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="qualificados"
                name="Qualificados"
                stroke="oklch(0.74 0.17 155)"
                fill="url(#g2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por @senderId ou conteúdo da mensagem…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} de {leads.length} leads
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Última mensagem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Último contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => openLead(lead.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-xs font-medium text-foreground">
                        {lead.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{lead.senderId}</span>
                        {lead.unread > 0 && (
                          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {lead.unread}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">Instagram Direct</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[420px]">
                  <p className="truncate text-sm text-foreground/80">{lead.lastMessage}</p>
                </TableCell>
                <TableCell>
                  <StatusPill status={lead.status} />
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {relTime(lead.lastContact)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Conversation Sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {active && (
            <>
              <SheetHeader className="border-b border-border/60 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-sm font-medium">
                      {active.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <SheetTitle className="text-base">{active.senderId}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 text-xs">
                      <Instagram className="h-3 w-3" /> Direct Message
                    </SheetDescription>
                  </div>
                  <StatusPill status={active.status} />
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                {active.messages.map((m) => (
                  <Bubble key={m.id} sender={m.sender} text={m.text} time={m.time} />
                ))}
              </div>

              <div className="border-t border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Responder como humano…"
                  />
                  <Button size="icon" onClick={send} disabled={!draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
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

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("rounded-lg bg-muted/40 p-2", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Bubble({ sender, text, time }: { sender: "lead" | "bot" | "human"; text: string; time: string }) {
  const isMine = sender !== "lead";
  const meta =
    sender === "bot"
      ? { name: "Express Bot", icon: Bot, cls: "bg-primary/15 text-foreground border-primary/30" }
      : sender === "human"
        ? { name: "Você", icon: User2, cls: "bg-sky-500/15 text-foreground border-sky-500/30" }
        : { name: "Lead", icon: MessageSquareText, cls: "bg-card text-foreground border-border" };
  const Icon = meta.icon;
  return (
    <div className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] rounded-2xl border px-3 py-2 text-sm", meta.cls)}>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {meta.name}
          <span className="ml-auto">{time}</span>
        </div>
        <p className="whitespace-pre-line leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Bot, Building2, CheckCheck, MapPin, Phone, Search, Send, Sparkles, User, Wallet } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { leads as initialLeads, type Lead, type LeadStatus, type Message } from "@/data/mockLeads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Conversas · Resposta" },
      { name: "description", content: "Acompanhe leads do WhatsApp, qualifique com IA e transfira para vendedores humanos." },
    ],
  }),
  component: LeadsPage,
});

const filters: { key: "todos" | LeadStatus; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novos" },
  { key: "qualificando", label: "Qualificando" },
  { key: "qualificado", label: "Qualificados" },
  { key: "transferido", label: "Transferidos" },
];

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState(initialLeads[0].id);
  const [filter, setFilter] = useState<"todos" | LeadStatus>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filter !== "todos" && l.status !== filter) return false;
      if (query && !`${l.name} ${l.property} ${l.phone}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [leads, filter, query]);

  const active = leads.find((l) => l.id === activeId) ?? leads[0];

  function sendHumanMessage(text: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === active.id
          ? {
              ...l,
              lastMessage: text,
              lastActivity: "agora",
              messages: [
                ...l.messages,
                { id: `m${Date.now()}`, sender: "human", text, time: nowLabel() },
              ],
            }
          : l
      )
    );
    toast.success("Mensagem enviada", { description: "O lead recebeu no WhatsApp." });
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[360px_1fr] xl:grid-cols-[360px_1fr_320px]">
      {/* Lista */}
      <aside className="flex min-h-0 flex-col border-r border-border/60 bg-card/40">
        <div className="space-y-3 border-b border-border/60 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lead, telefone, imóvel…"
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="h-9 w-full justify-start gap-1 bg-transparent p-0">
              {filters.map((f) => (
                <TabsTrigger
                  key={f.key}
                  value={f.key}
                  className="h-7 rounded-full border border-border/60 px-3 text-[11px] data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lead com esses filtros.</div>
          )}
          {filtered.map((lead) => {
            const isActive = lead.id === active.id;
            return (
              <button
                key={lead.id}
                onClick={() => setActiveId(lead.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-secondary/40"
                )}
              >
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase">
                  {lead.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  {lead.unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {lead.unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{lead.lastActivity}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.lastMessage}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={lead.status} />
                    <span className="text-[10px] text-muted-foreground">score {lead.score}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Conversa */}
      <ConversationPane lead={active} onSend={sendHumanMessage} />

      {/* Painel lateral */}
      <LeadDetails lead={active} className="hidden xl:flex" />
    </div>
  );
}

function ConversationPane({ lead, onSend }: { lead: Lead; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lead.id, lead.messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase">
            {lead.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{lead.name}</p>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-xs text-muted-foreground">{lead.phone} · {lead.source}</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="outline" size="sm"><Phone className="mr-1.5 h-3.5 w-3.5" /> Ligar</Button>
          <Button size="sm" className="gradient-primary text-primary-foreground hover:opacity-90">
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Transferir
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-6">
        {lead.messages.map((m) => <MessageBubble key={m.id} m={m} />)}
      </div>

      <form onSubmit={submit} className="border-t border-border/60 bg-card/40 px-5 py-3">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Responder como humano…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" size="icon" className="h-10 w-10 rounded-full gradient-primary text-primary-foreground hover:opacity-90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          IA está pausada nesta conversa enquanto você digita · enter para enviar
        </p>
      </form>
    </section>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const isLead = m.sender === "lead";
  const isAI = m.sender === "ai";

  return (
    <div className={cn("flex gap-2", isLead ? "justify-start" : "justify-end")}>
      {isLead && (
        <div className="grid h-7 w-7 shrink-0 place-items-center self-end rounded-full bg-secondary text-[10px] font-semibold uppercase">
          L
        </div>
      )}
      <div className={cn("max-w-[75%] space-y-1", !isLead && "items-end text-right")}>
        {!isLead && (
          <div className={cn("flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider", isAI ? "text-primary" : "text-chart-5")}>
            {isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {isAI ? "IA Resposta" : "Você"}
          </div>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isLead && "rounded-tl-sm bg-secondary text-foreground",
            isAI && "rounded-tr-sm bg-primary/15 text-foreground ring-1 ring-primary/20",
            m.sender === "human" && "rounded-tr-sm gradient-primary text-primary-foreground"
          )}
        >
          {m.text}
        </div>
        <div className="px-1 text-[10px] text-muted-foreground">{m.time}</div>
      </div>
    </div>
  );
}

function LeadDetails({ lead, className }: { lead: Lead; className?: string }) {
  return (
    <aside className={cn("min-h-0 flex-col border-l border-border/60 bg-card/40 p-5", className)}>
      <div className="flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-base font-semibold uppercase">
          {lead.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <h3 className="mt-3 font-semibold">{lead.name}</h3>
        <p className="text-xs text-muted-foreground">{lead.phone}</p>
        <StatusBadge status={lead.status} className="mt-2" />
      </div>

      <Card className="mt-5 border-border/60 bg-background/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Score de qualidade</span>
          <span className="font-display text-2xl font-semibold text-primary">{lead.score}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full gradient-primary" style={{ width: `${lead.score}%` }} />
        </div>
      </Card>

      <div className="mt-5 space-y-3 text-sm">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Qualificação IA</h4>
        <DetailRow icon={Building2} label="Imóvel" value={lead.property} />
        <DetailRow icon={Wallet} label="Orçamento" value={lead.budget ?? "—"} />
        <DetailRow icon={Sparkles} label="Quartos" value={lead.bedrooms ?? "—"} />
        <DetailRow icon={MapPin} label="Região" value={lead.region ?? "—"} />
        <DetailRow icon={Bot} label="Intenção" value={lead.intent ?? "Em qualificação"} />
      </div>

      <div className="mt-auto pt-5">
        <Button className="w-full gradient-primary text-primary-foreground hover:opacity-90">
          <CheckCheck className="mr-2 h-4 w-4" /> Marcar como transferido
        </Button>
      </div>
    </aside>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

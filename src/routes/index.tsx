import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Clock, MessageCircle, Target, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { leads, sources, weeklyData } from "@/data/mockLeads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão geral · Resposta" },
      { name: "description", content: "Métricas de leads, tempo de resposta e qualificação por IA em tempo real." },
    ],
  }),
  component: Dashboard,
});

const metrics = [
  { label: "Leads hoje", value: "47", delta: "+19%", icon: Users, accent: "text-chart-2" },
  { label: "Tempo médio de resposta", value: "3,2s", delta: "−42%", icon: Clock, accent: "text-primary" },
  { label: "Taxa de qualificação", value: "44%", delta: "+9%", icon: Target, accent: "text-warning" },
  { label: "Transferidos ao vendedor", value: "21", delta: "+6", icon: TrendingUp, accent: "text-chart-5" },
];

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Bom dia, Bruno 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua IA já respondeu <span className="font-medium text-foreground">47 leads</span> hoje. 21 foram qualificados e estão prontos para você.
          </p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Link to="/leads">
            Ver conversas <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="relative overflow-hidden border-border/60 bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-xl bg-secondary ${m.accent}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{m.delta}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{m.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads x Qualificados · últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#fff", fontWeight: 600 }}
                />

                <Bar dataKey="leads" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="qualificados" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Origem dos leads</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="value" innerRadius={45} outerRadius={72} paddingAngle={3} stroke="none">
                    {sources.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff", fontWeight: 600 }}
                  />

                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {sources.map((s) => (
                <div
                  key={s.name}
                  className="group flex items-center justify-between rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground transition-colors group-hover:text-white">{s.name}</span>
                  </div>
                  <span className="font-medium transition-colors group-hover:text-white">{s.value}%</span>
                </div>
              ))}
            </div>

          </CardContent>

        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Atividade recente</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads">Ver tudo</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {leads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                to="/leads"
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold uppercase">
                  {lead.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{lead.lastMessage}</p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <div className="flex items-center justify-end gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {lead.responseTime}
                  </div>
                  <div>{lead.lastActivity}</div>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary/60">
                  <span className="font-display text-sm font-semibold text-primary">{lead.score}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

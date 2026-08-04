import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { ArrowUpRight, Clock, Target, TrendingUp, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { useTranslation } from "@/lib/i18n";
import { registerAccountForIp } from "@/lib/api/ip-guard.functions";
import { verifyRecaptcha } from "@/lib/api/recaptcha.functions";
import { getRecaptchaToken } from "@/lib/recaptcha-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function decodeGoogleCredential(token: string): GoogleProfile {
  const payload = token.split(".")[1];
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json) as GoogleProfile;
}

function SourcesTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const percent = Math.round((entry.value / total) * 100);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-1.5 text-popover-foreground">
        <span className="h-2 w-2 rounded-sm" style={{ background: entry.payload.color }} />
        <span className="text-muted-foreground">{entry.name}:</span>
        <span className="font-semibold">{percent}%</span>
      </div>
    </div>
  );
}

function WeeklyChartTooltip({ active, payload, label }: any) {
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

function getPeriodGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t("greeting.morning");
  if (hour >= 12 && hour < 18) return t("greeting.afternoon");
  return t("greeting.evening");
}

// "Origem dos leads" nao tem campo correspondente na tabela real de leads do
// Supabase (nunca teve — no site antigo tambem era um numero fixo hardcoded
// em assets/data.js, nao vinculado a nenhum dado real). Mantido aqui como
// demonstracao visual identica ao design original, ate existir uma coluna
// real de origem para substituir por dado de verdade.

// GRAFICO LEADS
// grafico leads
const DEMO_SOURCES = [
  { name: "Instagram Ads", value: 50, color: "var(--primary)" },
  { name: "Google Ads", value: 50, color: "var(--chart-2)" },
  { name: "Facebook Ads", value: 50, color: "var(--chart-3)" },
  { name: "Site/Orgânico", value: 50, color: "var(--chart-5)" },
];

// Usado so quando ainda nao existe nenhum lead real (conta nova) — assim o
// grafico nunca aparece vazio. Assim que houver leads de verdade, o grafico
// passa a usar os dados reais automaticamente.
const DEMO_WEEKDAY_LABELS: Record<string, string[]> = {
  pt: ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
};
const DEMO_WEEKLY_VALUES = [
  { leads: 50, qualificados: 30 },
  { leads: 24, qualificados: 11 },
  { leads: 10, qualificados: 14 },
  { leads: 27, qualificados: 12 },
  { leads: 42, qualificados: 19 },
  { leads: 35, qualificados: 16 },
  { leads: 22, qualificados: 9 },
];
function getDemoWeeklyData(locale: string) {
  const labels = DEMO_WEEKDAY_LABELS[locale] ?? DEMO_WEEKDAY_LABELS.pt;
  return DEMO_WEEKLY_VALUES.map((v, i) => ({ label: labels[i], ...v }));
}

const DATE_LOCALE: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

function DashboardPage() {
  const { t, locale } = useTranslation();
  const { user, login, logout } = useAuth();
  const { leads, isLoading } = useLeads();
  const [session, setSession] = useState<Session | null>(null);
  const [blockReason, setBlockReason] = useState<{ code: string; message: string } | null>(null);
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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  // O ResponsiveContainer do Recharts mede o tamanho via ResizeObserver e nao
  // reage sozinho quando a aba volta do segundo plano (troca de app, tela
  // bloqueada) ou quando a janela e redimensionada (ex: virar pra largura
  // mobile) — a medida fica presa no valor antigo e o grafico renderiza
  // espremido/em branco. Forcamos um remount (via key) nesses dois casos,
  // para ele reme dir do zero.
  const [chartEpoch, setChartEpoch] = useState(0);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setChartEpoch((n) => n + 1);
      }
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

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    try {
      const profile = decodeGoogleCredential(response.credential);

      const recaptchaToken = await getRecaptchaToken("login");
      if (recaptchaToken) {
        const recaptchaCheck = await verifyRecaptcha({ data: { token: recaptchaToken } }).catch((err) => {
          console.warn("[reCAPTCHA] Verificacao indisponivel, login liberado:", err);
          return { allowed: true as const, score: 1 };
        });
        if (!recaptchaCheck.allowed) {
          setBlockReason({ code: recaptchaCheck.code, message: recaptchaCheck.message });
          return;
        }
      }

      const ipCheck = await registerAccountForIp({ data: { idToken: response.credential } }).catch((err) => {
        console.warn("[Auth] Validacao de IP/VPN indisponivel, login liberado:", err);
        return { allowed: true as const };
      });

      if (!ipCheck.allowed) {
        setBlockReason({ code: ipCheck.code, message: ipCheck.message });
        return;
      }

      login({
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (error) {
        console.error("Erro ao autenticar no Supabase:", error);
        toast.warning("Login parcial", {
          description: "Perfil salvo, mas a sessão de mensagens não pôde ser criada.",
        });
      } else {
        toast.success("Login com Google realizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro no login Google:", error);
      toast.error("Erro no login", { description: "Falha ao processar os dados do Google." });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    logout();
    toast.success("Sessão encerrada");
  }

  const displayName = user?.name ?? session?.user?.email ?? null;

  // Realtime dispara fetchLeads (nova referencia de `leads`) a cada mensagem
  // nova, mesmo quando isso nao muda created_at/status de nenhum lead. Sem
  // essa assinatura, o BarChart recebia um array novo a cada mensagem e
  // reanimava do zero — e a combinacao Recharts 2.15 + React 19 as vezes
  // trava nesse re-mount no meio da animacao (barras somem).
  const leadsSignature = useMemo(
    () => leads.map((l) => `${l.id}:${l.created_at}:${l.status}`).join(","),
    [leads],
  );

  const weeklyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const real = days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayLeads = leads.filter((l) => {
        const created = new Date(l.created_at);
        return created >= day && created < next;
      });
      const qualificados = dayLeads.filter(
        (l) => l.status === "qualificado" || l.status === "qualificando",
      ).length;
      return {
        label: day.toLocaleDateString(DATE_LOCALE[locale], { weekday: "short" }).replace(".", ""),
        leads: dayLeads.length,
        qualificados,
      };
    });

    // Se nenhum lead caiu nos últimos 7 dias (conta nova ou leads mais
    // antigos que a janela do gráfico), os buckets reais ficam todos zerados
    // — e como o Recharts não desenha barra nenhuma para altura 0, o gráfico
    // parece quebrado (eixo aparece, barras não). Nesse caso mostramos o
    // demo em vez de um gráfico real vazio.
    const hasActivityThisWeek = real.some((d) => d.leads > 0 || d.qualificados > 0);
    return hasActivityThisWeek ? real : getDemoWeeklyData(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsSignature, locale]);

  const metrics = useMemo(() => {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const leadsHoje = leads.filter((l) => new Date(l.created_at) >= today0).length;
    const qualificados = leads.filter(
      (l) => l.status === "qualificado" || l.status === "qualificando",
    ).length;
    const taxaQualificacao = leads.length ? Math.round((qualificados / leads.length) * 100) : 0;
    const transferidos = leads.filter((l) => l.status === "transferido").length;
    return [
      { label: t("dashboard.metric.leadsToday"), value: leadsHoje, icon: Users, color: "var(--chart-2)" },
      { label: t("dashboard.metric.avgResponse"), value: "3,2s", icon: Clock, color: "var(--primary)" },
      { label: t("dashboard.metric.qualRate"), value: `${taxaQualificacao}%`, icon: Target, color: "var(--chart-3)" },
      { label: t("dashboard.metric.transferred"), value: transferidos, icon: TrendingUp, color: "var(--chart-5)" },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsSignature, t]);

  const sourcesTotal = DEMO_SOURCES.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <AlertDialog open={blockReason !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acesso bloqueado</AlertDialogTitle>
            <AlertDialogDescription>{blockReason?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setBlockReason(null)}>Entendi</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {getPeriodGreeting(t)}
            {displayName ? `, ${displayName}` : ",  "} 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("dashboard.subtitlePrefix")}{" "}
            <strong className="text-foreground">{leads.length} leads</strong>{" "}
            {t("dashboard.subtitleSuffix")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {displayName ? (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              {t("common.logout")}
            </Button>
          ) : GOOGLE_CLIENT_ID ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Erro ao inicializar o login Google")}
                shape="pill"
                size="large"
                theme="outline"
              />
            </GoogleOAuthProvider>
          ) : null}
          {user?.role === "admin" && (
            <Button asChild>
              <Link to="/leads/chat" className="inline-flex items-center gap-1">
                {t("common.viewDetails")} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-start justify-between pt-6">
              <div>
                <p className="font-display text-2xl font-semibold">{m.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
              </div>
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary"
                style={{ color: m.color }}
              >
                <m.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("dashboard.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer
              key={`${chartEpoch}-${leadsSignature}`}
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              debounce={100}
            >
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={24} />
                <Tooltip cursor={{ fill: "var(--muted)" }} content={<WeeklyChartTooltip />} />
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
                <Bar
                  dataKey="leads"
                  name={t("chart.leads")}
                  radius={[4, 4, 0, 0]}
                  fill="var(--chart-2)"
                  isAnimationActive
                  animationDuration={350}
                  animationEasing="ease-out"
                  opacity={hiddenSeries.has("leads") ? 0 : 1}
                />
                <Bar
                  dataKey="qualificados"
                  name={t("chart.qualified")}
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                  isAnimationActive
                  animationDuration={350}
                  animationEasing="ease-out"
                  opacity={hiddenSeries.has("qualificados") ? 0 : 1}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("dashboard.sourcesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:h-[220px] sm:flex-row">
            <div className="h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer key={chartEpoch} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEMO_SOURCES}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    isAnimationActive={false}
                  >
                    {DEMO_SOURCES.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<SourcesTooltip total={sourcesTotal} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex w-full flex-1 flex-col gap-2 sm:w-auto">
              {DEMO_SOURCES.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold">{Math.round((s.value / sourcesTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {user?.role === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{t("dashboard.activeLeads")}</CardTitle>
            <Link to="/leads/chat" className="text-xs text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : leads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("common.noLeadsYet")}</p>
            ) : (
              leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.last_message ?? lead.phone}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">score {lead.score}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

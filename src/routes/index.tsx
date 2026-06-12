import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
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
import {
  ArrowUpRight,
  Clock,
  MessageCircle,
  Target,
  TrendingUp,
  Users,
  Send,
  Mail,
  Phone,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { sources, weeklyData } from "@/data/mockLeads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Central de Webhooks" },
      {
        name: "description",
        content: "Métricas de leads, tempo de resposta e qualificação em tempo real.",
      },
    ],
  }),
  component: DashboardWrapper,
});

// Substitua pelo seu Client ID real gerado no Google Cloud Console
const GOOGLE_CLIENT_ID = "503517426148-qnavb54arur62q39edqr5r1fkrocbdat.apps.googleusercontent.com";

function DashboardWrapper() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Dashboard />
    </GoogleOAuthProvider>
  );
}

// Interface que espelha exatamente a estrutura dinâmica enviada pelo seu backend
interface BackendLead {
  id: string;
  status: string;
  ultimaMensagem: string;
}

const metrics = [
  {
    label: "Leads hoje",
    value: "47",
    delta: "+19%",
    icon: Users,
    accent: "text-chart-2",
  },
  {
    label: "Tempo médio de resposta",
    value: "3,2s",
    delta: "−42%",
    icon: Clock,
    accent: "text-primary",
  },
  {
    label: "Taxa de qualificação",
    value: "44%",
    delta: "+9%",
    icon: Target,
    accent: "text-warning",
  },
  {
    label: "Transferidos ao vendedor",
    value: "21",
    delta: "+6",
    icon: TrendingUp,
    accent: "text-chart-5",
  },
];

function Dashboard() {
  const [userName, setUserName] = useState("Usuário");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  
  // Estado que armazena os dados reais vindos da API do seu server.js
  const [leadsReais, setLeadsReais] = useState<BackendLead[]>([]);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(true);

  // 📥 CONEXÃO EM TEMPO REAL COM O BACKEND (server.js)
  useEffect(() => {
    async function carregarDadosDoServidor() {
      try {
        const res = await fetch('http://localhost:3000/api/leads', {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const dados = await res.json();
          setLeadsReais(dados);
        }
      } catch (error) {
        console.error("Erro ao sincronizar com a API de leads:", error);
      } finally {
        setLoadingBackend(false);
      }
    }

    carregarDadosDoServidor();

    // Sincronização viva: atualiza a lista da tabela a cada 4 segundos
    const intervaloSincronia = setInterval(carregarDadosDoServidor, 4000);
    return () => clearInterval(intervaloSincronia);
  }, []);

  // Carrega os dados salvos de login do usuário do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("userName");
      const savedEmail = localStorage.getItem("userEmail");
      const savedPhone = localStorage.getItem("userPhone");

      if (savedName) setUserName(savedName);
      if (savedEmail) setUserEmail(savedEmail);
      if (savedPhone) {
        setUserPhone(savedPhone);
        setInputPhone(savedPhone);
      }
      if (savedName || savedEmail) setIsLoggedIn(true);
    }
  }, []);

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;

    const profile = parseJwt(credentialResponse.credential);

    if (profile) {
      const name = profile.name || "Usuário Google";
      const email = profile.email || "";

      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);
      
      setUserName(name);
      setUserEmail(email);
      setIsLoggedIn(true);

      const telefoneDestino = localStorage.getItem("userPhone") || "5511999999999";
      await enviarNotificacaoWhatsapp(
        `Olá ${name}, login efetuado com sucesso usando o e-mail: ${email}!`,
        telefoneDestino
      );
    }
  };

  const handleSavePhone = () => {
    localStorage.setItem("userPhone", inputPhone);
    setUserPhone(inputPhone);
    setIsEditingPhone(false);
    
    enviarNotificacaoWhatsapp(
      `Número de WhatsApp vinculado com sucesso ao perfil de ${userName}!`,
      inputPhone
    );
  };

  const enviarNotificacaoWhatsapp = async (mensagem: string, numeroDestino: string) => {
    if (!numeroDestino) {
      console.warn("Nenhum número de telefone fornecido para o envio.");
      return;
    }

    try {
      console.log(`Disparando WhatsApp para ${numeroDestino}: "${mensagem}"`);
      
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: mensagem,
          number: numeroDestino.replace(/\D/g, ""),
        }),
      });

      if (response.ok) {
        console.log("Mensagem de WhatsApp enviada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao conectar com a API do WhatsApp:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");
    setUserName("Usuário");
    setUserEmail("");
    setUserPhone("");
    setInputPhone("");
    setIsLoggedIn(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      
      {/* SEÇÃO DO CABEÇALHO: Login, E-mail e WhatsApp */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Bom dia, {userName} 👋
          </h1>
          
          {isLoggedIn && (
            <div className="flex flex-col gap-1.5 mt-2 text-sm text-muted-foreground">
              {userEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>{userEmail}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-green-500" />
                {isEditingPhone ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Ex: 5511999999999"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      className="h-7 w-44 text-xs bg-secondary"
                    />
                    <Button onClick={handleSavePhone} size="sm" className="h-7 px-2 text-xs">
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{userPhone ? `WhatsApp: ${userPhone}` : "Nenhum WhatsApp cadastrado"}</span>
                    <button 
                      onClick={() => setIsEditingPhone(true)} 
                      className="text-xs text-primary underline hover:text-primary/80"
                    >
                      {userPhone ? "Alterar" : "Adicionar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="mt-2 text-sm text-muted-foreground">
            Sua central processou <span className="font-medium text-foreground">{leadsReais.length} leads via webhook</span> em tempo real nesta seção.
          </p>
        </div>

        {/* Botões de Ações */}
        <div className="flex flex-wrap items-center gap-3">
          {!isLoggedIn ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log("Falha na autenticação")}
              useOneTap
              theme="filled_black"
              shape="pill"
            />
          ) : (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair da conta
            </Button>
          )}

          <Button asChild className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/leads">
              Ver detalhado <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
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
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {m.label === "Leads hoje" ? leadsReais.length || m.value : m.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* GRÁFICOS */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico de Barras */}
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

        {/* Gráfico de Origens (Pie) */}
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

      {/* SEÇÃO DE ATIVIDADE RECENTE INTEGRADA AO SEU SERVER.JS */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Leads Ativos recebidos via Webhook</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads">Ver tudo</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {loadingBackend ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Conectando ao banco de dados local...</div>
            ) : leadsReais.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Nenhum payload detectado. Envie requisições POST para http://localhost:3000/api/webhook para alimentar esta lista.
              </div>
            ) : (
              leadsReais.slice(0, 6).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-mono font-semibold text-emerald-400 uppercase">
                    ID
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-mono font-medium text-slate-300">ID: {lead.id}</p>
                      <StatusBadge status={lead.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">Payload: "{lead.ultimaMensagem}"</p>
                  </div>
                  
                  {/* Botão de envio rápido para disparar notificações do WhatsApp */}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-green-500"
                    onClick={() => enviarNotificacaoWhatsapp(`Atualização de Lead: O evento do ID ${lead.id} foi verificado no painel.`, userPhone || "5511999999999")}
                    title="Disparar notificação WhatsApp"
                  >
                    <Send className="h-4 w-4" />
                  </Button>

                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <MessageCircle className="h-3 w-3" />
                      Live
                    </div>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary/60">
                    <span className="font-display text-xs font-semibold text-primary">100</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
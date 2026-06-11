import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Mail, MessageCircle, Phone, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · Resposta" },
      { name: "description", content: "Gerencie sua conta, tema e integrações de WhatsApp e Google." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [name, setName] = useState("Rafael Costa");
  const [email, setEmail] = useState("rafael@premier.com.br");
  const [phone, setPhone] = useState("+55 11 99876-5432");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados, aparência e integrações da conta.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full gradient-primary text-2xl font-semibold text-primary-foreground shadow-glow">
                RC
              </div>
              <button className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Administrador · Premier Imóveis</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Telefone WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-0000" />
              <p className="text-xs text-muted-foreground">Use o formato internacional (E.164).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">Claro, escuro ou seguir o sistema.</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <IntegrationRow
            icon={<Mail className="h-4 w-4" />}
            title="Conta Google"
            description="Login único e sincronização da agenda do corretor."
            status="pending"
            actionLabel="Conectar"
          />
          <IntegrationRow
            icon={<MessageCircle className="h-4 w-4 text-primary" />}
            title="WhatsApp Business (Twilio)"
            description="Envio e recepção automatizada de mensagens pelo seu número."
            status="pending"
            actionLabel="Conectar número"
          />
          <IntegrationRow
            icon={<Phone className="h-4 w-4" />}
            title="Telefonia / ligações"
            description="Em breve — escalar leads quentes para chamada."
            status="soon"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90"
          onClick={() => toast.success("Perfil salvo")}
        >
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function IntegrationRow({
  icon,
  title,
  description,
  status,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "connected" | "pending" | "soon";
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {status === "connected" ? (
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
        </span>
      ) : status === "pending" && actionLabel ? (
        <Button size="sm" variant="outline">{actionLabel}</Button>
      ) : (
        <span className="text-xs text-muted-foreground">Em breve</span>
      )}
    </div>
  );
}

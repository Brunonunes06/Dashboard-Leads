import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
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
      {
        name: "description",
        content: "Gerencie sua conta, tema e integrações.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [name, setName] = useState("Usuário");
  const [email, setEmail] = useState("rafael@premier.com.br");
  const [phone, setPhone] = useState("+55 11 99876-5432");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("userName");
      const savedEmail = localStorage.getItem("userEmail");
      const savedPhone = localStorage.getItem("userPhone");

      if (savedName) setName(savedName);
      if (savedEmail) setEmail(savedEmail);
      if (savedPhone) setPhone(savedPhone);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPhone", phone);

    window.dispatchEvent(new Event("profileUpdated"));

    toast.success("Perfil atualizado com sucesso!");
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados, aparência e integrações da conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados pessoais
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </div>

              <button className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border bg-card">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">
                Administrador
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Telefone WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>

        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">
              Claro, escuro ou sistema.
            </p>
          </div>

          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Integrações
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <IntegrationRow
            icon={<Mail className="h-4 w-4" />}
            title="Conta Google"
            description="Login único e sincronização."
            status="pending"
            actionLabel="✔️"
          />

          <IntegrationRow
            icon={<MessageCircle className="h-4 w-4" />}
            title="WhatsApp Business"
            description="Automação de mensagens."
            status="pending"
            actionLabel="Conectar"
          />

          <IntegrationRow
            icon={<Phone className="h-4 w-4" />}
            title="Telefonia"
            description="Integração de chamadas."
            status="soon"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          Cancelar
        </Button>

        <Button onClick={handleSave}>
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
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {status === "connected" ? (
        <span className="flex items-center gap-1 text-xs font-medium text-green-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Conectado
        </span>
      ) : status === "pending" ? (
        <Button size="sm" variant="outline">
          {actionLabel}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">
          Em breve
        </span>
      )}
    </div>
  );
}
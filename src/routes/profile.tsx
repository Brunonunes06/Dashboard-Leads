import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Mail, MessageCircle, Phone, ShieldAlert, ShieldCheck, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { requestAccountDeletion } from "@/lib/api/lgpd.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/" });
  },
  component: ProfilePage,
});

const INTEGRATIONS = [
  { icon: Mail, title: "Conta Google", desc: "Login único e sincronização.", status: "pending" as const },
  {
    icon: MessageCircle,
    title: "WhatsApp Business",
    desc: "Automação de mensagens.",
    status: "pending" as const,
  },
  { icon: UserPlus, title: "Convidar alguém", desc: "Compartilhe o site com outra pessoa.", status: "invite" as const },
  { icon: Phone, title: "Telefonia", desc: "Integração de chamadas.", status: "soon" as const },
];

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function getInviteUrl() {
  return new URL("/", window.location.origin).href;
}

function sharePlatform(platform: string) {
  const url = getInviteUrl();
  const text = "Junte-se a mim no site Resposta para gerenciar leads e conversas.";
  const message = `${text} ${url}`;
  let shareUrl = "";

  switch (platform) {
    case "whatsapp":
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      break;
    case "facebook":
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      break;
    case "x":
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
      break;
    case "linkedin":
      shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent("Convite para o site")}&summary=${encodeURIComponent(text)}`;
      break;
    case "email":
      shareUrl = `mailto:?subject=${encodeURIComponent("Convite para o site")}&body=${encodeURIComponent(message)}`;
      break;
    default:
      return;
  }
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRequestDeletion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sessão expirada", { description: "Faça login novamente." });
      return;
    }
    const result = await requestAccountDeletion({ data: { accessToken: session.access_token } });
    setDeleteDialogOpen(false);
    if (result.success) {
      setDeleteRequested(true);
      toast.success("Pedido registrado", {
        description: "Vamos processar a exclusão dos seus dados e entrar em contato pelo seu e-mail.",
      });
    } else {
      toast.error("Não foi possível registrar o pedido", { description: result.error });
    }
  }

  function handleAvatarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setAvatarUrl(dataUrl);
      toast.success("Foto atualizada", { description: "Avatar carregado com sucesso." });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleSave() {
    updateProfile({ name, avatarUrl });
    toast.success("Perfil atualizado com sucesso!");
  }

  function copyInviteLink() {
    navigator.clipboard
      .writeText(getInviteUrl())
      .then(() => toast.success("Link copiado", { description: "URL de convite copiada para a área de transferência." }))
      .catch(() => toast.error("Erro ao copiar", { description: "Não foi possível copiar o link." }));
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Seus dados, aparência e integrações da conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 text-2xl font-bold">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {getInitials(name || "Usuário")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border bg-card"
                aria-label="Trocar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>
            <div>
              <p className="text-sm font-medium">{name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground">{user?.role === "admin" ? "Admin" : "Cliente"}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fulano Siclano" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bomdia@gmail.com"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="phone">Telefone WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99876-5432"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Claro, escuro ou sistema.</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" /> Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {INTEGRATIONS.map((it) => (
            <div
              key={it.title}
              className="flex items-center justify-between gap-3 rounded-lg border p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                  <it.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
              </div>
              {it.status === "soon" ? (
                <span className="text-xs text-muted-foreground">Em breve</span>
              ) : it.status === "invite" ? (
                <Button variant="outline" size="sm" onClick={() => setSharePanelOpen(true)}>
                  Convidar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast("Integração em curso", { description: `${it.title} solicitada.` })}
                >
                  Conectar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4" /> Privacidade e dados (LGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Você pode solicitar a exclusão da sua conta e dos seus dados a qualquer momento, conforme
            a Lei Geral de Proteção de Dados. Leia a{" "}
            <a href="/privacy" className="underline">
              política de privacidade
            </a>
            .
          </p>
          <div>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteRequested}
              onClick={() => setDeleteDialogOpen(true)}
            >
              {deleteRequested ? "Pedido de exclusão enviado" : "Excluir meus dados"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>Salvar alterações</Button>
      </div>

      <AlertDialog open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta e dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso registra um pedido de exclusão definitiva dos seus dados (leads, conversas e
              conta). Nossa equipe processa o pedido e confirma por e-mail. Essa ação não pode ser
              desfeita depois de processada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRequestDeletion}>
              Confirmar exclusão
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sharePanelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compartilhar convite</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma plataforma para convidar alguém ao site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {["whatsapp", "facebook", "x", "email", "linkedin"].map((p) => (
              <Button key={p} variant="outline" onClick={() => sharePlatform(p)} className="capitalize">
                {p}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              Copiar link
            </Button>
            <Button size="sm" onClick={() => setSharePanelOpen(false)}>
              Fechar
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

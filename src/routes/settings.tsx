import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Clock, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/" });
    if (!isAdminEmail(session.user.email)) {
      throw redirect({ to: "/" });
    }
  },
  component: SettingsPage,
});

const DEFAULT_QUESTIONS = [
  "Qual a faixa de investimento que você considera?",
  "Quantos quartos você procura?",
  "Qual região prefere?",
  "Qual seu prazo de mudança?",
];

function SettingsPage() {
  const [aiName, setAiName] = useState("Sofia");
  const [aiBrand, setAiBrand] = useState("Premier Imóveis");
  const [aiTone, setAiTone] = useState(
    "Você é a Sofia, atendente da Premier Imóveis. Fale como um humano: linguagem natural brasileira, frases curtas, sem jargão corporativo. Use no máximo 1 emoji por conversa. Faça uma pergunta por vez. Nunca invente preços ou disponibilidade — se não souber, diga que vai confirmar com o corretor.",
  );
  const [botEnabled, setBotEnabled] = useState(true);
  const [botName, setBotName] = useState("Express Bot");
  const [botDelaySeconds, setBotDelaySeconds] = useState("0");
  const [botGreeting, setBotGreeting] = useState(
    "Olá! Sou o Express Bot e posso te ajudar com imóveis, disponibilidade e agendamento.",
  );
  const [botHandoff, setBotHandoff] = useState(
    "Perfeito. Vou te conectar agora com um especialista humano para seguir com o atendimento.",
  );
  const [botAutoReply, setBotAutoReply] = useState(true);
  const [autoTransfer, setAutoTransfer] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [loaded, setLoaded] = useState(false);

  // Lê do banco (não mais localStorage) — o bot que roda no servidor
  // (backend/meta-webhook-routes.js) não tem navegador, então precisa ler as
  // mesmas configurações de algum lugar persistente e compartilhado.
  useEffect(() => {
    (supabase as any)
      .from("bot_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }: { data: { settings: Record<string, unknown> } | null }) => {
        const s = data?.settings || {};
        if (typeof s.aiName === "string") setAiName(s.aiName);
        if (typeof s.aiBrand === "string") setAiBrand(s.aiBrand);
        if (typeof s.aiTone === "string") setAiTone(s.aiTone);
        if (typeof s.botEnabled === "boolean") setBotEnabled(s.botEnabled);
        if (typeof s.botName === "string") setBotName(s.botName);
        if (typeof s.botDelaySeconds === "string") setBotDelaySeconds(s.botDelaySeconds);
        if (typeof s.botGreeting === "string") setBotGreeting(s.botGreeting);
        if (typeof s.botHandoff === "string") setBotHandoff(s.botHandoff);
        if (typeof s.botAutoReply === "boolean") setBotAutoReply(s.botAutoReply);
        if (typeof s.autoTransfer === "boolean") setAutoTransfer(s.autoTransfer);
        if (typeof s.minScore === "number") setMinScore(s.minScore);
        if (Array.isArray(s.questions) && s.questions.length) setQuestions(s.questions as string[]);
        setLoaded(true);
      });
  }, []);

  function addQuestion() {
    setQuestions((prev) => [...prev, "Nova pergunta"]);
  }

  function updateQuestion(i: number, value: string) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? value : q)));
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    const { error } = await (supabase as any).from("bot_settings").upsert({
      id: true,
      settings: {
        aiName,
        aiBrand,
        aiTone,
        botEnabled,
        botName,
        botDelaySeconds,
        botGreeting,
        botHandoff,
        botAutoReply,
        autoTransfer,
        minScore,
        questions,
      },
      updated_at: new Date().toISOString(),
    });
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Configurações salvas", { description: "A IA já está usando as novas regras." });
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurar IA</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Personalize como a IA conversa, qualifica e transfere leads para sua equipe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" /> Personalidade da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome da IA</Label>
              <Input value={aiName} onChange={(e) => setAiName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Imobiliária</Label>
              <Input value={aiBrand} onChange={(e) => setAiBrand(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tom e instruções</Label>
            <Textarea rows={5} value={aiTone} onChange={(e) => setAiTone(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              A IA segue essas instruções em todas as conversas do WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuração do bot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border p-3.5">
            <div>
              <p className="text-sm font-medium">Bot ativo nas conversas</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quando desativado, as telas usam apenas atendimento humano.
              </p>
            </div>
            <Switch checked={botEnabled} onCheckedChange={setBotEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome do bot</Label>
              <Input value={botName} onChange={(e) => setBotName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Delay automático (segundos)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={botDelaySeconds}
                onChange={(e) => setBotDelaySeconds(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Mensagem inicial</Label>
            <Textarea rows={4} value={botGreeting} onChange={(e) => setBotGreeting(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Mensagem de transferência</Label>
            <Textarea rows={4} value={botHandoff} onChange={(e) => setBotHandoff(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3.5">
            <div>
              <p className="text-sm font-medium">Resposta automática</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Controla se o bot responde sozinho antes da transferência.
              </p>
            </div>
            <Switch checked={botAutoReply} onCheckedChange={setBotAutoReply} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Perguntas de qualificação</CardTitle>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-2.5 text-[11px] text-muted-foreground">
            A IA faz essas perguntas em ordem, uma por vez, esperando a resposta antes da próxima.
          </p>
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-background p-1.5">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <Input
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={() => removeQuestion(i)}
                  aria-label="Remover pergunta"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" /> Regras de transferência
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border p-3.5">
            <div>
              <p className="text-sm font-medium">Transferir automaticamente para um corretor</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quando o lead atingir o score mínimo, a IA conecta um humano.
              </p>
            </div>
            <Switch checked={autoTransfer} onCheckedChange={setAutoTransfer} />
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <Label className="mb-0">Score mínimo para transferência</Label>
              <span className="font-display text-lg font-semibold text-primary">{minScore}</span>
            </div>
            <Slider
              value={[minScore]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => setMinScore(v)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Leads abaixo de {minScore} continuam conversando com a IA ou são marcados como frios.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={saveSettings} disabled={!loaded || saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

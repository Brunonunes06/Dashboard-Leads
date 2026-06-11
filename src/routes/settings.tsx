import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Clock, GripVertical, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurar IA · Resposta" },
      { name: "description", content: "Personalize tom, perguntas de qualificação e regras de transferência da IA." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [questions, setQuestions] = useState([
    "Qual a faixa de investimento que você considera?",
    "Quantos quartos você procura?",
    "Qual região prefere?",
    "Qual seu prazo de mudança?",
  ]);
  const [autoTransfer, setAutoTransfer] = useState(true);
  const [score, setScore] = useState([70]);

  function update(i: number, v: string) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? v : q)));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurar IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize como a IA conversa, qualifica e transfere leads para sua equipe.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-primary" /> Personalidade da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome da IA</Label>
              <Input defaultValue="Sofia" />
            </div>
            <div className="space-y-1.5">
              <Label>Imobiliária</Label>
              <Input defaultValue="Premier Imóveis" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tom e instruções</Label>
            <Textarea
              rows={5}
              defaultValue="Você é a Sofia, atendente da Premier Imóveis. Fale como um humano: linguagem natural brasileira, frases curtas, sem jargão corporativo. Use no máximo 1 emoji por conversa. Faça uma pergunta por vez. Nunca invente preços ou disponibilidade — se não souber, diga que vai confirmar com o corretor."
            />
            <p className="text-xs text-muted-foreground">A IA segue essas instruções em todas as conversas do WhatsApp.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Perguntas de qualificação</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuestions((q) => [...q, "Nova pergunta"])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="-mt-2 mb-2 text-xs text-muted-foreground">
            A IA faz essas perguntas em ordem, uma por vez, esperando a resposta antes da próxima.
          </p>
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <Input
                value={q}
                onChange={(e) => update(i, e.target.value)}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" /> Regras de transferência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-4">
            <div>
              <p className="text-sm font-medium">Transferir automaticamente para um corretor</p>
              <p className="text-xs text-muted-foreground">Quando o lead atingir o score mínimo, a IA conecta um humano.</p>
            </div>
            <Switch checked={autoTransfer} onCheckedChange={setAutoTransfer} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Score mínimo para transferência</Label>
              <span className="font-display text-lg font-semibold text-primary">{score[0]}</span>
            </div>
            <Slider value={score} onValueChange={setScore} min={0} max={100} step={5} />
            <p className="text-xs text-muted-foreground">
              Leads abaixo de {score[0]} continuam conversando com a IA ou são marcados como frios.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90"
          onClick={() => toast.success("Configurações salvas", { description: "A IA já está usando as novas regras." })}
        >
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

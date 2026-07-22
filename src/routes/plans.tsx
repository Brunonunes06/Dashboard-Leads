import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { createPixPayment } from "@/lib/api/payments.functions";
import { useTranslation, type Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/plans")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/" });
  },
  component: PlansPage,
});

type PlanKey = "semanal" | "mensal" | "anual";

type PlanInfo = {
  title: string;
  badge: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
};

const PLANS_BY_LOCALE: Record<Locale, Record<PlanKey, PlanInfo>> = {
  pt: {
    semanal: {
      title: "Plano Semanal",
      badge: "Plano Free",
      price: "Gratuito",
      priceNote: "Primeira semana",
      description:
        "Experimente todos os principais recursos da plataforma durante 7 dias, sem qualquer compromisso.",
      features: [
        "Acesso completo por 7 dias",
        "Sem cobrança durante o período de teste",
        "Sem compromisso de permanência",
        "Ideal para conhecer a plataforma",
      ],
    },
    mensal: {
      title: "Mensalidade",
      badge: "MENSAL",
      price: "R$ 299,99",
      priceNote: "Primeira parcela",
      description:
        "Ideal para quem busca flexibilidade e acesso contínuo aos recursos da plataforma, sem compromisso anual.",
      features: [
        "Acesso ilimitado a todos os recursos",
        "Atualizações constantes da plataforma",
        "Suporte prioritário",
        "Cobrança mensal recorrente",
        "Cancele quando desejar",
      ],
    },
    anual: {
      title: "Anual",
      badge: "ANUAL",
      price: "R$ 1.600,00",
      priceNote: "Primeira parcela",
      description:
        "A opção mais vantajosa para quem pretende utilizar a plataforma a longo prazo, com economia significativa.",
      features: [
        "Melhor custo-benefício",
        "Economia nas renovações anuais",
        "Acesso completo durante 12 meses",
        "Prioridade em novos recursos",
        "Suporte prioritário",
      ],
    },
  },
  en: {
    semanal: {
      title: "Weekly Plan",
      badge: "Free Plan",
      price: "Free",
      priceNote: "First week",
      description: "Try all the platform's main features for 7 days, with no commitment.",
      features: [
        "Full access for 7 days",
        "No charge during the trial period",
        "No long-term commitment",
        "Great way to get to know the platform",
      ],
    },
    mensal: {
      title: "Monthly",
      badge: "MONTHLY",
      price: "R$ 299.99",
      priceNote: "First installment",
      description:
        "Ideal for those who want flexibility and continuous access to the platform's features, with no annual commitment.",
      features: [
        "Unlimited access to all features",
        "Constant platform updates",
        "Priority support",
        "Recurring monthly billing",
        "Cancel anytime",
      ],
    },
    anual: {
      title: "Annual",
      badge: "ANNUAL",
      price: "R$ 1,600.00",
      priceNote: "First installment",
      description:
        "The most advantageous option for those planning to use the platform long-term, with significant savings.",
      features: [
        "Best value for money",
        "Savings on annual renewals",
        "Full access for 12 months",
        "Priority access to new features",
        "Priority support",
      ],
    },
  },
  es: {
    semanal: {
      title: "Plan Semanal",
      badge: "Plan Gratis",
      price: "Gratis",
      priceNote: "Primera semana",
      description: "Prueba todas las funciones principales de la plataforma durante 7 días, sin compromiso.",
      features: [
        "Acceso completo durante 7 días",
        "Sin cobros durante el período de prueba",
        "Sin compromiso de permanencia",
        "Ideal para conocer la plataforma",
      ],
    },
    mensal: {
      title: "Mensualidad",
      badge: "MENSUAL",
      price: "R$ 299,99",
      priceNote: "Primera cuota",
      description:
        "Ideal para quienes buscan flexibilidad y acceso continuo a las funciones de la plataforma, sin compromiso anual.",
      features: [
        "Acceso ilimitado a todas las funciones",
        "Actualizaciones constantes de la plataforma",
        "Soporte prioritario",
        "Cobro mensual recurrente",
        "Cancela cuando quieras",
      ],
    },
    anual: {
      title: "Anual",
      badge: "ANUAL",
      price: "R$ 1.600,00",
      priceNote: "Primera cuota",
      description:
        "La opción más ventajosa para quienes planean usar la plataforma a largo plazo, con un ahorro significativo.",
      features: [
        "Mejor relación calidad-precio",
        "Ahorro en las renovaciones anuales",
        "Acceso completo durante 12 meses",
        "Prioridad en nuevas funciones",
        "Soporte prioritario",
      ],
    },
  },
};

function PlansPage() {
  const { t, locale } = useTranslation();
  const PLANS = PLANS_BY_LOCALE[locale];
  const { user } = useAuth();
  const [openPlan, setOpenPlan] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{ qrCode?: string; qrCodeBase64?: string } | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);

  async function handleSelectPlan(key: PlanKey) {
    if (key === "semanal") {
      toast.success(`${PLANS.semanal.title} ${locale === "pt" ? "ativado!" : locale === "es" ? "activado!" : "activated!"}`, {
        description:
          locale === "pt"
            ? "Aproveite 7 dias grátis."
            : locale === "es"
              ? "Disfruta 7 días gratis."
              : "Enjoy 7 days free.",
      });
      return;
    }
    setOpenPlan(key);
    setPix(null);
    setPixError(null);
    setLoading(true);

    const result = await createPixPayment({
      data: { plan: key, email: user?.email || "cliente@teamwolf.local" },
    }).catch((err) => ({ success: false as const, error: (err as Error).message }));

    setLoading(false);
    if (result.success) {
      setPix({ qrCode: result.qrCode, qrCodeBase64: result.qrCodeBase64 });
    } else {
      setPixError(result.error);
    }
  }

  function copyPixCode() {
    if (!pix?.qrCode) return;
    navigator.clipboard
      .writeText(pix.qrCode)
      .then(() =>
        toast.success(
          locale === "pt" ? "Código Pix copiado" : locale === "es" ? "Código Pix copiado" : "Pix code copied",
        ),
      )
      .catch(() =>
        toast.error(
          locale === "pt" ? "Não foi possível copiar" : locale === "es" ? "No se pudo copiar" : "Couldn't copy",
        ),
      );
  }

  const plan = openPlan ? PLANS[openPlan] : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("plans.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("plans.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((key) => {
          const p = PLANS[key];
          return (
            <Card key={key} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{p.badge}</p>
                    <h2 className="mt-1.5 text-2xl font-semibold">{p.title}</h2>
                  </div>
                  <Badge variant="secondary">{p.badge}</Badge>
                </div>

                <div className="mt-5">
                  <p className="text-xs text-muted-foreground">{p.priceNote}</p>
                  <p className="font-display mt-1 text-4xl font-bold">{p.price}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
                </div>

                <div className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button className="mt-6 w-full" onClick={() => handleSelectPlan(key)}>
                  {t("plans.subscribe")} {p.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={openPlan !== null} onOpenChange={(open) => !open && setOpenPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("plans.subscribe")} {plan?.title}
            </DialogTitle>
            <DialogDescription>
              {t("plans.pix")} — {plan?.price}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("plans.generatingPix")}</p>
          ) : pix?.qrCodeBase64 ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code Pix"
                className="h-56 w-56 rounded-lg bg-white p-2"
              />
              <p className="text-xs text-muted-foreground">{t("plans.scanQr")}</p>
              {pix.qrCode && (
                <Button variant="outline" size="sm" onClick={copyPixCode}>
                  <Copy className="h-3.5 w-3.5" /> {t("plans.copyPixCode")}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {pixError || t("plans.pixUnavailable")} {t("plans.contactSupport")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

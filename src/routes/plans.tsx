import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Banknote, Check, Copy, CreditCard, Loader2, QrCode, Repeat } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import {
  createBoletoPayment,
  createCardPayment,
  createCardSubscription,
  createPixPayment,
} from "@/lib/api/payments.functions";
import { getMercadoPago, getMercadoPagoPublicKey } from "@/lib/mercadopago-client";
import { useTranslation, type Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/plans")({
  component: () => (
    <RequireAuth>
      <PlansPage />
    </RequireAuth>
  ),
});

type PlanKey = "semanal" | "mensal" | "anual" | "teste";
type PaymentMethodKey = "pix" | "card" | "boleto" | "subscription";

// Valores numéricos pro Brick/backend — precisam bater com backend/payments-routes.js
// e src/lib/api/payments.functions.ts (os textos de preço em PLANS_BY_LOCALE
// abaixo são só exibição).
const PLAN_AMOUNTS: Record<"mensal" | "anual", number> = {
  mensal: 299.99,
  anual: 1600,
};

// Precisa bater com PLANS.mensal/anual.frequencyMonths em
// backend/payments-routes.js e src/lib/api/payments.functions.ts — usado só
// pra calcular até quando o plano comprado continua valendo.
const PLAN_FREQUENCY_MONTHS: Record<"mensal" | "anual", number> = {
  mensal: 1,
  anual: 12,
};

type ActivePlanInfo = { expiresAt: Date | null };

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
    teste: {
      title: "Plano TESTE",
      badge: "Teste grátis",
      price: "Gratuito",
      priceNote: "1 por conta",
      description: "Dispara uma mensagem de teste de cobrança por WhatsApp em segundos, sem esperar pagamento real.",
      features: [
        "Envia o lembrete de cobrança na hora",
        "Some sozinho depois do teste",
        "Disponível uma única vez por conta",
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
    teste: {
      title: "Test Plan",
      badge: "Free test",
      price: "Free",
      priceNote: "1 per account",
      description: "Fires a test billing reminder over WhatsApp in seconds, without waiting for a real payment.",
      features: ["Sends the billing reminder right away", "Cleans itself up after the test", "Available once per account"],
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
    teste: {
      title: "Plan de PRUEBA",
      badge: "Prueba gratis",
      price: "Gratis",
      priceNote: "1 por cuenta",
      description: "Dispara un recordatorio de cobro de prueba por WhatsApp en segundos, sin esperar un pago real.",
      features: [
        "Envía el recordatorio de cobro al instante",
        "Desaparece solo después de la prueba",
        "Disponible una única vez por cuenta",
      ],
    },
  },
};

function PlansPage() {
  const { t, locale } = useTranslation();
  const PLANS = PLANS_BY_LOCALE[locale];
  const { user } = useAuth();
  const [openPlan, setOpenPlan] = useState<PlanKey | null>(null);
  const [method, setMethod] = useState<PaymentMethodKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [activatingTest, setActivatingTest] = useState(false);
  const [testUsed, setTestUsed] = useState(false);
  const [activePlans, setActivePlans] = useState<Partial<Record<"mensal" | "anual", ActivePlanInfo>>>({});

  const [pix, setPix] = useState<{ qrCode?: string; qrCodeBase64?: string } | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);

  const [cpf, setCpf] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [streetName, setStreetName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [federalUnit, setFederalUnit] = useState("");
  const [boleto, setBoleto] = useState<{ boletoUrl?: string; barcode?: string } | null>(null);
  const [boletoError, setBoletoError] = useState<string | null>(null);

  const [cardResult, setCardResult] = useState<{ status: string; statusDetail?: string } | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [subResult, setSubResult] = useState<{ status: string } | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  const brickControllerRef = useRef<any>(null);

  function resetDialogState() {
    setMethod(null);
    setPix(null);
    setPixError(null);
    setCpf("");
    setFirstName("");
    setLastName("");
    setZipCode("");
    setStreetName("");
    setStreetNumber("");
    setNeighborhood("");
    setCity("");
    setFederalUnit("");
    setBoleto(null);
    setBoletoError(null);
    setCardResult(null);
    setCardError(null);
    setSubResult(null);
    setSubError(null);
  }

  // Carrega se o usuário já usou o Plano Semanal (grátis) — cada usuário só
  // pode ativar o trial uma vez (supabase/008_free_trial.sql garante isso
  // também no banco via unique index, isso aqui só evita mostrar o botão
  // clicável de novo).
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan", "semanal")
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data) setFreeTrialUsed(true);
      });
  }, [user?.id]);

  // Carrega se a conta já usou o Plano TESTE — 1 uso por conta, controlado
  // via profiles.test_message_sent_at (supabase/013_test_plan.sql trava isso
  // também no banco via RLS, isso aqui só evita mostrar o botão de novo).
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("profiles")
      .select("test_message_sent_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { test_message_sent_at: string | null } | null }) => {
        if (data?.test_message_sent_at) setTestUsed(true);
      });
  }, [user?.id]);

  // Carrega Mensal/Anual já comprados e ainda dentro do período pago, pra
  // travar o botão ("Já utilizado") e mostrar até quando vale — assinatura
  // recorrente (card_recurring) nunca "expira" sozinha aqui, ela renova
  // automaticamente até ser cancelada (webhook vira o status pra 'canceled').
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("subscriptions")
      .select("plan, method, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("plan", ["mensal", "anual"])
      .then(
        ({
          data,
        }: {
          data: { plan: "mensal" | "anual"; method: string; started_at: string | null }[] | null;
        }) => {
          if (!data) return;
          const map: Partial<Record<"mensal" | "anual", ActivePlanInfo>> = {};
          for (const row of data) {
            if (!row.started_at) continue;
            const startedAt = new Date(row.started_at);
            const expiresAt = new Date(startedAt);
            expiresAt.setMonth(expiresAt.getMonth() + PLAN_FREQUENCY_MONTHS[row.plan]);
            const isRecurring = row.method === "card_recurring";
            if (!isRecurring && expiresAt.getTime() <= Date.now()) continue;

            const info: ActivePlanInfo = { expiresAt: isRecurring ? null : expiresAt };
            const existingExpiry = map[row.plan]?.expiresAt;
            if (!map[row.plan] || !existingExpiry || (info.expiresAt && info.expiresAt > existingExpiry)) {
              map[row.plan] = info;
            }
          }
          setActivePlans(map);
        },
      );
  }, [user?.id]);

  function formatExpiry(date: Date) {
    const localeTag = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
    return date.toLocaleDateString(localeTag);
  }

  async function handleSelectPlan(key: PlanKey) {
    if (key === "semanal") {
      if (freeTrialUsed || activatingTrial || !user?.id) return;
      setActivatingTrial(true);
      // "as any": subscriptions ainda não está nos tipos gerados do Supabase.
      const { error } = await (supabase as any).from("subscriptions").insert({
        user_id: user.id,
        plan: "semanal",
        method: "free",
        status: "active",
        started_at: new Date().toISOString(),
      });
      setActivatingTrial(false);

      if (error) {
        if (error.code === "23505") {
          // Já existe uma linha 'semanal' pra esse usuário (unique index) —
          // trial já foi usado antes, só sincroniza o estado local.
          setFreeTrialUsed(true);
        } else {
          toast.error(
            locale === "pt"
              ? "Não foi possível ativar o plano gratuito"
              : locale === "es"
                ? "No se pudo activar el plan gratuito"
                : "Couldn't activate the free plan",
            { description: error.message },
          );
        }
        return;
      }

      setFreeTrialUsed(true);
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

    if (key === "teste") {
      if (activatingTest || testUsed || !user?.id) return;
      setActivatingTest(true);
      // Cria 'pending' (não 'active') pra backend/payment-reminders-cron.js
      // pegar — um checador dedicado lá roda a cada 5s, manda a mensagem de
      // WhatsApp e apaga essa linha sozinho logo em seguida. Limite de 1 uso
      // por conta é imposto pela RLS via profiles.test_message_sent_at
      // (supabase/013_test_plan.sql) — se já foi usado, o insert falha.
      const { error } = await (supabase as any).from("subscriptions").insert({
        user_id: user.id,
        plan: "teste",
        method: "free",
        status: "pending",
      });
      setActivatingTest(false);

      if (error) {
        if (error.code === "42501" || error.code === "PGRST301") {
          // RLS bloqueou — quase sempre porque o teste já foi usado (o
          // fetch do useEffect pode não ter sincronizado ainda).
          setTestUsed(true);
        }
        toast.error(
          locale === "pt"
            ? "Não foi possível disparar o teste"
            : locale === "es"
              ? "No se pudo disparar la prueba"
              : "Couldn't trigger the test",
          { description: error.message },
        );
        return;
      }

      toast.success(
        locale === "pt"
          ? "Teste disparado!"
          : locale === "es"
            ? "¡Prueba disparada!"
            : "Test triggered!",
        {
          description:
            locale === "pt"
              ? "A mensagem chega em até ~5s, se o telefone estiver cadastrado no perfil."
              : locale === "es"
                ? "El mensaje llega en hasta ~5s, si el teléfono está registrado en el perfil."
                : "Message arrives within ~5s, if the phone is set in your profile.",
        },
      );
      return;
    }

    setOpenPlan(key);
    resetDialogState();
  }

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  const sessionExpiredMsg =
    locale === "pt"
      ? "Sessão expirada. Faça login novamente."
      : locale === "es"
        ? "Sesión caducada. Inicia sesión de nuevo."
        : "Session expired. Please log in again.";

  async function handleChoosePix() {
    if (!openPlan || openPlan === "semanal" || openPlan === "teste") return;
    setMethod("pix");
    setLoading(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setLoading(false);
      setPixError(sessionExpiredMsg);
      return;
    }
    const result = await createPixPayment({
      data: { plan: openPlan, email: user?.email || "cliente@teamwolf.local", accessToken },
    }).catch((err) => ({ success: false as const, error: (err as Error).message }));
    setLoading(false);
    if (result.success) setPix({ qrCode: result.qrCode, qrCodeBase64: result.qrCodeBase64 });
    else setPixError(result.error);
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

  async function handleSubmitBoleto() {
    if (!openPlan || openPlan === "semanal" || openPlan === "teste") return;
    if (!cpf.trim() || !firstName.trim() || !zipCode.trim() || !streetName.trim() || !streetNumber.trim() || !city.trim() || !federalUnit.trim()) {
      toast.error(t("plans.cpf") + " / " + t("plans.firstName") + " / " + t("plans.zipCode"));
      return;
    }
    setLoading(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setLoading(false);
      setBoletoError(sessionExpiredMsg);
      return;
    }
    const result = await createBoletoPayment({
      data: {
        plan: openPlan,
        email: user?.email || "cliente@teamwolf.local",
        accessToken,
        cpf,
        firstName,
        lastName,
        zipCode,
        streetName,
        streetNumber,
        neighborhood,
        city,
        federalUnit,
      },
    }).catch((err) => ({ success: false as const, error: (err as Error).message }));
    setLoading(false);
    if (result.success) setBoleto({ boletoUrl: result.boletoUrl, barcode: result.barcode });
    else setBoletoError(result.error);
  }

  // Card Payment Brick — usado tanto pra cartão à vista quanto pra assinatura
  // recorrente (o token gerado é o mesmo, só muda o que fazemos com ele
  // depois). O número do cartão nunca passa pelo nosso servidor.
  useEffect(() => {
    if ((method !== "card" && method !== "subscription") || !openPlan || openPlan === "semanal" || openPlan === "teste") return;
    if (!getMercadoPagoPublicKey()) return;

    let cancelled = false;

    async function mountBrick() {
      const mp = await getMercadoPago();
      if (!mp || cancelled || !document.getElementById("mp-card-brick")) return;

      try {
        const controller = await mp.bricks().create("cardPayment", "mp-card-brick", {
          initialization: {
            amount: PLAN_AMOUNTS[openPlan as "mensal" | "anual"],
            payer: { email: user?.email },
          },
          customization: { visual: { style: { theme: "dark" } } },
          callbacks: {
            onReady: () => {},
            onError: (error: unknown) => {
              console.error("[Mercado Pago Brick] erro:", error);
            },
            onSubmit: (cardFormData: any) => handleBrickSubmit(cardFormData),
          },
        });
        if (cancelled) {
          controller.unmount();
          return;
        }
        brickControllerRef.current = controller;
      } catch (error) {
        console.error("[Mercado Pago Brick] falha ao montar:", error);
      }
    }

    mountBrick();

    return () => {
      cancelled = true;
      brickControllerRef.current?.unmount?.();
      brickControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, openPlan]);

  async function handleBrickSubmit(cardFormData: any) {
    if (!openPlan || openPlan === "semanal" || openPlan === "teste") return;
    setLoading(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setLoading(false);
      if (method === "subscription") setSubError(sessionExpiredMsg);
      else setCardError(sessionExpiredMsg);
      return;
    }

    if (method === "subscription") {
      const result = await createCardSubscription({
        data: {
          plan: openPlan,
          email: user?.email || cardFormData?.payer?.email || "cliente@teamwolf.local",
          accessToken,
          token: cardFormData.token,
        },
      }).catch((err) => ({ success: false as const, error: (err as Error).message }));
      setLoading(false);
      if (result.success) setSubResult({ status: result.status });
      else setSubError(result.error);
      return;
    }

    const result = await createCardPayment({
      data: {
        plan: openPlan,
        email: user?.email || cardFormData?.payer?.email || "cliente@teamwolf.local",
        accessToken,
        token: cardFormData.token,
        installments: cardFormData.installments,
        paymentMethodId: cardFormData.payment_method_id,
        issuerId: cardFormData.issuer_id,
        identificationType: cardFormData?.payer?.identification?.type,
        identificationNumber: cardFormData?.payer?.identification?.number,
      },
    }).catch((err) => ({ success: false as const, error: (err as Error).message }));
    setLoading(false);
    if (result.success) setCardResult({ status: result.status, statusDetail: result.statusDetail });
    else setCardError(result.error);
  }

  function cardStatusMessage(status: string) {
    if (status === "approved") return t("plans.cardApproved");
    if (status === "rejected") return t("plans.cardRejected");
    return t("plans.cardPending");
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
          const activeInfo = key === "mensal" || key === "anual" ? activePlans[key] : undefined;
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

                <Button
                  className="mt-6 w-full"
                  onClick={() => handleSelectPlan(key)}
                  disabled={
                    (key === "semanal" && (freeTrialUsed || activatingTrial)) ||
                    (key === "teste" && (testUsed || activatingTest)) ||
                    Boolean(activeInfo)
                  }
                >
                  {key === "teste"
                    ? testUsed
                      ? t("plans.trialUsed")
                      : activatingTest
                        ? "..."
                        : p.title
                    : (key === "semanal" && freeTrialUsed) || activeInfo
                      ? t("plans.trialUsed")
                      : `${t("plans.subscribe")} ${p.title}`}
                </Button>
                {activeInfo && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {activeInfo.expiresAt
                      ? `${t("plans.activeUntil")} ${formatExpiry(activeInfo.expiresAt)}`
                      : t("plans.autoRenews")}
                  </p>
                )}
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
              {method ? t(`plans.${method === "subscription" ? "recurringCard" : method}`) : t("plans.chooseMethod")}
              {" — "}
              {plan?.price}
            </DialogDescription>
          </DialogHeader>

          {!method ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={handleChoosePix}>
                <QrCode className="h-5 w-5" /> {t("plans.pix")}
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setMethod("card")}>
                <CreditCard className="h-5 w-5" /> {t("plans.card")}
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setMethod("boleto")}>
                <Banknote className="h-5 w-5" /> {t("plans.boleto")}
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => setMethod("subscription")}>
                <Repeat className="h-5 w-5" /> {t("plans.recurringCard")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={resetDialogState} disabled={loading}>
                <ArrowLeft className="h-3.5 w-3.5" /> {t("plans.back")}
              </Button>

              {method === "pix" &&
                (loading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("plans.generatingPix")}</p>
                ) : pix?.qrCodeBase64 ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={`data:image/png;base64,${pix.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="h-56 w-56 rounded-lg bg-white p-2"
                    />
                    <p className="text-xs text-muted-foreground">{t("plans.scanQr")}</p>
                    <p className="text-xs text-muted-foreground">{t("plans.waitingConfirmation")}</p>
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
                ))}

              {method === "boleto" &&
                (boleto ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Banknote className="h-10 w-10 text-primary" />
                    <p className="text-sm">{t("plans.boletoGenerated")}</p>
                    <p className="text-xs text-muted-foreground">{t("plans.waitingConfirmation")}</p>
                    {boleto.boletoUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={boleto.boletoUrl} target="_blank" rel="noopener noreferrer">
                          {t("plans.viewBoleto")}
                        </a>
                      </Button>
                    )}
                  </div>
                ) : boletoError ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {boletoError} {t("plans.contactSupport")}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="boleto-cpf">{t("plans.cpf")}</Label>
                      <Input
                        id="boleto-cpf"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="boleto-first-name">{t("plans.firstName")}</Label>
                        <Input id="boleto-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="boleto-last-name">{t("plans.lastName")}</Label>
                        <Input id="boleto-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="boleto-zip">{t("plans.zipCode")}</Label>
                        <Input id="boleto-zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="00000-000" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="boleto-uf">{t("plans.federalUnit")}</Label>
                        <Input id="boleto-uf" value={federalUnit} onChange={(e) => setFederalUnit(e.target.value)} placeholder="SP" maxLength={2} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="boleto-street">{t("plans.streetName")}</Label>
                        <Input id="boleto-street" value={streetName} onChange={(e) => setStreetName(e.target.value)} />
                      </div>
                      <div className="flex w-24 flex-col gap-1.5">
                        <Label htmlFor="boleto-street-number">{t("plans.streetNumber")}</Label>
                        <Input id="boleto-street-number" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="boleto-neighborhood">{t("plans.neighborhood")}</Label>
                      <Input id="boleto-neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="boleto-city">{t("plans.city")}</Label>
                      <Input id="boleto-city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <Button onClick={handleSubmitBoleto} disabled={loading}>
                      {loading ? t("plans.generatingBoleto") : t("plans.generateBoleto")}
                    </Button>
                  </div>
                ))}

              {(method === "card" || method === "subscription") &&
                (!getMercadoPagoPublicKey() ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t(method === "subscription" ? "plans.recurringUnavailable" : "plans.cardUnavailable")}{" "}
                    {t("plans.contactSupport")}
                  </div>
                ) : method === "card" && cardResult ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CreditCard className="h-10 w-10 text-primary" />
                    <p className="text-sm">{cardStatusMessage(cardResult.status)}</p>
                    {cardResult.status !== "rejected" && (
                      <p className="text-xs text-muted-foreground">{t("plans.waitingConfirmation")}</p>
                    )}
                  </div>
                ) : method === "card" && cardError ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {cardError} {t("plans.contactSupport")}
                  </div>
                ) : method === "subscription" && subResult ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Repeat className="h-10 w-10 text-primary" />
                    <p className="text-sm">
                      {subResult.status === "authorized" ? t("plans.subscriptionActive") : t("plans.subscriptionPending")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("plans.waitingConfirmation")}</p>
                  </div>
                ) : method === "subscription" && subError ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {subError} {t("plans.contactSupport")}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div id="mp-card-brick" className={loading ? "pointer-events-none opacity-50" : undefined} />
                    {loading && (
                      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("plans.processingCard")}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";
import { verifySupabaseAccessToken } from "../verify-supabase-token.server";

// "semanal" é o plano grátis (7 dias), tratado 100% no frontend, sem cobrança.
const PLANS = {
  mensal: { description: "Plano mensal TEAM WOLF", amount: 299.99, frequencyMonths: 1 },
  anual: { description: "Plano anual TEAM WOLF", amount: 1600, frequencyMonths: 12 },
} as const;

type PlanKey = keyof typeof PLANS;
const PLAN_KEYS = Object.keys(PLANS) as [PlanKey, ...PlanKey[]];

type MpResult = { ok: boolean; data: any };

async function mpPost(path: string, body: unknown, idempotencyKeyPrefix?: string): Promise<MpResult> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return { ok: false, data: { message: "MERCADO_PAGO_ACCESS_TOKEN não configurado." } };

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKeyPrefix
        ? { "X-Idempotency-Key": `${idempotencyKeyPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}` }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

// "as any": subscriptions ainda não está nos tipos gerados do Supabase
// (tabela nova, criada em supabase/007_subscriptions.sql) — mesma convenção
// já usada em lgpd.functions.ts pra deletion_requests.
// Nunca deixa um problema de bookkeeping (ex.: variável de ambiente do
// Supabase mal configurada) virar um "throw" que a chamada acima confunda
// com falha no pagamento em si — o cartão/Pix/boleto já foi processado pelo
// Mercado Pago nesse ponto; só o registro no nosso banco é best-effort.
async function recordSubscription(params: {
  userId: string;
  plan: PlanKey;
  method: "pix" | "card" | "boleto" | "card_recurring";
  status: "pending" | "active" | "rejected";
  mpPaymentId?: string | null;
  mpPreapprovalId?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("subscriptions").insert({
      user_id: params.userId,
      plan: params.plan,
      method: params.method,
      status: params.status,
      mp_payment_id: params.mpPaymentId ?? null,
      mp_preapproval_id: params.mpPreapprovalId ?? null,
      started_at: params.status === "active" ? new Date().toISOString() : null,
    });
    if (error) console.error("[Pagamentos] Erro ao registrar assinatura:", error.message);
  } catch (error) {
    console.error("[Pagamentos] Erro ao registrar assinatura:", (error as Error).message);
  }
}

export type PixPaymentResult =
  | { success: true; qrCode?: string; qrCodeBase64?: string }
  | { success: false; error: string };

// Cria uma cobranca Pix real via Mercado Pago quando MERCADO_PAGO_ACCESS_TOKEN
// esta configurado. Isso so INICIA a cobranca (gera o QR code) — o pagamento em
// si e feito pelo proprio cliente no app do banco dele; nenhum dinheiro e
// movimentado por este servidor. A tag do plano no perfil só aparece quando o
// webhook (backend/payments-routes.js) confirmar o pagamento de verdade.
export const createPixPayment = createServerFn({ method: "POST" })
  .validator(z.object({ plan: z.enum(PLAN_KEYS), email: z.string().email(), accessToken: z.string() }))
  .handler(async ({ data }): Promise<PixPaymentResult> => {
    const rateLimit = checkRateLimit(getRequest(), "payments.pix", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };

    const plan = PLANS[data.plan];
    try {
      const { ok, data: mpData } = await mpPost(
        "/v1/payments",
        {
          transaction_amount: plan.amount,
          description: plan.description,
          payment_method_id: "pix",
          payer: { email: data.email },
        },
        data.plan,
      );

      if (!ok) return { success: false, error: mpData.message || "Erro ao criar pagamento Pix no Mercado Pago." };

      await recordSubscription({
        userId: user.id,
        plan: data.plan,
        method: "pix",
        status: "pending",
        mpPaymentId: mpData.id ? String(mpData.id) : null,
      });

      return {
        success: true,
        qrCode: mpData.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    } catch (error) {
      console.error("[Mercado Pago] Erro ao criar Pix:", (error as Error).message);
      return { success: false, error: "Erro ao conectar com o Mercado Pago." };
    }
  });

export type CardPaymentResult =
  | { success: true; status: string; statusDetail?: string }
  | { success: false; error: string };

// "token" vem do Payment Brick no navegador (Mercado Pago.js V2) — o número
// do cartão nunca passa pelo nosso servidor, só o token gerado no cliente.
export const createCardPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      plan: z.enum(PLAN_KEYS),
      email: z.string().email(),
      accessToken: z.string(),
      token: z.string(),
      installments: z.number().int().positive().default(1),
      paymentMethodId: z.string(),
      issuerId: z.string().optional(),
      identificationType: z.string().optional(),
      identificationNumber: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CardPaymentResult> => {
    const rateLimit = checkRateLimit(getRequest(), "payments.card", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };

    const plan = PLANS[data.plan];
    try {
      // O Card Brick, pra pagadores no Brasil, sempre coleta o CPF junto do
      // cartão — sem repassar isso no payer.identification, o Mercado Pago
      // recusa a cobrança com um "internal_error" genérico (regra fiscal
      // brasileira, não é específico de boleto).
      const { ok, data: mpData } = await mpPost(
        "/v1/payments",
        {
          transaction_amount: plan.amount,
          description: plan.description,
          token: data.token,
          installments: data.installments,
          payment_method_id: data.paymentMethodId,
          issuer_id: data.issuerId,
          payer: {
            email: data.email,
            ...(data.identificationType && data.identificationNumber
              ? { identification: { type: data.identificationType, number: data.identificationNumber } }
              : {}),
          },
        },
        data.plan,
      );

      if (!ok) {
        console.error("[Mercado Pago] Pagamento no cartão recusado:", JSON.stringify(mpData));
        return { success: false, error: mpData.message || "Erro ao processar pagamento no cartão." };
      }

      const status = mpData.status === "approved" ? "active" : mpData.status === "rejected" ? "rejected" : "pending";
      await recordSubscription({
        userId: user.id,
        plan: data.plan,
        method: "card",
        status,
        mpPaymentId: mpData.id ? String(mpData.id) : null,
      });

      return { success: true, status: mpData.status, statusDetail: mpData.status_detail };
    } catch (error) {
      console.error("[Mercado Pago] Erro ao criar pagamento no cartão:", (error as Error).message);
      return { success: false, error: "Erro ao conectar com o Mercado Pago." };
    }
  });

export type BoletoPaymentResult =
  | { success: true; boletoUrl?: string; barcode?: string }
  | { success: false; error: string };

export const createBoletoPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      plan: z.enum(PLAN_KEYS),
      email: z.string().email(),
      accessToken: z.string(),
      cpf: z.string(),
      firstName: z.string(),
      lastName: z.string().optional(),
      zipCode: z.string(),
      streetName: z.string(),
      streetNumber: z.string(),
      neighborhood: z.string(),
      city: z.string(),
      federalUnit: z.string(),
    }),
  )
  .handler(async ({ data }): Promise<BoletoPaymentResult> => {
    const rateLimit = checkRateLimit(getRequest(), "payments.boleto", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };

    const plan = PLANS[data.plan];
    try {
      // Boleto no Brasil ("bolbradesco") exige o endereço completo do pagador
      // além do CPF — sem isso o Mercado Pago recusa com "insufficient_data",
      // mesmo respondendo HTTP 201 (por isso checamos mpData.status abaixo,
      // não só o "ok" da requisição).
      const { ok, data: mpData } = await mpPost(
        "/v1/payments",
        {
          transaction_amount: plan.amount,
          description: plan.description,
          payment_method_id: "bolbradesco",
          payer: {
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName || "",
            identification: { type: "CPF", number: data.cpf.replace(/\D/g, "") },
            address: {
              zip_code: data.zipCode.replace(/\D/g, ""),
              street_name: data.streetName,
              street_number: data.streetNumber,
              neighborhood: data.neighborhood,
              city: data.city,
              federal_unit: data.federalUnit,
            },
          },
        },
        data.plan,
      );

      if (!ok || mpData.status === "rejected") {
        await recordSubscription({
          userId: user.id,
          plan: data.plan,
          method: "boleto",
          status: "rejected",
          mpPaymentId: mpData.id ? String(mpData.id) : null,
        });
        return {
          success: false,
          error: mpData.message || `Boleto recusado pelo Mercado Pago (${mpData.status_detail || "dados inválidos"}).`,
        };
      }

      await recordSubscription({
        userId: user.id,
        plan: data.plan,
        method: "boleto",
        status: "pending",
        mpPaymentId: mpData.id ? String(mpData.id) : null,
      });

      return {
        success: true,
        boletoUrl: mpData.transaction_details?.external_resource_url,
        barcode: mpData.barcode?.content,
      };
    } catch (error) {
      console.error("[Mercado Pago] Erro ao gerar boleto:", (error as Error).message);
      return { success: false, error: "Erro ao conectar com o Mercado Pago." };
    }
  });

export type SubscriptionPaymentResult = { success: true; status: string } | { success: false; error: string };

// Assinatura recorrente no cartão (Preapproval) — cobrança automática a cada
// frequencyMonths, sem o cliente precisar voltar aqui pra pagar de novo.
export const createCardSubscription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      plan: z.enum(PLAN_KEYS),
      email: z.string().email(),
      accessToken: z.string(),
      token: z.string(),
      backUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<SubscriptionPaymentResult> => {
    const rateLimit = checkRateLimit(getRequest(), "payments.subscription", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

    const user = await verifySupabaseAccessToken(data.accessToken);
    if (!user) return { success: false, error: "Sessão inválida ou expirada. Faça login novamente." };

    const plan = PLANS[data.plan];
    try {
      const { ok, data: mpData } = await mpPost(
        "/preapproval",
        {
          reason: `Assinatura recorrente — ${plan.description}`,
          external_reference: `${user.id}:${data.plan}`,
          payer_email: data.email,
          card_token_id: data.token,
          auto_recurring: {
            frequency: plan.frequencyMonths,
            frequency_type: "months",
            transaction_amount: plan.amount,
            currency_id: "BRL",
          },
          back_url: data.backUrl || "https://teamwolf.local/plans",
          status: "authorized",
        },
        data.plan,
      );

      if (!ok) return { success: false, error: mpData.message || "Erro ao criar assinatura recorrente." };

      const status = mpData.status === "authorized" ? "active" : "pending";
      await recordSubscription({
        userId: user.id,
        plan: data.plan,
        method: "card_recurring",
        status,
        mpPreapprovalId: mpData.id ? String(mpData.id) : null,
      });

      return { success: true, status: mpData.status };
    } catch (error) {
      console.error("[Mercado Pago] Erro ao criar assinatura recorrente:", (error as Error).message);
      return { success: false, error: "Erro ao conectar com o Mercado Pago." };
    }
  });

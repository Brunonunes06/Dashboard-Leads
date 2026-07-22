import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PLANS = {
  mensal: { description: "Plano mensal TEAM WOLF", transaction_amount: 299.99 },
  anual: { description: "Plano anual TEAM WOLF", transaction_amount: 1600 },
} as const;

export type PixPaymentResult =
  | { success: true; qrCode?: string; qrCodeBase64?: string }
  | { success: false; error: string };

// Cria uma cobranca Pix real via Mercado Pago quando MERCADO_PAGO_ACCESS_TOKEN
// esta configurado. Isso so INICIA a cobranca (gera o QR code) — o pagamento em
// si e feito pelo proprio cliente no app do banco dele; nenhum dinheiro e
// movimentado por este servidor.
export const createPixPayment = createServerFn({ method: "POST" })
  .validator(z.object({ plan: z.enum(["mensal", "anual"]), email: z.string().email() }))
  .handler(async ({ data }): Promise<PixPaymentResult> => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const plan = PLANS[data.plan];

    if (!accessToken) {
      return { success: false, error: "Pagamento via Pix indisponivel no momento. Configure MERCADO_PAGO_ACCESS_TOKEN." };
    }

    try {
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `${data.plan}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
        body: JSON.stringify({
          transaction_amount: plan.transaction_amount,
          description: plan.description,
          payment_method_id: "pix",
          payer: { email: data.email },
        }),
        signal: AbortSignal.timeout(15000),
      });

      const json: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: json.message || "Erro ao criar pagamento Pix no Mercado Pago." };
      }

      return {
        success: true,
        qrCode: json.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: json.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    } catch (error) {
      console.error("[Mercado Pago] Erro ao criar Pix:", (error as Error).message);
      return { success: false, error: "Erro ao conectar com o Mercado Pago." };
    }
  });

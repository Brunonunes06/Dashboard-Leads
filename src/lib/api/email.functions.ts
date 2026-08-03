import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";

// Mesmos tipos de e-mail transacional do backend Express (backend/resend-client.js).
// Mantido duplicado de propósito — mesma convenção já usada em payments/lgpd
// entre os dois runtimes (Express standalone vs. TanStack Start).
const EMAIL_TYPES = [
  "account_confirmation",
  "password_reset",
  "billing_notice",
  "subscription",
  "notification",
  "alert",
] as const;

type EmailData = Record<string, string | undefined>;

function wrapHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#0b0b0f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#16161d;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1f1f29;padding:20px 32px;">
                <span style="color:#f5f5f5;font-size:18px;font-weight:bold;letter-spacing:0.5px;">TEAM WOLF</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
                <h1 style="color:#ffffff;font-size:20px;margin:0 0 16px;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;color:#8a8a94;font-size:12px;border-top:1px solid #26262f;">
                Você recebeu este e-mail porque possui uma conta na plataforma TEAM WOLF.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmail(type: (typeof EMAIL_TYPES)[number], data: EmailData): { subject: string; html: string } {
  switch (type) {
    case "account_confirmation":
      return {
        subject: "Confirme sua conta — TEAM WOLF",
        html: wrapHtml(
          "Confirme sua conta",
          `<p>Olá${data.name ? `, ${data.name}` : ""}!</p>
           <p>Falta pouco para ativar sua conta na TEAM WOLF. Clique no botão abaixo para confirmar seu e-mail.</p>
           <p style="text-align:center;margin:28px 0;"><a href="${data.confirmUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Confirmar conta</a></p>`,
        ),
      };
    case "password_reset":
      return {
        subject: "Redefinição de senha — TEAM WOLF",
        html: wrapHtml(
          "Redefinição de senha",
          `<p>Olá${data.name ? `, ${data.name}` : ""}!</p>
           <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
           <p style="text-align:center;margin:28px 0;"><a href="${data.resetUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Redefinir senha</a></p>
           <p style="color:#9a9aa4;font-size:13px;">Se você não pediu essa alteração, ignore este e-mail.</p>`,
        ),
      };
    case "billing_notice":
      return {
        subject: "Aviso de cobrança — TEAM WOLF",
        html: wrapHtml(
          "Aviso de cobrança",
          `<p>Olá${data.name ? `, ${data.name}` : ""}!</p>
           <p>Há uma cobrança pendente de <strong>${data.amount}</strong>${data.dueDate ? `, com vencimento em <strong>${data.dueDate}</strong>` : ""}.</p>`,
        ),
      };
    case "subscription":
      return {
        subject: "Assinatura confirmada — TEAM WOLF",
        html: wrapHtml(
          "Assinatura confirmada",
          `<p>Olá${data.name ? `, ${data.name}` : ""}!</p>
           <p>Sua assinatura do plano <strong>${data.plan}</strong> foi confirmada com sucesso.</p>`,
        ),
      };
    case "notification":
      return {
        subject: data.title || "Nova notificação — TEAM WOLF",
        html: wrapHtml(data.title || "Nova notificação", `<p>${data.message}</p>`),
      };
    case "alert":
      return {
        subject: `⚠️ ${data.title || "Alerta"} — TEAM WOLF`,
        html: wrapHtml(data.title || "Alerta", `<p style="color:#f5a3a3;">${data.message}</p>`),
      };
  }
}

export const sendTransactionalEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      type: z.enum(EMAIL_TYPES),
      to: z.string().email(),
      data: z.record(z.string(), z.string()).optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const rateLimit = checkRateLimit(getRequest(), "email.send", { windowMs: 60_000, max: 10 });
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.message };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY não configurada." };
    }

    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const { subject, html } = buildEmail(input.type, input.data || {});

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: input.to, subject, html }),
        signal: AbortSignal.timeout(15000),
      });

      const json: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: json.message || "Erro ao enviar e-mail via Resend." };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message || "Erro ao conectar com o Resend." };
    }
  });

// Envio de e-mails transacionais via Resend (https://resend.com). Usa fetch
// direto na REST API em vez do SDK "resend" — mesma convenção já usada pra
// Mercado Pago e proxycheck.io neste backend, sem dependência extra.
const RESEND_API_URL = "https://api.resend.com/emails";

function wrapHtml(title, bodyHtml) {
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

// Cada builder recebe os dados do e-mail e devolve { subject, html }.
// Mantidos simples de propósito — texto/rótulos podem ser ajustados depois
// conforme o produto definir a copy final de cada tipo.
const TEMPLATES = {
  account_confirmation: ({ name, confirmUrl }) => ({
    subject: "Confirme sua conta — TEAM WOLF",
    html: wrapHtml(
      "Confirme sua conta",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p>Falta pouco para ativar sua conta na TEAM WOLF. Clique no botão abaixo para confirmar seu e-mail.</p>
       <p style="text-align:center;margin:28px 0;">
         <a href="${confirmUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Confirmar conta</a>
       </p>
       <p style="color:#9a9aa4;font-size:13px;">Se você não criou essa conta, pode ignorar este e-mail.</p>`,
    ),
  }),
  password_reset: ({ name, resetUrl }) => ({
    subject: "Redefinição de senha — TEAM WOLF",
    html: wrapHtml(
      "Redefinição de senha",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
       <p style="text-align:center;margin:28px 0;">
         <a href="${resetUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Redefinir senha</a>
       </p>
       <p style="color:#9a9aa4;font-size:13px;">Se você não pediu essa alteração, ignore este e-mail — sua senha permanece a mesma.</p>`,
    ),
  }),
  billing_notice: ({ name, amount, dueDate, invoiceUrl }) => ({
    subject: "Aviso de cobrança — TEAM WOLF",
    html: wrapHtml(
      "Aviso de cobrança",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p>Há uma cobrança pendente de <strong>${amount}</strong>${dueDate ? `, com vencimento em <strong>${dueDate}</strong>` : ""}.</p>
       ${invoiceUrl ? `<p style="text-align:center;margin:28px 0;"><a href="${invoiceUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Ver cobrança</a></p>` : ""}
       <p style="color:#9a9aa4;font-size:13px;">Se o pagamento já foi feito, desconsidere este aviso.</p>`,
    ),
  }),
  subscription: ({ name, plan, renewsAt }) => ({
    subject: "Assinatura confirmada — TEAM WOLF",
    html: wrapHtml(
      "Assinatura confirmada",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p>Sua assinatura do plano <strong>${plan}</strong> foi confirmada com sucesso.</p>
       ${renewsAt ? `<p>Próxima renovação: <strong>${renewsAt}</strong>.</p>` : ""}
       <p style="color:#9a9aa4;font-size:13px;">Obrigado por fazer parte da TEAM WOLF!</p>`,
    ),
  }),
  notification: ({ name, title, message }) => ({
    subject: title || "Nova notificação — TEAM WOLF",
    html: wrapHtml(
      title || "Nova notificação",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p>${message}</p>`,
    ),
  }),
  alert: ({ name, title, message }) => ({
    subject: `⚠️ ${title || "Alerta"} — TEAM WOLF`,
    html: wrapHtml(
      title || "Alerta",
      `<p>Olá${name ? `, ${name}` : ""}!</p>
       <p style="color:#f5a3a3;">${message}</p>`,
    ),
  }),
};

// Monta o payload de um tipo de e-mail conhecido. Retorna null se o tipo nao
// existir, pra quem chama decidir o 400.
function buildEmail(type, data) {
  const builder = TEMPLATES[type];
  if (!builder) return null;
  return builder(data || {});
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY não configurada." };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: data.message || "Erro ao enviar e-mail via Resend." };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message || "Erro ao conectar com o Resend." };
  }
}

module.exports = { sendEmail, buildEmail, TEMPLATES: Object.keys(TEMPLATES) };

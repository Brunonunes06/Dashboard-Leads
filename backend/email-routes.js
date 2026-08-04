const { Router } = require("express");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { sendEmail, buildEmail, TEMPLATES } = require("./resend-client");

const router = Router();

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// Endpoint interno para disparo dos e-mails transacionais (confirmação de
// conta, reset de senha, cobrança, assinatura, notificação, alerta) — o tipo
// decide o template usado, os dados variam por tipo (ver resend-client.js).
router.post("/api/email/send", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, "email.send", { windowMs: 60_000, max: 10 });
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: rateLimit.message });
  }

  const { type, to, data } = req.body || {};
  const email = normalizeEmail(to);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Destinatário inválido." });
  }

  const built = buildEmail(type, data);
  if (!built) {
    return res.status(400).json({
      success: false,
      error: `Tipo de e-mail inválido. Use um de: ${TEMPLATES.join(", ")}.`,
    });
  }

  const result = await sendEmail({ to: email, subject: built.subject, html: built.html });
  if (!result.success) {
    console.error("[Resend] Erro ao enviar e-mail:", result.error);
    return res.status(200).json({ success: false, error: result.error });
  }

  return res.json({ success: true, id: result.id });
});

module.exports = router;

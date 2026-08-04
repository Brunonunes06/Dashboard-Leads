const { Router } = require("express");
const { checkRateLimit, getClientIp } = require("./rate-limit");

const router = Router();

// Limiar recomendado pelo Google para reCAPTCHA v3: score >= 0.5 = provavelmente humano.
// Porta fiel de src/lib/api/recaptcha.functions.ts.
const SCORE_THRESHOLD = 0.5;

router.post("/api/recaptcha/verify", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, "recaptcha.verify", { windowMs: 60_000, max: 20 });
  if (!rateLimit.allowed) {
    return res.status(429).json({ allowed: false, code: "RATE_LIMITED", message: rateLimit.message });
  }

  const token = req.body && req.body.token;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "O campo 'token' é obrigatório." });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn("[reCAPTCHA] RECAPTCHA_SECRET_KEY não configurada — verificação desativada (fail-open).");
    return res.json({ allowed: true, score: 1 });
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
    });

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    const json = await response.json();

    if (!json.success) {
      console.warn("[reCAPTCHA] Falha na verificação:", json["error-codes"]);
      return res.json({
        allowed: false,
        code: "RECAPTCHA_FAILED",
        message: "Verificação de segurança falhou. Tente novamente.",
      });
    }

    const score = typeof json.score === "number" ? json.score : 1;
    if (score < SCORE_THRESHOLD) {
      return res.json({
        allowed: false,
        code: "RECAPTCHA_FAILED",
        message: "Não foi possível confirmar que você não é um robô.",
      });
    }

    return res.json({ allowed: true, score });
  } catch (error) {
    console.error("[reCAPTCHA] Erro ao verificar token:", error.message);
    return res.json({ allowed: true, score: 1 });
  }
});

module.exports = router;

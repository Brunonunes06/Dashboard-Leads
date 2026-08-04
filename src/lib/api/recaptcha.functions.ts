import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { checkRateLimit } from "../rate-limit.server";

// Limiar recomendado pelo Google para reCAPTCHA v3: score >= 0.5 = provavelmente humano.
const SCORE_THRESHOLD = 0.5;

export type RecaptchaResult =
  | { allowed: true; score: number }
  | { allowed: false; code: "RECAPTCHA_FAILED" | "RATE_LIMITED"; message: string };

export const verifyRecaptcha = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<RecaptchaResult> => {
    const rateLimit = checkRateLimit(getRequest(), "recaptcha.verify", { windowMs: 60_000, max: 20 });
    if (!rateLimit.allowed) {
      return { allowed: false, code: "RATE_LIMITED", message: rateLimit.message };
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.warn("[reCAPTCHA] RECAPTCHA_SECRET_KEY nao configurada — verificacao desativada (fail-open).");
      return { allowed: true, score: 1 };
    }

    try {
      const request = getRequest();
      const remoteIp = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

      const body = new URLSearchParams({
        secret: secretKey,
        response: data.token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      });

      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(5000),
      });

      const json: any = await response.json();

      if (!json.success) {
        console.warn("[reCAPTCHA] Falha na verificacao:", json["error-codes"]);
        return {
          allowed: false,
          code: "RECAPTCHA_FAILED",
          message: "Verificação de segurança falhou. Tente novamente.",
        };
      }

      const score = typeof json.score === "number" ? json.score : 1;
      if (score < SCORE_THRESHOLD) {
        return {
          allowed: false,
          code: "RECAPTCHA_FAILED",
          message: "Não foi possível confirmar que você não é um robô.",
        };
      }

      return { allowed: true, score };
    } catch (error) {
      console.error("[reCAPTCHA] Erro ao verificar token:", (error as Error).message);
      return { allowed: true, score: 1 };
    }
  });

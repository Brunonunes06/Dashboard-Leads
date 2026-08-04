// Rate limit simples em memória (por processo, não distribuído) — mesma
// lógica de src/lib/rate-limit.server.ts, compartilhada entre as rotas novas
// (recaptcha, lgpd) pra não duplicar o Map de novo em cada arquivo.
const hits = new Map();

function checkRateLimit(ip, bucket, { windowMs, max }) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return { allowed: false, message: "Muitas requisições. Tente novamente em instantes." };
  }

  entry.count += 1;
  return { allowed: true };
}

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > 10 * 60 * 1000) hits.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

// "x-forwarded-for" é escrito pelo próprio cliente na requisição — sem um
// proxy confiável na frente pra sobrescrever, qualquer um manda esse header
// com o valor que quiser e engana rate limit, detecção de VPN e o limite de
// "1 conta por IP". "cf-connecting-ip" é diferente: só o edge do Cloudflare
// define esse header, e ele descarta qualquer valor que o cliente tente
// mandar com esse mesmo nome — por isso é a fonte confiável quando existe.
function getClientIp(req) {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) return String(cfIp).trim();

  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.ip || "";
  return (
    String(rawIp)
      .split(",")[0]
      .trim()
      .replace(/^::ffff:/, "") || "unknown"
  );
}

module.exports = { checkRateLimit, getClientIp };

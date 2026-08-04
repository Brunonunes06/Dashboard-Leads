// Mesmos headers de src/server.ts (linhas 21-44) — duplicado aqui porque
// aquele arquivo depende do runtime do TanStack Start (@tanstack/react-start),
// que não existe fora do app React. Mantenha os dois em sincronia se a CSP
// mudar em um dos lados.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.google.com https://www.gstatic.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.recaptcha.net https://sdk.mercadopago.com https://*.mlstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://*.mercadopago.com https://*.mlstatic.com",
  "font-src 'self' https://fonts.gstatic.com data: https://*.mercadopago.com https://*.mlstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://www.google.com https://translate.google.com https://translate.googleapis.com https://api.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com https://*.mercadolibre.com",
  "frame-src 'self' https://accounts.google.com https://www.google.com https://translate.google.com https://*.mercadopago.com https://*.mercadolibre.com",
].join("; ");

function securityHeaders(req, res, next) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
}

module.exports = { securityHeaders };

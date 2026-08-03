// Verifica o ID token do Google direto com o Google (em vez de confiar em
// qualquer e-mail/nome que o cliente afirme ter decodificado do próprio
// JWT) — mesma lógica de src/lib/ip-guard.server.ts::verifyGoogleIdToken.
async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || !idToken) return null;

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);

    // "aud" precisa bater com o nosso Client ID — sem essa checagem, um ID
    // token válido emitido pelo Google para QUALQUER OUTRO app também seria
    // aceito aqui (confusão de audiência).
    if (!payload || payload.aud !== clientId || payload.email_verified !== "true" || !payload.email) {
      return null;
    }

    return { email: String(payload.email).toLowerCase(), name: payload.name || "" };
  } catch {
    return null;
  }
}

module.exports = { verifyGoogleIdToken };

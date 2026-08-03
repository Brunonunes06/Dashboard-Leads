// Verifica o access token do Supabase direto com o Supabase (GET /auth/v1/user)
// em vez de confiar em qualquer coisa que o cliente afirme — mesma lógica de
// src/lib/verify-supabase-token.server.ts. Compartilhado entre
// server-ai-routes.js e lgpd-routes.js pra não triplicar a implementação.
async function verifySupabaseAccessToken(accessToken) {
  if (!accessToken) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json().catch(() => null);
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

module.exports = { verifySupabaseAccessToken };

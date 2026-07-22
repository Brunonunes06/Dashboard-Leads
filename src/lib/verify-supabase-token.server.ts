// Server-only. Verifica um access token do Supabase contra o proprio Supabase
// (GET /auth/v1/user) em vez de confiar em qualquer id/e-mail que o cliente
// mande no corpo da requisicao. Usado para nao deixar endpoints caros (IA)
// ou sensiveis abertos para qualquer chamada anonima.
export async function verifySupabaseAccessToken(
  accessToken: string | undefined | null,
): Promise<{ id: string; email: string | null } | null> {
  if (!accessToken) return null;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const user = (await response.json().catch(() => null)) as { id?: string; email?: string } | null;
    return user?.id ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

// ============================================================
// Hook central de autenticacao. A identidade (email/id) vem sempre da sessao
// real do Supabase (getSession/onAuthStateChange) — nunca de um campo
// persistido no localStorage. O role e recalculado a cada render a partir do
// e-mail real via isAdminEmail, entao nao ha um "role" forjavel guardado em
// disco: quem decide isso e sempre a mesma checagem usada nas rotas admin.
// ============================================================
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/permissions";

export type UserRole = "admin" | "client" | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
}

interface ProfileOverride {
  name?: string;
  avatarUrl?: string;
}

interface PendingUser {
  email: string;
  name: string;
  avatarUrl?: string;
}

function profileOverrideKey(email: string) {
  return `crm_profile_overrides:${email.trim().toLowerCase()}`;
}

function readProfileOverride(email: string | null): ProfileOverride | null {
  if (!email || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(profileOverrideKey(email));
    return raw ? (JSON.parse(raw) as ProfileOverride) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Preenchimento otimista pro nome/foto aparecerem na hora, entre o login
  // com o Google e a sessao do Supabase (signInWithIdToken) ficar pronta.
  // Nunca usado para decidir role — isso sempre vem do email via isAdminEmail.
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [override, setOverride] = useState<ProfileOverride | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setPendingUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const email = session?.user?.email ?? pendingUser?.email ?? null;

  useEffect(() => {
    setOverride(readProfileOverride(email));
  }, [email]);

  const metadata = (session?.user?.user_metadata ?? {}) as { name?: string; avatar_url?: string };

  const user: AuthUser | null = email
    ? {
        id: session?.user?.id ?? email,
        email,
        name: override?.name ?? pendingUser?.name ?? metadata.name ?? email,
        avatarUrl: override?.avatarUrl ?? pendingUser?.avatarUrl ?? metadata.avatar_url,
        role: isAdminEmail(email) ? "admin" : "client",
      }
    : null;

  function login(userData: { id: string; email: string; name: string; avatarUrl?: string }) {
    setPendingUser({ email: userData.email, name: userData.name, avatarUrl: userData.avatarUrl });
  }

  function logout() {
    setPendingUser(null);
    setOverride(null);
  }

  function updateProfile(partial: { name?: string; avatarUrl?: string }) {
    if (!email) return;
    setOverride((prev) => {
      const merged = { ...prev, ...partial };
      try {
        localStorage.setItem(profileOverrideKey(email), JSON.stringify(merged));
      } catch {
        // ignore quota/storage errors — override fica só na memória desta sessão
      }
      return merged;
    });
  }

  return { user, loading, login, logout, updateProfile };
}

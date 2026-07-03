// ============================================================
// PASSO 2: Hook central de autenticação + verificação de acesso
// ============================================================
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/permissions";

export type UserRole = "admin" | "client" | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  billingToken?: string; // token do cartão (Stripe PaymentMethod ID)
  billingActive: boolean;
  billingPlan?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Substitua isso pela sua lógica de autenticação (Supabase, Google OAuth, etc.)
    const stored = localStorage.getItem("crm_user");
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      parsed.role = isAdminEmail(parsed.email) ? "admin" : "client";
      setUser(parsed);
    }
    setLoading(false);
  }, []);

  // Listen to profile updates coming from legacy client scripts (common.js)
  useEffect(() => {
    function onProfileUpdated(e: Event) {
      try {
        const detail = (e as CustomEvent).detail as Partial<AuthUser> | null;
        if (!detail || !detail.email) return;
        const role: UserRole = isAdminEmail(detail.email) ? "admin" : "client";
        const updated: AuthUser = {
          id: (detail as any).id || detail.email || "",
          email: detail.email || "",
          name: detail.name || "",
          avatarUrl: (detail as any).avatarUrl || (detail as any).photo || "",
          role,
          billingToken: (detail as any).billingToken || undefined,
          billingActive: Boolean((detail as any).billingActive || (detail as any).billingPlan),
          billingPlan: (detail as any).billingPlan || null,
        };
        setUser(updated);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("crm_user_profile_updated", onProfileUpdated as EventListener);
    return () => window.removeEventListener("crm_user_profile_updated", onProfileUpdated as EventListener);
  }, []);

  function login(userData: Omit<AuthUser, "role">) {
    const role: UserRole = isAdminEmail(userData.email) ? "admin" : "client";
    const full: AuthUser = { ...userData, role };
    localStorage.setItem("crm_user", JSON.stringify(full));
    setUser(full);
  }

  function logout() {
    localStorage.removeItem("crm_user");
    setUser(null);
  }

  function updateBilling(token: string) {
    if (!user) return;
    const updated = { ...user, billingToken: token, billingActive: true };
    localStorage.setItem("crm_user", JSON.stringify(updated));
    setUser(updated);
  }

  // Dev helper: set auth user from console during development
  try {
    (window as any).__setAuthUser = (u: AuthUser | null) => {
      setUser(u);
      if (u) localStorage.setItem("crm_user", JSON.stringify(u));
      else localStorage.removeItem("crm_user");
    };
  } catch (e) {
    // noop in non-browser environments
  }

  return { user, loading, login, logout, updateBilling };
}

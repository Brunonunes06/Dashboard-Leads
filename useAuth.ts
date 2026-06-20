// ============================================================
// PASSO 2: Hook central de autenticação + verificação de acesso
// ============================================================
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/config/permissions";

export type UserRole = "admin" | "client" | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  billingToken?: string; // token do cartão (Stripe PaymentMethod ID)
  billingActive: boolean;
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

  return { user, loading, login, logout, updateBilling };
}

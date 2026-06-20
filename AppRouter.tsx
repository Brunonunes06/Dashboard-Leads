// ============================================================
// PASSO 6: Roteador principal — controla acesso por email
// ============================================================
// Adapte este arquivo ao seu router atual (TanStack Router)
// ============================================================

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { BillingForm } from "@/components/billing/BillingForm";
import { ConversasPage } from "@/pages/ConversasPage";

// Mapa de rotas e suas permissões
// adminOnly: true  → apenas os 3 emails permitidos
// adminOnly: false → todos os usuários logados
export const ROUTES = {
  // ✅ TODOS os usuários acessam estas rotas:
  "/dashboard": { adminOnly: false, label: "Dashboard" },
  "/conversas": { adminOnly: false, label: "Conversas" },
  "/perfil":    { adminOnly: false, label: "Perfil" },

  // 🔒 APENAS emails permitidos acessam estas rotas:
  "/leads":     { adminOnly: true, label: "Leads" },
  "/relatorios":{ adminOnly: true, label: "Relatórios" },
  "/config":    { adminOnly: true, label: "Configurações" },
  "/webhook":   { adminOnly: true, label: "Webhook" },
  "/cobrancas": { adminOnly: true, label: "Cobranças" },
};

// Componente de exemplo mostrando a lógica de navegação
export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Usuário não logado → login
  if (!user) return <LoginPage />;

  // Usuário logado mas sem billing ativo E não é admin → tela de cobrança
  if (!user.billingActive && user.role !== "admin") {
    return (
      <BillingForm
        planName="LeadsFast Pro"
        planPrice="R$ 97/mês"
        onSuccess={() => window.location.reload()}
      />
    );
  }

  // Usuário com acesso → mostra o app
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Navegação disponível por papel
  const navItems = Object.entries(ROUTES).filter(
    ([, config]) => isAdmin || !config.adminOnly,
  );

  return (
    <div>
      {/* Sua navegação aqui — mostra apenas as rotas permitidas */}
      <nav>
        {navItems.map(([path, config]) => (
          <a key={path} href={path}>{config.label}</a>
        ))}
      </nav>

      {/* Suas rotas com o RouteGuard */}
      {/* Exemplo com TanStack Router:
      <Route path="/leads" element={
        <RouteGuard adminOnly>
          <LeadsPage />
        </RouteGuard>
      } />
      <Route path="/conversas" element={
        <RouteGuard>
          <ConversasPage />
        </RouteGuard>
      } />
      */}
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();

  // Mock login — substitua pelo seu Google OAuth / Supabase Auth
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <button
        className="bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl"
        onClick={() =>
          login({
            id: "user_demo",
            email: "demo@email.com",
            name: "Demo User",
            billingActive: false,
          })
        }
      >
        Entrar (Demo)
      </button>
    </div>
  );
}

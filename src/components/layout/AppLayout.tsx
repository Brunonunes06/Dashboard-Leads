// src/components/layout/AppLayout.tsx
// Envolve todas as páginas com a sidebar correta conforme o papel do usuário
import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { BillingForm } from "@/components/billing/BillingForm";

// Importa suas páginas aqui
import { DashboardPage } from "@/pages/DashboardPage";
import { ConversasPage } from "@/pages/ConversasPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { LeadsPage } from "@/pages/LeadsPage";

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Detecta rota atual (adapte ao seu TanStack Router se necessário)
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname || "/conversas"
  );

  // Se cliente sem billing → mostra cobrança em vez do app
  if (!user) return null;
  if (!user.billingActive && !isAdmin) {
    return (
      <BillingForm
        planName="LeadsFast Pro"
        planPrice="R$ 97/mês"
        onSuccess={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// /*
// ─────────────────────────────────────────────────────
// COMO USAR COM TANSTACK ROUTER:

// No seu __root.tsx ou layout route:

import { AppLayout } from "@/components/layout/AppLayout";
import { Outlet } from "@tanstack/react-router";

export function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────
// REGRAS DE ACESSO (automático via Sidebar + RouteGuard):

//   Email admin  → vê: Dashboard, Conversas, Perfil, CRM Instagram, Configurar IA, Leads, Relatórios
//   Email cliente → vê: Dashboard, Conversas, Perfil (apenas)

// ─────────────────────────────────────────────────────
// */

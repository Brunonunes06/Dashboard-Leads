// src/components/layout/AppLayout.tsx
// Envolve todas as páginas com a sidebar correta conforme o papel do usuário
import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Detecta rota atual (adapte ao seu TanStack Router se necessário)
  const [currentPath, setCurrentPath] = useState(window.location.pathname || "/conversas");

  // Se cliente sem billing → mostra cobrança em vez do app
  if (!user) return null;
  if (!user.billingActive && !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Assinatura necessária</h2>
          <p className="mt-2 text-slate-400">Entre em contato para ativar sua conta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

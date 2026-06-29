// ============================================================
// PASSO 3: Guarda de rotas — controla quem vê o quê
// ============================================================
import React from "react";
import { useAuth } from "@/hooks/useAuth";

interface RouteGuardProps {
  children: React.ReactNode;
  /** Se true, apenas admins acessam. Clientes veem tela de cobrança. */
  adminOnly?: boolean;
}

export function RouteGuard({ children, adminOnly = false }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redireciona para login — adapte para seu router
    window.location.href = "/login";
    return null;
  }

  if (adminOnly && user.role !== "admin") {
    // Cliente tentando acessar área restrita → mostra bloqueio
    return <AccessBlocked />;
  }

  return <>{children}</>;
}

function AccessBlocked() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-center px-4">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
      <p className="text-slate-400 max-w-sm">
        Esta área é exclusiva para administradores do sistema. Volte para{" "}
        <a href="/conversas" className="text-emerald-400 underline">
          suas conversas
        </a>
        .
      </p>
    </div>
  );
}

// src/components/layout/Sidebar.tsx
// Navegação lateral — admin vê tudo, cliente vê apenas Dashboard + Conversas + Perfil
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: "/conversas",
    label: "Conversas",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: "/perfil",
    label: "Perfil",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  // ─── Apenas admins veem abaixo ───
  {
    path: "/crm-instagram",
    label: "CRM Instagram",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    path: "/configurar-ia",
    label: "Configurar IA",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    path: "/leads",
    label: "Leads",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: "/relatorios",
    label: "Relatórios",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function Sidebar({ currentPath = "/conversas", onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  // Filtra itens conforme o papel do usuário
  const visibleItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  function navigate(path: string) {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  }

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Resposta</p>
            <p className="text-slate-500 text-xs mt-0.5">IA para WhatsApp · Imobiliárias</p>
          </div>
        </div>
      </div>

      {/* Label da seção */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Plataforma</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span className={isActive ? "text-emerald-400" : ""}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Status IA (apenas admin) */}
      {isAdmin && (
        <div className="px-5 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <div>
              <p className="text-white text-xs font-medium">IA ativa 24/7</p>
              <p className="text-slate-500 text-xs">Respondendo em ~3s</p>
            </div>
          </div>
        </div>
      )}

      {/* Usuário + logout */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm font-bold flex-shrink-0">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name ?? "Usuário"}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessagesSquare, Settings2, Sparkles, UserCircle, Zap } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão geral", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/leads", icon: MessagesSquare },
  { title: "Configurar IA", url: "/settings", icon: Settings2 },
  { title: "Perfil", url: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-semibold tracking-tight">Resposta</span>
            <span className="text-[11px] text-muted-foreground">IA para WhatsApp · Imobiliárias</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 p-2.5 group-data-[collapsible=icon]:hidden">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium">IA ativa 24/7</span>
            <span className="text-[10px] text-muted-foreground">Respondendo em ~3s</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

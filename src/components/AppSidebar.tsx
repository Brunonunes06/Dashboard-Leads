import { Link, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  Instagram,
  LayoutDashboard,
  MessagesSquare,
  Settings2,
  Sparkles,
  UserCircle,
  Zap,
} from "lucide-react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const ALL_ITEMS = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard, adminOnly: false },
    { title: t("nav.chat"), url: "/leads/chat", icon: MessagesSquare, adminOnly: false },
    { title: t("nav.plans"), url: "/plans", icon: CreditCard, adminOnly: false },
    { title: t("nav.instagram"), url: "/instagram", icon: Instagram, adminOnly: true },
    { title: t("nav.settings"), url: "/settings", icon: Settings2, adminOnly: true },
    { title: t("nav.profile"), url: "/profile", icon: UserCircle, adminOnly: false },
  ];

  const admin = user?.role === "admin";

  const items = ALL_ITEMS.filter((item) => admin || !item.adminOnly);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-semibold tracking-tight">TEAM WOLF</span>
            <span className="text-[11px] text-muted-foreground">SaaS de leads</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.platform")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} onClick={() => isMobile && setOpenMobile(false)}>
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
        {admin && (
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 p-2.5 group-data-[collapsible=icon]:hidden">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium">IA ativa 24/7</span>
              <span className="text-[10px] text-muted-foreground">Respondendo em ~3s</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

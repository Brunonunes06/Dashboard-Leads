import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getLocale } from "@/lib/i18n";
import { mountGoogleTranslate, patchDomForGoogleTranslate } from "@/lib/google-translate";
import { CookieConsent } from "@/components/CookieConsent";

if (typeof window !== "undefined") patchDomForGoogleTranslate();

function NotFoundComponent() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">
          Página não encontrada
        </h2>

        <button
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => navigate({ to: "/" })}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1>Algo deu errado</h1>

        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      {/* suppressHydrationWarning: algumas extensões de navegador (ex: antivírus com
          "proteção web") injetam atributos no <body> antes do React hidratar
          (bis_skin_checked, bis_register etc.) — isso não é um bug do app, é o padrão
          recomendado pelo React pra esse cenário especifico. */}
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    document.documentElement.lang = getLocale();
    mountGoogleTranslate("google_translate_element");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />

            <div className="flex flex-1 flex-col">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
                <SidebarTrigger />
                <div id="google_translate_element" className="notranslate hidden" />
                <div className="ml-auto flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </header>

              <main className="flex-1">
                <Outlet />
              </main>
            </div>
          </div>

          <Toaster />
          <CookieConsent />
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
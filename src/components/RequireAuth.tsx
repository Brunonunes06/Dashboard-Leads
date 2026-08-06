// Bloqueia o conteúdo da página até o usuário logar — em vez de redirecionar
// pra "/" (como as rotas faziam antes via beforeLoad), mostra um popup com o
// login do Google por cima. Reaproveita GoogleLoginButton.tsx.
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { locale } = useTranslation();

  if (loading) return null;

  if (!user) {
    return (
      <Dialog open modal>
        <DialogContent
          className="[&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {locale === "pt"
                ? "Faça login para continuar"
                : locale === "es"
                  ? "Inicia sesión para continuar"
                  : "Log in to continue"}
            </DialogTitle>
            <DialogDescription>
              {locale === "pt"
                ? "Você precisa estar logado pra acessar esta página."
                : locale === "es"
                  ? "Necesitas iniciar sesión para acceder a esta página."
                  : "You need to be logged in to access this page."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <GoogleLoginButton />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}

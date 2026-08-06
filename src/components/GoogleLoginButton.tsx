// Botão de login com Google + toda a lógica de verificação (reCAPTCHA,
// limite de conta por IP, sessão do Supabase) — extraído de src/routes/index.tsx
// pra ser reutilizado em qualquer lugar que precise pedir login (ex:
// RequireAuth.tsx), sem duplicar essa lógica.
import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { registerAccountForIp } from "@/lib/api/ip-guard.functions";
import { verifyRecaptcha } from "@/lib/api/recaptcha.functions";
import { getRecaptchaToken } from "@/lib/recaptcha-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function decodeGoogleCredential(token: string): GoogleProfile {
  const payload = token.split(".")[1];
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json) as GoogleProfile;
}

export function GoogleLoginButton({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useAuth();
  const [blockReason, setBlockReason] = useState<{ code: string; message: string } | null>(null);

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    try {
      const profile = decodeGoogleCredential(response.credential);

      const recaptchaToken = await getRecaptchaToken("login");
      if (recaptchaToken) {
        const recaptchaCheck = await verifyRecaptcha({ data: { token: recaptchaToken } }).catch((err) => {
          console.warn("[reCAPTCHA] Verificacao indisponivel, login liberado:", err);
          return { allowed: true as const, score: 1 };
        });
        if (!recaptchaCheck.allowed) {
          setBlockReason({ code: recaptchaCheck.code, message: recaptchaCheck.message });
          return;
        }
      }

      const ipCheck = await registerAccountForIp({ data: { idToken: response.credential } }).catch((err) => {
        console.warn("[Auth] Validacao de IP/VPN indisponivel, login liberado:", err);
        return { allowed: true as const };
      });

      if (!ipCheck.allowed) {
        setBlockReason({ code: ipCheck.code, message: ipCheck.message });
        return;
      }

      login({
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (error) {
        console.error("Erro ao autenticar no Supabase:", error);
        toast.warning("Login parcial", {
          description: "Perfil salvo, mas a sessão de mensagens não pôde ser criada.",
        });
      } else {
        toast.success("Login com Google realizado com sucesso!");
      }
      onSuccess?.();
    } catch (error) {
      console.error("Erro no login Google:", error);
      toast.error("Erro no login", { description: "Falha ao processar os dados do Google." });
    }
  }

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error("Erro ao inicializar o login Google")}
          shape="pill"
          size="large"
          theme="outline"
        />
      </GoogleOAuthProvider>

      <AlertDialog open={blockReason !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acesso bloqueado</AlertDialogTitle>
            <AlertDialogDescription>{blockReason?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setBlockReason(null)}>Entendi</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

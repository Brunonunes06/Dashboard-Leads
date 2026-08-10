// src/hooks/useSupportIdentity.ts — identidade pra usar em /support, que
// precisa funcionar mesmo sem login de verdade (visitante ainda não é
// cliente, só quer tirar uma dúvida antes de assinar). Se já tem sessão
// (Google), usa ela. Se não tem nenhuma, cria uma sessão anônima do
// Supabase na hora — ganha um user_id de verdade, que funciona com a mesma
// RLS de support_messages (user_id = auth.uid()) sem precisar de nenhuma
// policy nova. Fica isolado aqui (não mexe em useAuth.ts) porque o resto do
// app não deve tratar visitante anônimo como usuário logado de verdade.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useSupportIdentity() {
  const { user, loading: authLoading } = useAuth();
  const [anonId, setAnonId] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(true);
  const [anonError, setAnonError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      setSettingUp(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (!cancelled) {
          setAnonId(session.user.id);
          setSettingUp(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;

      if (error || !data.session) {
        // Provável causa: "Anonymous sign-ins" está desligado no painel do
        // Supabase (Authentication → Settings). Sem isso, visitante sem
        // conta não consegue falar com o suporte.
        console.error("[Suporte] Não foi possível criar sessão anônima:", error?.message);
        setAnonError(error?.message ?? "Não foi possível iniciar o chat de suporte.");
        setSettingUp(false);
        return;
      }

      setAnonId(data.session.user.id);
      setSettingUp(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    userId: user?.id ?? anonId,
    isAdmin: user?.role === "admin",
    isAnonymous: !user && !!anonId,
    loading: authLoading || settingUp,
    error: anonError,
  };
}

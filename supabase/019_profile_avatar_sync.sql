-- ============================================================
-- SINCRONIZAÇÃO DE AVATAR AO VIVO — quando alguém troca a foto em Perfil e
-- salva, o admin (e qualquer um com a conversa dessa pessoa aberta) vê a
-- foto nova sem precisar atualizar a página.
--
-- Por quê uma tabela separada em vez de só liberar public.profiles pro
-- admin: profiles guarda telefone, e o RLS de lá é proposital "só o próprio
-- usuário lê" (ver 006_profiles.sql) — não é algo que o admin deva enxergar
-- de todo mundo. profile_avatars espelha só a foto, via trigger, então dá
-- pra liberar leitura (e Realtime) pro admin sem abrir o resto do perfil.
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_avatars (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_avatars REPLICA IDENTITY FULL;
ALTER TABLE public.profile_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_avatar" ON public.profile_avatars;
CREATE POLICY "users_read_own_avatar"
  ON public.profile_avatars FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_read_all_avatars" ON public.profile_avatars;
CREATE POLICY "admins_read_all_avatars"
  ON public.profile_avatars FOR SELECT
  USING (public.is_admin());

-- Sem policy de INSERT/UPDATE pra ninguém: essa tabela só é escrita pelo
-- trigger abaixo (SECURITY DEFINER), nunca direto pelo navegador.

CREATE OR REPLACE FUNCTION public.sync_profile_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_avatars (user_id, avatar_url, updated_at)
  VALUES (NEW.user_id, NEW.avatar_url, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET avatar_url = EXCLUDED.avatar_url, updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_avatar ON public.profiles;
CREATE TRIGGER profiles_sync_avatar
  AFTER INSERT OR UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_avatar();

-- Backfill pra quem já salvou uma foto antes desta migração existir.
INSERT INTO public.profile_avatars (user_id, avatar_url, updated_at)
SELECT user_id, avatar_url, updated_at FROM public.profiles
ON CONFLICT (user_id) DO UPDATE
  SET avatar_url = EXCLUDED.avatar_url, updated_at = EXCLUDED.updated_at;

-- Habilita Realtime pra essa tabela (mesmo passo que 018_enable_realtime.sql
-- fez pras outras — idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profile_avatars'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_avatars;
  END IF;
END $$;

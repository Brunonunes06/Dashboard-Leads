-- ============================================================
-- PROFILES — dados de conta (nome completo, e-mail, telefone) por usuário
-- Run this in Supabase SQL Editor
--
-- Antes disso, a tela de Perfil (src/routes/profile.tsx) só guardava nome/foto
-- num override local (localStorage) — o telefone nem era persistido em lugar
-- nenhum. Esta tabela guarda uma linha por usuário autenticado (user_id =
-- auth.users.id), assim os dados sobrevivem a trocar de navegador/dispositivo.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  name              TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  google_connected  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

-- Cada usuário só lê, cria e atualiza a própria linha (user_id = auth.uid()).
-- Não existe policy de admin aqui de propósito — são dados de conta pessoal,
-- não algo que o admin do negócio precise enxergar de todo mundo.
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

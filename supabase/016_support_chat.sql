-- ============================================================
-- SUPPORT CHAT — canal de suporte entre um cliente (assinante do CRM) e o
-- admin (Digmans), com IA respondendo automaticamente do lado do cliente.
-- Diferente de public.messages (que é lead↔corretor): aqui a "conversa" é
-- por user_id (uma por cliente), não por lead_id.
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'admin', 'bot')),
  content     TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_user_id_idx ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at);

-- Pra Realtime (INSERT/UPDATE completos no payload)
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- IMPORTANTE: depois de rodar este SQL, habilite Realtime pra essa tabela em
-- Database → Replication → toggle "support_messages" no painel do Supabase
-- (mesmo passo manual já necessário pra public.messages).

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Cliente lê só a própria conversa
DROP POLICY IF EXISTS "clients_read_own_support_messages" ON public.support_messages;
CREATE POLICY "clients_read_own_support_messages"
  ON public.support_messages FOR SELECT
  USING (user_id = auth.uid());

-- Cliente insere mensagem própria ('client') ou a resposta da IA ('bot') —
-- nunca como 'admin', só quem é admin de verdade pode fazer isso (ver
-- policy abaixo, via public.is_admin()).
DROP POLICY IF EXISTS "clients_insert_own_support_messages" ON public.support_messages;
CREATE POLICY "clients_insert_own_support_messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (user_id = auth.uid() AND sender_role IN ('client', 'bot'));

-- Cliente marca como lida (read_at) a própria conversa
DROP POLICY IF EXISTS "clients_update_own_support_read_at" ON public.support_messages;
CREATE POLICY "clients_update_own_support_read_at"
  ON public.support_messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (true);

-- Admin vê/responde/atualiza todas as conversas de suporte — reaproveita
-- public.is_admin() já criada em 009_security_hardening.sql.
DROP POLICY IF EXISTS "admins_all_support_messages" ON public.support_messages;
CREATE POLICY "admins_all_support_messages"
  ON public.support_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

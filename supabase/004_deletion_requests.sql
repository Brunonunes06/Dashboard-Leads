-- ============================================================
-- LGPD — Solicitações de exclusão de dados (Art. 18, VI da LGPD)
-- Run this in Supabase SQL Editor
--
-- Guarda o pedido do titular dos dados para exclusão da conta. Não apaga nada
-- automaticamente: fica registrado para alguém (admin) processar e apagar de
-- fato (leads, mensagens, conta) — apagar na hora, direto de um clique do
-- usuário, é arriscado demais para automatizar sem revisão.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_deletion_request" ON public.deletion_requests;
DROP POLICY IF EXISTS "users_read_own_deletion_request" ON public.deletion_requests;
DROP POLICY IF EXISTS "admins_read_all_deletion_requests" ON public.deletion_requests;

-- Qualquer usuário logado pode registrar um pedido — só para o próprio user_id.
CREATE POLICY "users_insert_own_deletion_request"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuário só vê os próprios pedidos.
CREATE POLICY "users_read_own_deletion_request"
  ON public.deletion_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admins veem todos os pedidos pendentes para processar.
CREATE POLICY "admins_read_all_deletion_requests"
  ON public.deletion_requests FOR SELECT
  USING (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );

-- ============================================================
-- PAYMENT_REMINDER_LOG — histórico de lembretes de cobrança por WhatsApp
-- Run this in Supabase SQL Editor
--
-- Cada envio do job diário (backend/payment-reminders-cron.js) vira uma
-- linha aqui. O unique index em (subscription_id, reminder_date) garante que
-- o mesmo dia nunca gera dois envios pra mesma assinatura, mesmo se o job
-- rodar duas vezes (restart do servidor, etc). Só a service role (usada pelo
-- job) escreve aqui — igual à tabela subscriptions (007_subscriptions.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_reminder_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_date     DATE NOT NULL,
  weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_reminder_log_one_per_day
  ON public.payment_reminder_log (subscription_id, reminder_date);

CREATE INDEX IF NOT EXISTS payment_reminder_log_user_id_idx ON public.payment_reminder_log (user_id);

ALTER TABLE public.payment_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_reminder_log" ON public.payment_reminder_log;

-- Usuário só lê os próprios lembretes — nunca escreve (só o job, via
-- SUPABASE_SERVICE_ROLE_KEY, que bypassa RLS).
CREATE POLICY "users_read_own_reminder_log"
  ON public.payment_reminder_log FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- FREE TRIAL — permite registrar o Plano Semanal (grátis) na tabela
-- subscriptions, hoje tratado 100% no frontend sem nenhum registro (ver
-- comentários em backend/payments-routes.js e src/routes/plans.tsx). Isso
-- trava a reativação do trial de duas formas:
--   1) unique index: cada usuário só consegue ter UMA linha plan='semanal'
--      (impede reativar o trial de novo, mesmo em outra aba/dispositivo).
--   2) policy de INSERT liberada só pra plan='semanal' + status='active' —
--      mensal/anual continuam sem policy de escrita pro cliente (só o
--      webhook, com a service role, grava essas — ver 007_subscriptions.sql).
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.subscriptions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%method%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_method_check
  CHECK (method IN ('pix', 'card', 'boleto', 'card_recurring', 'free'));

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_free_trial_per_user
  ON public.subscriptions (user_id)
  WHERE plan = 'semanal';

DROP POLICY IF EXISTS "users_insert_own_free_trial" ON public.subscriptions;

CREATE POLICY "users_insert_own_free_trial"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND plan = 'semanal'
    AND method = 'free'
    AND status = 'active'
  );

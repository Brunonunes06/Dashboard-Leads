-- ============================================================
-- TEST PLAN — plano "teste" (src/routes/plans.tsx), disponível pra qualquer
-- cliente logado, limitado a 1 uso por conta (permanente, não reseta).
-- Run this in Supabase SQL Editor
--
-- Serve pra validar o envio de WhatsApp (backend/payment-reminders-cron.js)
-- sem esperar pagamento real: cria uma assinatura 'pending' igual
-- mensal/anual (então o job de cobrança pega ela normalmente), e um limpador
-- (backend/payment-reminders-cron.js::runTestPlanCheck) apaga a linha sozinho
-- depois do envio — por isso o "1 uso por conta" é controlado por
-- profiles.test_message_sent_at (a linha da assinatura em si não sobrevive
-- pra servir de controle).
-- ============================================================

-- public.is_admin() (009_security_hardening.sql) estava desatualizada: só
-- tinha 2 dos 3 e-mails de VITE_ADMIN_EMAILS (faltava
-- bruno.nunes.santos06@escola.pr.gov.br). Corrigindo aqui — ainda é usada por
-- outras policies privilegiadas do projeto (leads, messages), mesmo não
-- sendo mais exigida pro plano "teste" (que agora é aberto a todo cliente).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT auth.email() = ANY (ARRAY[
    'myhpc3301@gmail.com',
    'cruz.gustav234@gmail.com',
    'bruno.nunes.santos06@escola.pr.gov.br'
  ]);
$$;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.subscriptions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%plan%'
    AND pg_get_constraintdef(oid) ILIKE '%semanal%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('semanal', 'mensal', 'anual', 'teste'));

-- Marca quando a conta já usou o teste — o backend seta isso (service role)
-- depois de mandar a mensagem com sucesso, antes de apagar a linha em
-- subscriptions. É o que a policy abaixo usa pra bloquear reuso.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS test_message_sent_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "users_insert_own_test_plan" ON public.subscriptions;

-- Qualquer cliente logado pode inserir plan='teste' pra si mesmo, uma única
-- vez — bloqueado depois via NOT EXISTS checando
-- profiles.test_message_sent_at (setado pelo backend após o envio).
CREATE POLICY "users_insert_own_test_plan"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND plan = 'teste'
    AND method = 'free'
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.test_message_sent_at IS NOT NULL
    )
  );

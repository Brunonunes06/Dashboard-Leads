-- ============================================================
-- SUBSCRIPTIONS — histórico/estado de pagamentos e assinaturas
-- Run this in Supabase SQL Editor
--
-- Cada tentativa de pagamento (Pix, cartão, boleto ou assinatura recorrente)
-- vira uma linha aqui. Fica 'pending' até o webhook do Mercado Pago confirmar
-- de verdade (backend/payments-routes.js) — só então vira 'active' e a tag do
-- plano aparece no perfil (src/routes/profile.tsx). Não existe policy de
-- INSERT/UPDATE para o cliente: só o webhook, usando a service role key (que
-- ignora RLS), grava status — assim ninguém consegue chamar a API e se
-- autoconceder um plano sem pagar.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('semanal', 'mensal', 'anual')),
  method              TEXT NOT NULL CHECK (method IN ('pix', 'card', 'boleto', 'card_recurring')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'canceled', 'expired', 'rejected')),
  mp_payment_id       TEXT,
  mp_preapproval_id   TEXT,
  started_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_mp_payment_id_idx ON public.subscriptions (mp_payment_id);
CREATE INDEX IF NOT EXISTS subscriptions_mp_preapproval_id_idx ON public.subscriptions (mp_preapproval_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_subscriptions" ON public.subscriptions;

-- Usuário só lê as próprias assinaturas — nunca escreve. Escrita é só via
-- SUPABASE_SERVICE_ROLE_KEY no webhook (bypassa RLS por padrão).
CREATE POLICY "users_read_own_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

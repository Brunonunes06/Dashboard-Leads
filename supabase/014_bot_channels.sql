-- ============================================================
-- BOT CHANNELS — suporte a leads vindos do Instagram (além do WhatsApp já
-- existente) e configuração do bot de IA guardada no banco (não mais só
-- localStorage do navegador), pra um processo no servidor (sem navegador
-- aberto) conseguir ler as mesmas instruções que o admin configura em
-- /settings. Ver backend/meta-webhook-routes.js.
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'instagram')),
  ADD COLUMN IF NOT EXISTS instagram_id TEXT;

-- Um lead do Instagram é identificado pelo IGSID (instagram_id), não por
-- telefone — único quando presente, pra achar o lead certo em cada webhook
-- sem duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS leads_instagram_id_idx
  ON public.leads (instagram_id)
  WHERE instagram_id IS NOT NULL;

-- Configuração do bot (nome/marca/tom da IA, etc — os campos que já existem
-- em src/routes/settings.tsx) — tabela singleton (só 1 linha), já que hoje
-- essa tela é global e só admin acessa. O truque do "id boolean" força no
-- máximo 1 linha na tabela (chave primária só aceita um valor: true).
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id          BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "admins_write_bot_settings" ON public.bot_settings;

-- Só admin lê/escreve (public.is_admin(), 009_security_hardening.sql) — o
-- webhook do bot (backend/meta-webhook-routes.js) lê via service role, que
-- bypassa RLS.
CREATE POLICY "admins_read_bot_settings"
  ON public.bot_settings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admins_write_bot_settings"
  ON public.bot_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

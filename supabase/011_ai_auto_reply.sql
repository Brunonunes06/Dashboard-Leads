-- ============================================================
-- AI AUTO REPLY — coluna que liga/desliga a resposta automática da IA por
-- conversa (lead). Controlado pelo admin no chat (src/components/ChatWindow.tsx).
-- Quando ligado, uma nova mensagem do lead dispara a IA e envia a resposta
-- sozinha, sem o admin precisar aprovar — só funciona enquanto alguém está
-- com o chat aberto no navegador (é um listener client-side via Supabase
-- Realtime, não um bot rodando 24h no servidor).
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_auto_reply BOOLEAN NOT NULL DEFAULT false;

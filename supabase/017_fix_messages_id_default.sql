-- ============================================================
-- FIX: public.messages.id sem DEFAULT no banco ao vivo — o schema real
-- divergiu do que está versionado em 001_messages_rls.sql (mesmo tipo de
-- divergência já documentado em 010_multitenant_leads.sql). Sem o DEFAULT,
-- todo INSERT que não informa "id" explicitamente falha com:
--   null value in column "id" of relation "messages" violates
--   not-null constraint
-- o que bloqueava qualquer envio de mensagem pelo chat (admin ou cliente).
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid();

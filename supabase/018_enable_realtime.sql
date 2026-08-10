-- ============================================================
-- FIX: habilita Realtime (INSERT/UPDATE ao vivo) via SQL — equivalente a
-- ligar o toggle em Database → Replication no painel do Supabase pra cada
-- tabela. Sem isso, quem manda a mensagem vê ela na hora (atualização local
-- otimista), mas a outra parte da conversa (WhatsApp entrando pelo webhook
-- com service role, ou uma segunda aba/usuário) só vê depois de atualizar a
-- página — o canal Realtime que o app assina nunca recebe o evento.
--
-- Idempotente: só adiciona a tabela na publicação se ainda não estiver lá
-- (rodar de novo não dá erro).
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;

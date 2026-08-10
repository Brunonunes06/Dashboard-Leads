-- ============================================================
-- Admin pode apagar QUALQUER mensagem do chat de leads (não só as que ele
-- mesmo mandou) — moderação: às vezes precisa remover uma mensagem que o
-- lead mandou, não só a própria. No chat de suporte isso já funcionava
-- (admins_all_support_messages é FOR ALL, sem restrição de remetente,
-- criada em 016_support_chat.sql) — só faltava aqui em public.messages.
-- Run this in Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "admins_delete_own_messages" ON public.messages;
DROP POLICY IF EXISTS "admins_delete_any_message" ON public.messages;
CREATE POLICY "admins_delete_any_message"
  ON public.messages FOR DELETE
  USING (public.is_admin());

-- clients_delete_own_messages (cliente dono do lead apagando a PRÓPRIA
-- mensagem) continua igual — cliente não deleta mensagem do lead, só a
-- que ele mesmo escreveu.

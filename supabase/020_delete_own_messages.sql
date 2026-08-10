-- ============================================================
-- EXCLUIR MENSAGEM PRÓPRIA — deixa quem mandou uma mensagem (e só quem
-- mandou) apagar ela depois, tanto no chat de leads (public.messages)
-- quanto no chat de suporte (public.support_messages). Antes não existia
-- policy de DELETE pra ninguém em messages (nem pra admin).
-- Run this in Supabase SQL Editor
-- ============================================================

-- --- public.messages (chat de leads) ---

-- Admin apaga só a própria mensagem enviada (sender_id = auth.uid()) —
-- mesma restrição de admins_insert_messages, agora pra DELETE.
DROP POLICY IF EXISTS "admins_delete_own_messages" ON public.messages;
CREATE POLICY "admins_delete_own_messages"
  ON public.messages FOR DELETE
  USING (public.is_admin() AND sender_id = auth.uid());

-- Cliente (dono do lead) apaga só a própria mensagem enviada nesse lead —
-- mesma restrição de clients_insert_own_messages (010_multitenant_leads.sql),
-- agora pra DELETE.
DROP POLICY IF EXISTS "clients_delete_own_messages" ON public.messages;
CREATE POLICY "clients_delete_own_messages"
  ON public.messages FOR DELETE
  USING (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = messages.lead_id AND l.user_id = auth.uid())
  );

-- --- public.support_messages (chat de suporte) ---
-- Admin já cobre DELETE via "admins_all_support_messages" (FOR ALL, criada
-- em 016_support_chat.sql) — só falta o lado do cliente.

DROP POLICY IF EXISTS "clients_delete_own_support_messages" ON public.support_messages;
CREATE POLICY "clients_delete_own_support_messages"
  ON public.support_messages FOR DELETE
  USING (user_id = auth.uid() AND sender_id = auth.uid());

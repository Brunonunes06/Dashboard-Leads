-- ============================================================
-- MULTI-TENANT LEADS — cada cliente pagante (não-admin) passa a ver e
-- responder só os PRÓPRIOS leads/conversas, em vez de nada (hoje só admin
-- tem acesso). O admin continua vendo TUDO, de todo mundo.
-- Run this in Supabase SQL Editor
--
-- Se adapta sozinho ao schema ao vivo: cria a coluna leads.user_id só se
-- ela ainda não existir (o schema real desse banco já divergiu do que
-- estava versionado neste repo mais de uma vez até aqui).
--
-- IMPORTANTE: essa coluna só resolve a visibilidade de leads NOVOS a
-- partir de agora, se algo além deste app (a automação que recebe
-- WhatsApp/Instagram) passar a preencher leads.user_id na hora de criar o
-- lead — associando o número/conta por onde a mensagem chegou ao dono
-- certo. Leads que já existem ficam com user_id NULL (só o admin continua
-- vendo esses, até alguém atribuir um dono manualmente).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads (user_id);

-- Cliente lê os próprios leads (além do admin, que já vê tudo via
-- admins_all_leads em 009_security_hardening.sql)
DROP POLICY IF EXISTS "clients_read_own_leads" ON public.leads;
CREATE POLICY "clients_read_own_leads"
  ON public.leads FOR SELECT
  USING (user_id = auth.uid());

-- Cliente lê mensagens dos próprios leads
DROP POLICY IF EXISTS "clients_read_own_messages" ON public.messages;
CREATE POLICY "clients_read_own_messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = messages.lead_id AND l.user_id = auth.uid()
    )
  );

-- Cliente responde (insere mensagem) nos próprios leads — mesma regra do
-- admin em admins_insert_messages, mas restrita a lead do próprio dono.
DROP POLICY IF EXISTS "clients_insert_own_messages" ON public.messages;
CREATE POLICY "clients_insert_own_messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_role = 'admin'
    AND sender_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = messages.lead_id AND l.user_id = auth.uid()
    )
  );

-- Cliente marca como lida (read_at) nos próprios leads
DROP POLICY IF EXISTS "clients_update_read_at" ON public.messages;
CREATE POLICY "clients_update_read_at"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = messages.lead_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

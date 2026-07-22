-- ============================================================
-- FIX: 001_messages_rls.sql tinha 3 policies que dependiam de
-- public.leads.user_id — coluna que não existe (confirmado via
-- information_schema.columns). Essas policies nunca puderam ter sido
-- criadas com sucesso (Postgres valida a coluna na hora do CREATE POLICY).
--
-- Contexto: leads não tem dono/tenant (SaaS single-tenant, só um admin).
-- Mensagens com sender_role='client' são as mensagens do WHATSAPP do lead —
-- inseridas pelo processo/automação que recebe as mensagens (normalmente via
-- service role, que já ignora RLS), não por um usuário autenticado com conta
-- própria. Ou seja, o conceito de "cliente com login vendo só as próprias
-- mensagens" não existe neste app — só sobra o acesso do admin, que já
-- funciona nas outras 3 policies de 001 (essas continuam intactas).
-- ============================================================

DROP POLICY IF EXISTS "clients_read_own_messages" ON public.messages;
DROP POLICY IF EXISTS "clients_insert_own_messages" ON public.messages;
DROP POLICY IF EXISTS "clients_update_read_at" ON public.messages;

-- As policies que continuam valendo (de 001_messages_rls.sql, não precisa
-- reexecutar): admins_read_all_messages, admins_insert_messages,
-- admins_update_read_at — todas usam só auth.email(), sem depender de
-- leads.user_id.

-- ============================================================
-- SECURITY HARDENING — corrige os achados do Supabase Security Advisor
-- Run this in Supabase SQL Editor
--
-- 1) public.leads e public.messages têm, no banco ao vivo, policies que não
--    batem com o que está versionado em 003_leads_rls.sql e
--    001/005_*_messages_rls.sql — confirmado no painel (Authentication →
--    Policies): messages tinha uma policy "allow all" FOR ALL TO public
--    USING(true), ou seja, QUALQUER PESSOA NA INTERNET, sem nem estar
--    logada, lia/escrevia qualquer mensagem de qualquer lead. As outras
--    (authenticated_read/insert/update_messages) só checavam "está logado",
--    sem separar por dono. Isso faz um RESET completo: apaga todas as
--    policies de leads/messages e recria só as admin-only corretas.
-- 2) public.mensagens e public.chat_messages (tabelas não usadas em nenhum
--    lugar do código deste app — só public.messages, em inglês, é
--    referenciada) também tinham policies abertas. Mesma lógica: zera as
--    policies e deixa RLS ligado sem nenhuma (fecha por padrão).
-- 3) public.rls_auto_enable() é SECURITY DEFINER (roda com privilégio
--    elevado) e estava executável por "anon" e "authenticated" via RPC
--    pública — revoga esse acesso.
-- 4) public.update_updated_at_column() sem search_path fixo — corrige pra
--    evitar "search_path hijacking" (alguém criar um objeto com o mesmo nome
--    em outro schema pra a função executar código não esperado).
-- ============================================================

-- 0: função helper com os e-mails de admin embutidos, em vez de depender de
-- current_setting('app.admin_emails') via ALTER DATABASE — no Supabase
-- hospedado, a role do SQL Editor não tem permissão de superusuário pra
-- ALTER DATABASE ... SET (erro "permission denied to set parameter"), então
-- essa configuração nunca chega a ser aplicada. CREATE FUNCTION no schema
-- public não exige esse privilégio, então isso funciona sem precisar de
-- suporte/acesso especial. Pra adicionar/trocar admin no futuro, só rodar
-- este CREATE OR REPLACE de novo com a lista atualizada.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT auth.email() = ANY (ARRAY['myhpc3301@gmail.com', 'cruz.gustav234@gmail.com']);
$$;

-- 1 e 2: RESET COMPLETO das policies de leads/messages — em vez de tentar
-- adivinhar quais policies remover, isso apaga TODAS as policies existentes
-- nessas tabelas (inclusive as com nomes que a gente nem sabia que
-- existiam, tipo "allow all"/"authenticated_read_messages" vistas no painel)
-- e recria só as corretas (admin-only). Confirmado ao vivo no painel do
-- Supabase (Authentication → Policies): a tabela messages tinha uma policy
-- "allow all" FOR ALL TO public USING(true) — ou seja, qualquer pessoa na
-- internet, nem precisando estar logada, conseguia ler/escrever qualquer
-- mensagem de qualquer lead. As policies "authenticated_read/insert/update_
-- messages" também não faziam distinção nenhuma de dono, só checavam "está
-- logado" — não é multi-tenant, é RLS genérico que "AI tools" de RLS
-- automático costumam gerar.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('leads', 'messages')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Policy removida: % em %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_all_leads"
  ON public.leads FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_all_messages"
  ON public.messages FOR SELECT
  USING (public.is_admin());
CREATE POLICY "admins_insert_messages"
  ON public.messages FOR INSERT
  -- sender_id::text: o tipo real dessa coluna no banco ao vivo diverge do
  -- que estava versionado (UUID, ver 001_messages_rls.sql) — comparando
  -- como texto funciona tanto se a coluna for UUID quanto TEXT.
  WITH CHECK (public.is_admin() AND sender_role = 'admin' AND sender_id::text = auth.uid()::text);
CREATE POLICY "admins_update_read_at"
  ON public.messages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (true);

-- mensagens e chat_messages (tabelas não usadas por nenhum código deste
-- app): garante RLS ligado e SEM policy nenhuma — isso é "fecha por
-- padrão" (ninguém lê/escreve via API), o estado seguro pra tabela órfã.
-- Se confirmar depois que são mesmo lixo de versões antigas, dá pra dropar.
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensagens') THEN
    EXECUTE 'ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY';
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mensagens' LOOP
      EXECUTE format('DROP POLICY %I ON public.mensagens', pol.policyname);
      RAISE NOTICE 'Policy removida: % em public.mensagens', pol.policyname;
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    EXECUTE 'ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 3: revoga EXECUTE público em rls_auto_enable() (qualquer assinatura).
-- Precisa incluir PUBLIC explicitamente: por padrão o Postgres libera
-- EXECUTE em funções novas pra PUBLIC (todo mundo) — revogar só de
-- anon/authenticated não basta, porque esses papéis herdam de PUBLIC.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn.proname, fn.args);
    RAISE NOTICE 'EXECUTE revogado (incl. PUBLIC) em public.%(%)', fn.proname, fn.args;
  END LOOP;
END $$;

-- 4: fixa search_path em update_updated_at_column() (qualquer assinatura)
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp', fn.proname, fn.args);
    RAISE NOTICE 'search_path fixado em public.%(%)', fn.proname, fn.args;
  END LOOP;
END $$;

-- ============================================================
-- NÃO DÁ PRA CORRIGIR VIA SQL — precisa fazer manualmente no painel:
--
-- "Proteção contra senha vazada desativada":
--   Dashboard → Authentication → Policies (ou "Auth" → "Settings") →
--   ative "Leaked password protection" (checa contra HaveIBeenPwned).
--   Um clique, sem risco.
-- ============================================================

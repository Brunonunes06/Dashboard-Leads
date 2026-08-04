-- ============================================================
-- LEADS TABLE — ROW LEVEL SECURITY
-- Run this in Supabase SQL Editor
--
-- CONTEXTO / POR QUE ISSO E CRITICO:
-- A tabela public.leads e consultada direto do navegador (supabase-js com a
-- anon key, que e publica por design). O app inteiro depende de RLS para
-- impedir que qualquer pessoa com a anon key leia/edite os leads — sem RLS
-- habilitado aqui, um GET simples em {SUPABASE_URL}/rest/v1/leads?select=*
-- devolve TODOS os leads (nome, telefone, orcamento, etc.), mesmo sem estar
-- logado. Nao existia nenhuma migracao versionada habilitando RLS nesta
-- tabela — este arquivo cobre essa lacuna.
--
-- MODELO: este SaaS e single-tenant (um unico negocio, um unico admin
-- configurado em app.admin_emails). "Cliente" aqui e o lead que manda
-- mensagem pelo WhatsApp — essa pessoa nunca loga neste dashboard nem
-- consulta o Supabase diretamente, entao nao existe "cliente ve so os
-- proprios leads" pra tabela leads (diferente de messages, que tem esse
-- caso). Por isso: so admin acessa leads. Qualquer outro usuario autenticado
-- (ou anonimo) fica sem nenhum acesso — é o comportamento seguro por padrão
-- do RLS quando nenhuma policy libera a linha.
-- ============================================================

-- 1. Habilita RLS (idempotente — nao quebra nada se ja estiver habilitado)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Remove policies antigas com o mesmo nome, caso esta migracao seja
-- reexecutada (evita erro de "policy already exists"). Inclui os nomes da
-- versao anterior deste arquivo, que assumia (errado) uma coluna user_id.
DROP POLICY IF EXISTS "admins_read_all_leads" ON public.leads;
DROP POLICY IF EXISTS "clients_read_own_leads" ON public.leads;
DROP POLICY IF EXISTS "admins_write_all_leads" ON public.leads;
DROP POLICY IF EXISTS "clients_write_own_leads" ON public.leads;
DROP POLICY IF EXISTS "admins_update_all_leads" ON public.leads;
DROP POLICY IF EXISTS "clients_update_own_leads" ON public.leads;
DROP POLICY IF EXISTS "admins_all_leads" ON public.leads;

-- 3. Uma única policy: só o(s) e-mail(s) admin acessa(m) leads, pra
-- select/insert/update/delete.
CREATE POLICY "admins_all_leads"
  ON public.leads FOR ALL
  USING (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  )
  WITH CHECK (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );

-- ============================================================
-- IMPORTANTE: isso só funciona se app.admin_emails já estiver configurado no
-- Postgres. Se ainda não configurou, rode (troque pelo seu e-mail e pelo nome
-- real do seu banco, geralmente "postgres"):
--
--   ALTER DATABASE postgres SET app.admin_emails = 'seuemail@gmail.com';
--
-- Sem isso configurado, a policy nunca vai bater (falha fechada — ninguém,
-- nem admin, veria os leads via essa policy — o que é seguro, mas quebra a
-- funcionalidade do dashboard até você configurar isso).
--
-- IMPORTANTE #2: depois de ALTER DATABASE, é preciso abrir uma NOVA conexão
-- pro Postgres pra current_setting enxergar o valor (no Supabase, isso
-- normalmente já acontece a cada requisição via PostgREST, então não deve
-- exigir nada extra — mas se testar no SQL Editor e não bater, feche e abra
-- uma nova aba/sessão de query).
--
-- Depois de rodar esta migração, verifique com uma conta NÃO admin (ou sem
-- login) se {SUPABASE_URL}/rest/v1/leads não retorna mais nada — esse é o
-- teste que confirma que o RLS está de fato bloqueando acesso indevido.
-- ============================================================

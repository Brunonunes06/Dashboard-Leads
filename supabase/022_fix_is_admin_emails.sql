-- ============================================================
-- FIX: public.is_admin() estava com só 2 dos 3 e-mails de admin
-- configurados em VITE_ADMIN_EMAILS/.env — faltava
-- bruno.nunes.santos06@escola.pr.gov.br. Pro frontend essa pessoa é admin
-- (isAdminEmail em src/lib/permissions.ts lê do .env), mas pro banco não
-- era — RLS bloqueava ela de ver mensagens/leads de outras conversas
-- (admins_all_support_messages, admins_all_leads etc. dependem de
-- is_admin()), e por tabela o Realtime (que respeita RLS) também não
-- entregava os eventos.
--
-- Esses dois lugares (VITE_ADMIN_EMAILS no .env e esta função) são fontes
-- de verdade separadas e precisam ser mantidas em sincronia manualmente
-- sempre que um admin novo for adicionado — não tem como a função SQL ler
-- uma variável de ambiente do Vite.
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT auth.email() = ANY (ARRAY[
    'myhpc3301@gmail.com',
    'cruz.gustav234@gmail.com',
    'bruno.nunes.santos06@escola.pr.gov.br'
  ]);
$$;

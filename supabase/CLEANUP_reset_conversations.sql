-- ============================================================
-- LIMPEZA DE DADOS DE TESTE — apaga TODOS os leads, mensagens (chat de
-- leads) e conversas de suporte que existem hoje. Perfis, assinaturas e
-- contas de usuário (auth.users) continuam intactos — só o conteúdo das
-- conversas é apagado.
--
-- Isso é uma operação de dados, não de schema — não é numerada junto com
-- as migrações (001, 002...). Rode manualmente no SQL Editor do Supabase
-- só quando quiser mesmo zerar as conversas.
--
-- IRREVERSÍVEL. Não tem como desfazer depois de rodar.
-- ============================================================

DELETE FROM public.messages;
DELETE FROM public.leads;
DELETE FROM public.support_messages;

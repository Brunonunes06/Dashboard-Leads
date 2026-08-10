-- ============================================================
-- CORREÇÕES DE SEGURANÇA (relatório do usuário) — dois problemas "Alto":
--
-- 1) support_messages permitia inserir com QUALQUER sender_id — a policy só
--    conferia de quem era a conversa (user_id), nunca quem "mandou" a
--    mensagem. Um cliente autenticado podia forjar sender_id de outra
--    pessoa dentro da própria conversa. Aproveitando essa correção, também
--    resolvo um bug de tipo: sender_id era UUID, mas a resposta da IA usa o
--    literal "bot" (não é um UUID válido) — SupportChatWindow.tsx::
--    triggerAiReply chama sendMessage(texto, "bot", "bot"), o que hoje
--    provavelmente falha silenciosamente contra a coluna UUID. Vira TEXT
--    pra aceitar os dois casos (UUID de verdade do usuário, ou o literal
--    "bot") com uma regra que confere cada um corretamente.
--
-- 2) Não existia limite de quantas mensagens alguém manda por segundo —
--    só a RLS de dono protegia, sem limite de volume. Adiciona um gatilho
--    (trigger) que barra mais de 15 mensagens em 10 segundos na MESMA
--    conversa (por remetente) — tanto no chat de leads (public.messages)
--    quanto no de suporte (public.support_messages). É por conversa, não
--    global, pra não travar o bot respondendo vários leads diferentes ao
--    mesmo tempo.
--
-- Run this in Supabase SQL Editor
-- ============================================================

-- --- 1) support_messages: sender_id vira TEXT + policy de INSERT correta ---

ALTER TABLE public.support_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;

DROP POLICY IF EXISTS "clients_insert_own_support_messages" ON public.support_messages;
CREATE POLICY "clients_insert_own_support_messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (sender_role = 'client' AND sender_id = auth.uid()::text)
      OR (sender_role = 'bot' AND sender_id = 'bot')
    )
  );

-- clients_delete_own_support_messages (020_delete_own_messages.sql) comparava
-- sender_id = auth.uid() (UUID) — agora que a coluna é TEXT, recria com o
-- cast certo.
DROP POLICY IF EXISTS "clients_delete_own_support_messages" ON public.support_messages;
CREATE POLICY "clients_delete_own_support_messages"
  ON public.support_messages FOR DELETE
  USING (user_id = auth.uid() AND sender_id = auth.uid()::text);

-- --- 2) Limite de volume: no máximo 15 mensagens em 10s por remetente,   ---
-- --- na mesma conversa (lead ou thread de suporte)                      ---

CREATE OR REPLACE FUNCTION public.enforce_messages_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND lead_id = NEW.lead_id
    AND created_at > NOW() - INTERVAL '10 seconds';

  IF recent_count >= 15 THEN
    RAISE EXCEPTION 'Muitas mensagens em pouco tempo nesta conversa — aguarde um instante.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
CREATE TRIGGER messages_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_messages_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_support_messages_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.support_messages
  WHERE sender_id = NEW.sender_id
    AND user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 seconds';

  IF recent_count >= 15 THEN
    RAISE EXCEPTION 'Muitas mensagens em pouco tempo nesta conversa — aguarde um instante.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_messages_rate_limit ON public.support_messages;
CREATE TRIGGER support_messages_rate_limit
  BEFORE INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_support_messages_rate_limit();

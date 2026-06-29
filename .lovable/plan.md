## Plano de entrega

Vou dividir em 4 entregas, na ordem abaixo. Posso fazer todas em sequência neste turno se você confirmar.

### 1. Tooltip branco no gráfico (rápido)

- Em `src/routes/index.tsx`, ajustar `contentStyle` do Recharts: texto branco (`color: "#fff"`), `itemStyle` e `labelStyle` brancos. Corrigir também `fontColor` (não existe — o correto é `color`).

### 2. Tela de Perfil + modo claro/escuro

- Nova rota `src/routes/profile.tsx` com: avatar, nome, e-mail, telefone WhatsApp, status de conexões (Google / WhatsApp).
- Adicionar item "Perfil" na `AppSidebar`.
- Provider de tema (`next-themes`) em `__root.tsx` com classe `dark` no `<html>`.
- Adicionar tokens de tema claro em `src/styles.css` (`:root` vira escuro como já é? não — refatorar: `:root` = claro, `.dark` = escuro atual).
- Switch claro/escuro/sistema no Perfil e atalho na topbar.

### 3. Login com Google (Lovable Cloud)

- Habilitar Lovable Cloud.
- Configurar provider Google via `supabase--configure_social_auth`.
- Criar rota pública `/auth` com botão "Entrar com Google" via `lovable.auth.signInWithOAuth("google", ...)`.
- Criar layout `_authenticated/route.tsx` (gerenciado) e mover `/`, `/leads`, `/settings`, `/profile` para dentro de `_authenticated/`.
- Listener `onAuthStateChange` no `__root.tsx`.
- Tabela `profiles` com trigger de auto-criação e RLS (precisa do nome/avatar do Google).

### 4. Integração WhatsApp (Twilio)

- Conectar connector Twilio.
- Server function `sendWhatsAppMessage` chamando o gateway: `POST /Messages.json` com `To: whatsapp:+E164`, `From: whatsapp:+TWILIO_NUMBER`, `Body`.
- Rota pública webhook `src/routes/api/public/whatsapp-webhook.ts` validando assinatura Twilio (`X-Twilio-Signature`) — recebe mensagens de leads e grava em tabela `messages`.
- Tabelas `whatsapp_accounts` (número Twilio por usuário) e `messages` (lead_id, direction, body, ts) com RLS.
- No Perfil, campo "Número WhatsApp Twilio" + botão de teste de envio.

### Detalhes técnicos

- Tema: usar `next-themes` (já é padrão shadcn). Refatorar `styles.css` para ter ambos os modos sem mudar a cor primária verde.
- Auth: padrão Lovable Supabase — `_authenticated/` com `ssr:false` gerenciado, broker Lovable para Google, `attachSupabaseAuth` em `start.ts`.
- Webhook do Twilio precisa ser configurado no console Twilio apontando para `https://project--00550cd3-d33b-4d04-8baf-2c04426e157e.lovable.app/api/public/whatsapp-webhook` — vou te passar a URL final.
- Secret `TWILIO_WHATSAPP_FROM` (número remetente formato `whatsapp:+5511...`) será solicitada após habilitar o connector.

Confirma que posso seguir com tudo? Se quiser, posso fazer só **1 e 2** agora e deixar **3 e 4** para o próximo turno (são mudanças maiores que afetam toda a navegação).

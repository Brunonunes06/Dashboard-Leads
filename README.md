# Dashboard-Leads (Digmans)

CRM de leads com chat em tempo real, planos pagos (Mercado Pago), cobrança e
chatbot automáticos por WhatsApp/Instagram (Meta Cloud API + IA).

## Requisitos

- Node.js 20+
- Conta Supabase (Postgres + Auth + Realtime)
- Conta Google Cloud (OAuth) e reCAPTCHA v3
- Conta Mercado Pago (pagamentos)
- Conta OpenAI (IA das respostas automáticas)
- App no Meta for Developers com WhatsApp Business Platform (+ Instagram Messaging, opcional)

## Instalação

```bash
npm install
```

Isso instala todos os pacotes do `package.json` — não precisa instalar nada manualmente. Os principais:

| Pacote | Uso |
| --- | --- |
| `@tanstack/react-start`, `@tanstack/react-router` | Framework do app (SSR + rotas + server functions) |
| `react`, `react-dom` | UI |
| `@supabase/supabase-js` | Banco de dados, autenticação e realtime |
| `express`, `cors` | Backend separado (`backend/server.js`) — webhooks, cron, páginas estáticas legadas |
| `openai` | Geração de resposta do chatbot |
| `@react-oauth/google` | Login com Google |
| `resend` | Envio de e-mail |
| `recharts` | Gráficos do dashboard |
| `zod` | Validação de entrada nas server functions |
| `tailwindcss` + `class-variance-authority` + `tailwind-merge` | Estilos |
| `radix-ui/*` (via componentes em `src/components/ui`) | Primitivas de UI acessíveis |

## Como rodar

São **dois processos separados**, em dois terminais:

```bash
npm run dev          # frontend (Vite + TanStack Start), porta 3001
```

```bash
node backend/server.js   # backend Express (webhooks, cron de cobrança, páginas legadas), porta 3000
```

O backend precisa estar rodando pra: cobrança automática por WhatsApp, webhook do Mercado Pago, webhook do chatbot (WhatsApp/Instagram) e o limitador de "1 conta por IP" funcionarem. **Reinicie os dois sempre que mudar o `.env`** — nenhum dos dois recarrega variáveis de ambiente sozinho.

## Configuração (`.env`)

Copie os valores reais no seu `.env` (nunca commitado — está no `.gitignore`). Abaixo, o que cada grupo faz e onde conseguir:

### Google (login)
`VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — [Google Cloud Console → APIs e serviços → Credenciais](https://console.cloud.google.com/apis/credentials).

### Firebase
`VITE_FIREBASE_*` — Configurações do projeto no [Firebase Console](https://console.firebase.google.com).

### Supabase
`VITE_SUPABASE_URL` / `SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API no seu projeto Supabase. **A Service Role Key nunca deve ir pro navegador.**

### OpenAI
`OPENAI_API_KEY` — [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### reCAPTCHA v3
`VITE_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` — [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin), tipo **v3** (não Enterprise).

### Mercado Pago
`MERCADO_PAGO_ACCESS_TOKEN`, `VITE_MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_WEBHOOK_SECRET` — Painel do Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção. Use `TEST-...` pra testar sem cobrar de verdade, `APP_USR-...` pra produção.

### WhatsApp / Instagram / Chatbot (Meta Cloud API)
`META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_TEMPLATE_NAMES`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_INSTAGRAM_ACCESS_TOKEN`, `META_INSTAGRAM_ACCOUNT_ID` — [Meta for Developers](https://developers.facebook.com/apps), produtos WhatsApp Business Platform + Instagram Messaging. Ver comentários no próprio `.env` pra onde achar cada um.

### Outros
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — [resend.com](https://resend.com).
- `CORS_ORIGIN` — domínio(s) permitido(s) a chamar o backend, separados por vírgula.
- `IP_ACCOUNT_GUARD_EXEMPT_IPS` — IPs liberados do limite de 1 conta por IP.
- `APP_BASE_URL` — URL pública do app (usada nos links das mensagens de cobrança).
- `PORT` — porta do backend Express (padrão 3000).

## Banco de dados (Supabase)

Rode as migrations em `supabase/*.sql`, **em ordem numérica**, no SQL Editor do
Supabase. Cada arquivo é idempotente (pode rodar de novo sem quebrar nada).

## Scripts disponíveis

```bash
npm run dev        # servidor de desenvolvimento (frontend)
npm run build      # build de produção
npm run server     # atalho pro backend Express (equivalente a node backend/server.js)
npm run lint        # ESLint
npm run format      # Prettier
```

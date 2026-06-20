# 🚀 Guia Passo a Passo — CRM SaaS com Controle de Acesso + Cobrança

## Visão Geral do Sistema

```
Usuário faz login
       │
       ▼
  É admin email?  ──YES──▶  Acesso TOTAL (todas as páginas)
       │
      NO
       │
       ▼
  Tem billing ativo? ──NO──▶  Tela de Cobrança (cartão)
       │
      YES
       │
       ▼
  Acesso PARCIAL (Dashboard + Conversas + Perfil)
```

---

## PASSO 1 — Definir os 3 Emails com Acesso Total

**Arquivo:** `src/config/permissions.ts`

```ts
export const ADMIN_EMAILS: string[] = [
  "seuemail@dominio.com",    // ← troque pelo seu email
  "segundo@dominio.com",     // ← segundo email autorizado
  "terceiro@dominio.com",    // ← terceiro email autorizado
];
```

✅ Pronto. Apenas esses 3 emails terão acesso às páginas de Leads, Relatórios, etc.

---

## PASSO 2 — Instalar dependências

```bash
# Frontend (cartão de crédito)
bun add @stripe/stripe-js @stripe/react-stripe-js

# Backend (servidor)
bun add stripe
```

---

## PASSO 3 — Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Stripe — crie sua conta em stripe.com
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica
STRIPE_PRICE_ID=price_id_do_seu_plano

# Supabase (se usar)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

---

## PASSO 4 — Adicionar rotas de billing ao server.js

Abra seu `server.js` e cole o conteúdo de `src/server-billing-routes.js`
**antes** da linha `app.listen(PORT, ...)`.

Adicione também no topo:
```js
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
```

---

## PASSO 5 — Integrar o RouteGuard ao seu TanStack Router

No seu arquivo de rotas (ex: `src/routes/__root.tsx`):

```tsx
import { RouteGuard } from "@/components/auth/RouteGuard";

// Rota pública para todos os logados:
<Route path="/conversas" element={
  <RouteGuard>
    <ConversasPage />
  </RouteGuard>
} />

// Rota exclusiva para admins:
<Route path="/leads" element={
  <RouteGuard adminOnly>
    <LeadsPage />
  </RouteGuard>
} />
```

---

## PASSO 6 — Integrar ao seu sistema de login existente

Se você usa **Google OAuth** (você já tem `@react-oauth/google`):

```tsx
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/hooks/useAuth";

function LoginButton() {
  const { login } = useAuth();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Busca dados do usuário
      const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const profile = await res.json();

      // Verifica billing no servidor
      const billingRes = await fetch(`/api/billing/verify/${profile.id}`);
      const { valid } = await billingRes.json();

      login({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        billingActive: valid,
      });
    },
  });

  return (
    <button onClick={() => googleLogin()}>
      Entrar com Google
    </button>
  );
}
```

---

## PASSO 7 — Ativar Stripe real (remover os mocks)

### No Frontend (`BillingForm.tsx`):
1. Descomente as importações do Stripe no topo do arquivo
2. Remova o bloco `// MOCK para demonstração`
3. Descomente o bloco `// INTEGRAÇÃO STRIPE REAL`

### No Backend (`server.js`):
1. Descomente os blocos marcados com `─── INTEGRAÇÃO STRIPE REAL ───`
2. Remova os blocos `// MOCK para desenvolvimento`

---

## Estrutura de Arquivos Gerados

```
src/
├── config/
│   └── permissions.ts          ← PASSO 1: Lista de emails admin
├── hooks/
│   └── useAuth.ts              ← PASSO 2: Hook de autenticação
├── components/
│   ├── auth/
│   │   └── RouteGuard.tsx      ← PASSO 3: Guarda de rotas
│   └── billing/
│       └── BillingForm.tsx     ← PASSO 4: Formulário de cartão
├── pages/
│   └── ConversasPage.tsx       ← PASSO 5: Chat admin↔cliente
├── AppRouter.tsx               ← PASSO 6: Lógica de navegação
└── server-billing-routes.js    ← PASSO 7: Cole no server.js
```

---

## Regras de Acesso Resumidas

| Página         | Email Admin | Cliente c/ Billing | Cliente s/ Billing |
|----------------|-------------|--------------------|--------------------|
| Dashboard      | ✅          | ✅                 | ❌ → Cobrança      |
| Conversas      | ✅          | ✅                 | ❌ → Cobrança      |
| Perfil         | ✅          | ✅                 | ❌ → Cobrança      |
| Leads          | ✅          | ❌ → Bloqueado     | ❌ → Cobrança      |
| Relatórios     | ✅          | ❌ → Bloqueado     | ❌ → Cobrança      |
| Configurações  | ✅          | ❌ → Bloqueado     | ❌ → Cobrança      |

---

## Fluxo de Cobrança

```
1. Cliente loga com Google
2. Sistema verifica /api/billing/verify/:userId
3. Se não tem billing → mostra BillingForm.tsx
4. Cliente preenche cartão → Stripe cria PaymentMethod
5. Frontend envia paymentMethodId para /api/billing/subscribe
6. Servidor cria Customer + Subscription no Stripe
7. Salva token da subscription no banco
8. Frontend recebe token → atualiza estado → libera acesso
```

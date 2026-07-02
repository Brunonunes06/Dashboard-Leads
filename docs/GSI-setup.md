# Guia rápido: registrar origem e configurar Google Identity (GSI)

Este guia mostra passos mínimos para corrigir erros como "The given origin is not allowed for the given client ID" e mensagens de bloqueio de autorização.

1) Acessar o Console do Google Cloud

- Abra: https://console.cloud.google.com/apis/credentials
- Selecione o projeto associado ao `Client ID` usado no app.

2) Verificar o OAuth 2.0 Client ID

- Na lista de credenciais, clique no Client ID (ex.: web client) exibido por `data-client_id` no HTML.
- Em **Authorized JavaScript origins** adicione as origens usadas em desenvolvimento/testes, por exemplo:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `http://localhost:5173` (vite)
  - `https://<seu-subdominio>.ngrok.io` (se usar ngrok)

- Não inclua paths — somente scheme + host + optional :port.

3) Tela de consentimento OAuth (OAuth Consent Screen)

- No menu lateral clique em **OAuth consent screen**.
- Preencha o nome do app, e-mail de suporte e links (Home / Privacy / Terms).
- Se o app estiver em desenvolvimento, mantenha o app em **Testing** e adicione seus e-mails em **Test users**.
- Se precisar de scopes sensíveis/restritos, submeta o app para verificação (pode levar alguns dias).

4) Scopes e segurança

- Para frontends, prefira o fluxo recomendado pelo Google: GSI (popup) ou Authorization Code Flow com PKCE para trocas seguras no servidor.
- Evite transmitir tokens em URLs; trate o token JWT com segurança no backend quando necessário.
- Consulte: https://developers.google.com/identity/protocols/oauth2/policies#secure-response-handling

5) Teste local

- Depois de adicionar `http://localhost:3000` (ou porta usada), limpe o cache do navegador e recarregue a página.
- Use o modo de teste (Test users) para evitar a validação pública enquanto desenvolve.

6) Notas adicionais

- Se o erro for "You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy", verifique a tela de consentimento, privacy policy e se você está usando scopes sensíveis sem verificar o app.
- Para produção, garanta que o domínio esteja verificado no Search Console/Cloud e que a política de privacidade esteja pública.

Se quiser, eu posso:
- gerar um checklist/update automático no projeto para lembrar as origens (ex.: `.env.example`),
- ou adicionar um script para detectar erros GSI no console e sugerir ações (mais intrusivo).

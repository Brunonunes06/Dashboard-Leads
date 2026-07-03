# Comandos de Desenvolvedor (DEV)

Este arquivo descreve os comandos e utilitários de desenvolvimento disponíveis na interface cliente. Todos os comandos afetam apenas o `localStorage` e a UI local — nenhum comando grava no backend.

**Local:** `src/routes/assets/common.js`

## Acesso
- Apenas usuários configurados como admin (lista `ADMIN_EMAILS` em `common.js`) têm acesso ao console overlay (F2) e aos comandos expostos globalmente.
- O overlay também pode ser aberto pressionando `F2` quando estiver logado como admin.

## Comandos disponíveis
- `Pagar(plan)`
  - Simula um pagamento local para o usuário logado.
  - Parâmetros: `"Semanal"`, `"Mensal"`, `"Anual"` (case-insensitive).
  - O comando grava em `localStorage` na chave `crm_user_profile:<email>` os campos: `billingPlan`, `billingPaidAt`, `tags` e `devSimulation: true`.
  - Uso no console (admin):
    - `Pagar('Mensal')`
  - Uso no overlay dev: digite `Pagar('Mensal')` e pressione Enter.

- `ListDevCommands()`
  - Lista os comandos dev disponíveis no console (exibe tabela no console).
  - Uso: `ListDevCommands()`

- `ResetDevPayment()`
  - Remove a simulação de pagamento do perfil persistido do usuário logado (remove `billingPlan`, `billingPaidAt`, `devSimulation` e tags de `Plano:`).
  - Uso: `ResetDevPayment()`

- `window.devTestData` helpers (visuais, por página)
  - `devTestData.zero()` — zera valores visuais (métricas e charts) apenas localmente.
  - `devTestData.restore()` — restaura snapshot visual salvo.
  - `devTestData.setMetric(index, value)` — altera um card de métrica específico.
  - `devTestData.setMetrics([...])` — altera múltiplos cards de métricas.
  - `devTestData.setChart(id, datasets)` — altera datasets de um chart.
  - `devTestData.setChartData(id, datasetIndex, values)` — altera um dataset específico.

## Console overlay (F2)
- Atalho: `F2` (abre o overlay apenas para admins).
- Input aceito: `Comando(arg1, arg2)`; argumentos podem usar aspas simples ou duplas (são convertidos para JSON internamente).
- Exemplos no overlay:
  - `Pagar('Semanal')`
  - `ListDevCommands()`

## Segurança e limitações
- Comandos são intencionalmente client-side e não fazem requisições ao backend.
- Para tornar um usuário admin, adicione o e-mail à constante `ADMIN_EMAILS` em `src/routes/assets/common.js`.
- Se preferir alternar o modo dev via flag (ex.: `localStorage.setItem('dev_mode','1')`), posso ajustar o código para usar essa condição em vez da lista de e-mails.

## Onde olhar no código
- Injeção do sidebar, verificação admin e listas: `src/routes/assets/common.js` (topo do arquivo).
- Registro e overlay dev: bloco `Developer console & commands (F2 to toggle)` dentro do mesmo arquivo.
- Perfil e renderização de tags/pills: `profile.html` e `common.js` (`syncUserProfile` e `loadPersistedUserProfile`).

---
Caso queira, eu:
- Faço o ajuste para usar `localStorage.dev_mode = '1'` em vez de `ADMIN_EMAILS`.
- Gero testes rápidos para verificar o fluxo (ex.: script que cria um `crm_user_profile:<email>` de exemplo).

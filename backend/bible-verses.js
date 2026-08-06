// Mensagens de cobrança + versículo, uma combinação diferente por dia da
// semana (índice igual ao Date.getDay(): 0=domingo ... 6=sábado). Isso é um
// RASCUNHO — ajuste o texto/versículo à vontade, a estrutura só depende de
// cada entrada ter { label, verseRef, verseText, reminder(name) }.
const WEEKDAY_MESSAGES = [
  {
    // domingo
    label: "domingo",
    verseRef: "Salmos 118:24",
    verseText: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.",
    reminder: (name) =>
      `Bom domingo, ${name}! Antes da semana começar, só um lembrete: seu pagamento ainda está pendente.`,
  },
  {
    // segunda
    label: "segunda-feira",
    verseRef: "Provérbios 16:3",
    verseText: "Entrega ao Senhor tudo o que fazes, e os teus planos serão bem-sucedidos.",
    reminder: (name) =>
      `Bom início de semana, ${name}! Que tal começar resolvendo o pagamento pendente do seu plano?`,
  },
  {
    // terça
    label: "terça-feira",
    verseRef: "Filipenses 4:19",
    verseText: "O meu Deus suprirá todas as necessidades de vocês, segundo a sua riqueza gloriosa em Cristo Jesus.",
    reminder: (name) =>
      `Oi, ${name}! Passando pra lembrar que o pagamento do seu plano ainda não foi confirmado.`,
  },
  {
    // quarta
    label: "quarta-feira",
    verseRef: "Salmos 37:5",
    verseText: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.",
    reminder: (name) =>
      `Olá, ${name}! Já estamos na metade da semana e seu pagamento continua pendente — vamos resolver?`,
  },
  {
    // quinta
    label: "quinta-feira",
    verseRef: "Mateus 6:33",
    verseText: "Buscai primeiro o Reino de Deus, e a sua justiça, e todas essas coisas vos serão acrescentadas.",
    reminder: (name) =>
      `Oi, ${name}! Lembrete rápido: falta confirmar o pagamento do seu plano pra continuar com acesso total.`,
  },
  {
    // sexta
    label: "sexta-feira",
    verseRef: "Josué 1:9",
    verseText:
      "Não te mandei eu? Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo por onde quer que andares.",
    reminder: (name) =>
      `Boa sexta, ${name}! Aproveita pra fechar o pagamento pendente antes do fim de semana.`,
  },
  {
    // sábado
    label: "sábado",
    verseRef: "Salmos 23:1",
    verseText: "O Senhor é o meu pastor, nada me faltará.",
    reminder: (name) => `Oi, ${name}! Passando o fim de semana pra lembrar do pagamento pendente do seu plano.`,
  },
];

const PLAN_LABELS = { mensal: "Mensal", anual: "Anual" };

function firstNameOf(name) {
  return String(name || "").trim().split(" ")[0] || "tudo bem";
}

// Texto livre — dentro da janela de 24h após a pessoa mandar mensagem pro
// número, dá pra mandar assim direto. Fora da janela (cobrança iniciada pela
// empresa, o caso normal aqui), a Meta WhatsApp Cloud API exige um Message
// Template aprovado — nesse caso usa buildTemplateComponents abaixo.
function buildReminderMessage(weekday, { name, plan, paymentLink }) {
  const day = WEEKDAY_MESSAGES[weekday];
  const planLabel = PLAN_LABELS[plan] || plan;

  return (
    `${day.reminder(firstNameOf(name))}\n\n` +
    `Plano ${planLabel} — finalize aqui: ${paymentLink}\n\n` +
    `"${day.verseText}" (${day.verseRef})`
  );
}

// Rascunho do corpo do template pra cadastrar no Meta Business Manager
// (WhatsApp Manager > Modelos de mensagem) na hora de criar o template
// daquele dia. {{1}}/{{2}}/{{3}} são as variáveis que a Meta preenche em
// runtime — precisam ficar na mesma ordem/posição que
// buildTemplateComponents usa.
function getTemplateBodyDraft(weekday) {
  const day = WEEKDAY_MESSAGES[weekday];
  return (
    `${day.reminder("{{1}}")}\n\n` +
    `Plano {{2}} — finalize aqui: {{3}}\n\n` +
    `"${day.verseText}" (${day.verseRef})`
  );
}

// "components" pro envio via Message Template da Meta WhatsApp Cloud API
// (POST /messages com type: "template"). Segue o formato que a API espera:
// um component "body" com os parâmetros na mesma ordem/posição usada em
// getTemplateBodyDraft (1=primeiro nome, 2=nome do plano, 3=link).
function buildTemplateComponents({ name, plan, paymentLink }) {
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: firstNameOf(name) },
        { type: "text", text: PLAN_LABELS[plan] || plan },
        { type: "text", text: paymentLink },
      ],
    },
  ];
}

// TEMPLATE_NAMES no .env: 7 nomes de template (um por dia, começando em
// domingo) separados por vírgula, na mesma ordem de WEEKDAY_MESSAGES — ex:
// "cobranca_domingo,cobranca_segunda,...". Cada nome só existe depois de
// criar e ter o template aprovado no WhatsApp Manager da Meta.
function getTemplateName(weekday) {
  const names = (process.env.META_WHATSAPP_TEMPLATE_NAMES || "").split(",").map((s) => s.trim());
  return names[weekday] || null;
}

module.exports = {
  WEEKDAY_MESSAGES,
  buildReminderMessage,
  getTemplateBodyDraft,
  buildTemplateComponents,
  getTemplateName,
};

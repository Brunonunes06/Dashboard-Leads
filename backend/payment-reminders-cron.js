// Cobrança diária por WhatsApp — todo dia, pra cada assinatura (mensal/anual)
// 'pending' ou 'expired', manda lembrete de pagamento + versículo do dia
// (backend/bible-verses.js). Não mexe em plano 'semanal' (grátis, sem cobrança)
// nem em assinaturas 'card_recurring' (renovam sozinhas via Mercado Pago,
// nunca "vencem" do jeito que a gente rastreia aqui).
const { getServiceClient } = require("./supabase-admin");
const { sendWhatsAppMessage, sendWhatsAppTemplate } = require("./meta-client");
const { buildReminderMessage, buildTemplateComponents, getTemplateName } = require("./bible-verses");

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function paymentLinkFor() {
  const base = process.env.APP_BASE_URL || (process.env.CORS_ORIGIN || "").split(",")[0] || "";
  return `${base.replace(/\/$/, "")}/plans`;
}

// Precisa bater com PLAN_FREQUENCY_MONTHS em src/routes/plans.tsx — usado só
// pra calcular até quando o plano comprado continua valendo.
const PLAN_FREQUENCY_MONTHS = { mensal: 1, anual: 12 };

// Vira 'expired' toda assinatura mensal/anual 'active' cujo período pago já
// passou. 'card_recurring' fica de fora de propósito — essa cobra sozinha
// via preapproval do Mercado Pago, nunca "vence" do jeito que rastreamos
// aqui (started_at + frequencyMonths). Depois de virar 'expired', a query
// principal de runPaymentReminders (mais abaixo) já pega essas linhas junto
// com as 'pending' e manda o mesmo lembrete por WhatsApp — reaproveita todo
// o resto do pipeline (dedup diário via payment_reminder_log, etc.) sem
// precisar de nada novo.
async function markExpiredPlans(supabase) {
  const { data: activeSubs, error } = await supabase
    .from("subscriptions")
    .select("id, plan, method, started_at")
    .eq("status", "active")
    .in("plan", ["mensal", "anual"])
    .neq("method", "card_recurring");

  if (error) {
    console.error("[Cobrança] Erro ao buscar planos ativos pra checar vencimento:", error.message);
    return;
  }
  if (!activeSubs?.length) return;

  const now = Date.now();
  for (const sub of activeSubs) {
    if (!sub.started_at) continue;

    const expiresAt = new Date(sub.started_at);
    expiresAt.setMonth(expiresAt.getMonth() + PLAN_FREQUENCY_MONTHS[sub.plan]);
    if (expiresAt.getTime() > now) continue;

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (updateError) {
      console.error(`[Cobrança] Erro ao marcar assinatura ${sub.id} como expirada:`, updateError.message);
    } else {
      console.log(`[Cobrança] Assinatura ${sub.id} (${sub.plan}) venceu — marcada como expirada.`);
    }
  }
}

// Prioriza Message Template (funciona fora da janela de 24h — o cenário
// normal aqui, já que é a empresa cobrando, não o usuário respondendo). Sem
// META_WHATSAPP_TEMPLATE_NAMES configurado pro dia, cai pra texto livre, que
// só entrega se a pessoa tiver mandado mensagem pro número nas últimas 24h.
function sendReminder({ weekday, phone, name, plan, paymentLink }) {
  const templateName = getTemplateName(weekday);
  return templateName
    ? sendWhatsAppTemplate(phone, templateName, buildTemplateComponents({ name, plan, paymentLink }))
    : sendWhatsAppMessage(phone, buildReminderMessage(weekday, { name, plan, paymentLink }));
}

async function runPaymentReminders() {
  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[Cobrança] SUPABASE_SERVICE_ROLE_KEY não configurada — job não executado.");
    return;
  }

  await markExpiredPlans(supabase);

  const weekday = new Date().getDay();
  const reminderDate = todayIsoDate();
  const paymentLink = paymentLinkFor();

  const { data: pendingSubs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan")
    .in("status", ["pending", "expired"])
    .in("plan", ["mensal", "anual"]);

  if (error) {
    console.error("[Cobrança] Erro ao buscar assinaturas pendentes:", error.message);
    return;
  }
  if (!pendingSubs?.length) return;

  for (const sub of pendingSubs) {
    // Um lembrete por assinatura por dia — unique index em
    // (subscription_id, reminder_date) faz o insert abaixo falhar se já rodou
    // hoje, então checar antes é só pra não gastar chamada de envio à toa.
    const { data: already } = await supabase
      .from("payment_reminder_log")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("reminder_date", reminderDate)
      .maybeSingle();
    if (already) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, name")
      .eq("user_id", sub.user_id)
      .maybeSingle();
    if (!profile?.phone) {
      console.warn(`[Cobrança] Usuário ${sub.user_id} sem telefone cadastrado, pulando.`);
      continue;
    }

    const result = await sendReminder({ weekday, phone: profile.phone, name: profile.name, plan: sub.plan, paymentLink });

    if (!result.ok) {
      console.error(`[Cobrança] Falha ao enviar WhatsApp pra assinatura ${sub.id}:`, result.error);
      continue;
    }

    const { error: logError } = await supabase.from("payment_reminder_log").insert({
      subscription_id: sub.id,
      user_id: sub.user_id,
      reminder_date: reminderDate,
      weekday,
    });
    if (logError) console.error("[Cobrança] Erro ao registrar envio:", logError.message);
  }
}

// Plano "teste" (src/routes/plans.tsx, 1 uso por conta) — ao contrário de
// mensal/anual, não espera o horário fixo diário: um checador dedicado roda
// a cada 5s, manda a mensagem assim que encontra e apaga a assinatura na
// hora (não faz sentido ela virar 'active' nem ficar pendurada — é só um
// gatilho de teste).
let testPlanCheckRunning = false;

async function runTestPlanCheck() {
  // Evita duas execuções sobrepostas — sem essa trava, a mesma assinatura de
  // teste podia ser pega por duas execuções antes da primeira apagar a
  // linha, mandando a mensagem em dobro (mais relevante ainda quando o envio
  // de verdade (Meta) tiver latência de rede real, ao contrário do stub
  // atual).
  if (testPlanCheckRunning) return;
  testPlanCheckRunning = true;

  try {
    await runTestPlanCheckOnce();
  } finally {
    testPlanCheckRunning = false;
  }
}

async function runTestPlanCheckOnce() {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: testSubs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "pending")
    .eq("plan", "teste");

  if (error) {
    console.error("[Teste] Erro ao buscar assinaturas de teste:", error.message);
    return;
  }
  if (!testSubs?.length) return;

  const weekday = new Date().getDay();
  const paymentLink = paymentLinkFor();

  for (const sub of testSubs) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, name, test_message_sent_at")
      .eq("user_id", sub.user_id)
      .maybeSingle();

    // Defesa em profundidade: a policy de RLS (supabase/013_test_plan.sql)
    // já bloqueia reuso via NOT EXISTS em test_message_sent_at, mas confere
    // de novo aqui antes de gastar um envio de WhatsApp de verdade, caso a
    // policy do banco algum dia volte a ficar desatualizada/mal aplicada.
    if (profile?.test_message_sent_at) {
      console.warn(`[Teste] Usuário ${sub.user_id} já usou o teste antes — ignorando (RLS deveria ter bloqueado isso).`);
    } else if (!profile?.phone) {
      console.warn(`[Teste] Usuário ${sub.user_id} sem telefone cadastrado, pulando.`);
    } else {
      const result = await sendReminder({ weekday, phone: profile.phone, name: profile.name, plan: "teste", paymentLink });
      if (!result.ok) {
        console.error(`[Teste] Falha ao enviar WhatsApp de teste:`, result.error);
      } else {
        console.log(`[Teste] Mensagem de teste enviada (assinatura ${sub.id}).`);
        const { error: markError } = await supabase
          .from("profiles")
          .update({ test_message_sent_at: new Date().toISOString() })
          .eq("user_id", sub.user_id);
        if (markError) console.error("[Teste] Erro ao marcar teste como usado:", markError.message);
      }
    }

    const { error: deleteError } = await supabase.from("subscriptions").delete().eq("id", sub.id);
    if (deleteError) console.error("[Teste] Erro ao apagar assinatura de teste:", deleteError.message);
  }
}

function scheduleTestPlanCheck() {
  setInterval(() => {
    runTestPlanCheck().catch((err) => console.error("[Teste] Erro no checador de plano teste:", err));
  }, 5_000 ).unref();
}

// Agenda o job pra rodar uma vez por dia num horário fixo (hora local do
// servidor). Sem dependência nova (node-cron) só pra isso — setTimeout até o
// próximo horário + setInterval de 24h já resolve.
function schedulePaymentReminders(hour = 9) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const msUntilNext = next.getTime() - now.getTime();
  console.log(`[Cobrança] Próximo envio de lembretes agendado para ${next.toLocaleString("pt-BR")}.`);

  setTimeout(() => {
    runPaymentReminders().catch((err) => console.error("[Cobrança] Erro no job de lembretes:", err));
    setInterval(
      () => {
        runPaymentReminders().catch((err) => console.error("[Cobrança] Erro no job de lembretes:", err));
      },
      24 * 60 * 60 * 1000,
    ).unref();
  }, msUntilNext).unref();
}

module.exports = { runPaymentReminders, schedulePaymentReminders, runTestPlanCheck, scheduleTestPlanCheck };

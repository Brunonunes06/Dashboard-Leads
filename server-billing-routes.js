// ============================================================
// PASSO 7: Adicione estas rotas ao seu server.js existente
// ============================================================
// Cole este código DENTRO do seu server.js, antes do app.listen()
// ============================================================

// ⚠️ Instale o Stripe no servidor:
// npm install stripe
// ou: bun add stripe

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Banco de tokens em memória (use seu banco real / Supabase aqui)
const dbTokens = {};

POST / api / billing / subscribe
// Recebe o paymentMethodId do frontend e cria a assinatura
app.post('/api/billing/subscribe', async (req, res) => {
  try {
    const { paymentMethodId, userId, email } = req.body;

    if (!paymentMethodId || !userId) {
      return res.status(400).json({ error: "paymentMethodId e userId são obrigatórios." });
    }

    // ─── INTEGRAÇÃO STRIPE REAL (descomente após configurar) ───
    // // 1. Criar ou buscar customer no Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email, metadata: { userId } });
    }
    //
    // // 2. Anexar o cartão ao customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    //
    // // 3. Criar a assinatura
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }], // ID do plano no Stripe
      expand: ['latest_invoice.payment_intent'],
    });
    //
    // // 4. Salvar token no banco
    const token = subscription.id;
    // ─────────────────────────────────────────────────────────

    // MOCK para desenvolvimento (remova em produção):
    const token = `sub_mock_${userId}_${Date.now()}`;

    dbTokens[userId] = {
      token,
      paymentMethodId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    console.log(`[Billing] Assinatura criada para userId: ${userId}`);
    return res.status(200).json({ success: true, token });

  } catch (error) {
    console.error("[Billing] Erro:", error);
    return res.status(500).json({ error: "Erro ao processar pagamento." });
  }
});

GET /api/billing/verify/:userId
// Verifica se o token do usuário ainda é válido
app.get('/api/billing/verify/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const record = dbTokens[userId];

    if (!record || !record.active) {
      return res.json({ valid: false });
    }

    // ─── VERIFICAÇÃO STRIPE REAL ───
    const subscription = await stripe.subscriptions.retrieve(record.token);
    const valid = subscription.status === 'active' || subscription.status === 'trialing';
    return res.json({ valid, status: subscription.status });
    // ──────────────────────────────

    return res.json({ valid: true, token: record.token });

  } catch (error) {
    console.error("[Billing] Erro na verificação:", error);
    return res.status(500).json({ error: "Erro ao verificar assinatura." });
  }
});

// POST /api/billing/cancel/:userId
app.post('/api/billing/cancel/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (dbTokens[userId]) {
      dbTokens[userId].active = false;
      // Stripe: await stripe.subscriptions.cancel(dbTokens[userId].token);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar assinatura." });
  }
});

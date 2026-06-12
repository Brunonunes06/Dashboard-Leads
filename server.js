const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const dbLeads = {};

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.get('/', (req, res) => {
  return res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background: #0f172a; color: #f8fafc; padding: 40px; min-height: 100vh;">
      <h1 style="color: #10B981;">🚀 Servidor de CRM Ativo!</h1>
      <p style="color: #94a3b8;">Pronto para receber dados.</p>
    </div>
  `);
});

app.get('/api/leads', (req, res) => {
  return res.json(Object.values(dbLeads));
});

app.post('/api/webhook', (req, res) => {
  try {
    const { id, status, ultimaMensagem } = req.body;

    if (!id) {
      return res.status(400).json({ error: "O campo 'id' é obrigatório." });
    }

    dbLeads[id] = {
      id: id,
      status: status || "Novo Lead",
      ultimaMensagem: ultimaMensagem || "Nenhum histórico registrado."
    };

    console.log(`[CRM] Lead processado - ID: ${id}`);
    return res.status(200).json({ success: true, message: "Lead processado com sucesso." });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});
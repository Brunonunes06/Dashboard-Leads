const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Token de verificação que você vai inventar (exemplo: 'meutoken123')
const VERIFY_TOKEN = "meutoken123"; 
const EMAIL_ADMINISTRADOR = "myhpc3301@gmail.com";

app.use(cors());
app.use(express.json());

// 1. ROTA GET: Exigida pela Meta para validar que seu webhook está ativo
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('--- WEBHOOK VERIFICADO COM SUCESSO PELA META! ---');
    return res.status(200).send(challenge);
  } else {
    return res.status(403).end();
  }
});

// 2. ROTA POST: Onde o WhatsApp vai enviar as mensagens e notificações reais
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  console.log(`\n--- Webhook Recebido às ${timestamp} ---`);
  // Mostra os dados da mensagem do WhatsApp no seu terminal
  console.log(JSON.stringify(req.body, null, 2)); 
  console.log(`----------------------------------------\n`);

  return res.status(200).end();
});

// Mantendo a sua rota antiga caso seu frontend ainda use para testes
app.post('/api/whatsapp/send', (req, res) => {
  const { message, number, userEmail } = req.body;
  if (userEmail && userEmail.toLowerCase() !== EMAIL_ADMINISTRADOR.toLowerCase()) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }
  console.log(`[API Local] Disparo manual para: ${number} -> ${message}`);
  return res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Webhook Local Ativo: http://localhost:${PORT}`);
  console.log(` Token de Verificação: ${VERIFY_TOKEN}`);
  console.log(`==================================================`);
});ngrok http 3000
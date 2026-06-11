const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = "meutoken123"; 
const EMAIL_ADMINISTRADOR = "myhpc3301@gmail.com";

app.use(cors());
app.use(express.json());

// Remove a tela de aviso do Ngrok para a Meta conseguir validar o link
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// 1. VALIDAÇÃO DO WEBHOOK (GET)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('--- WEBHOOK VALIDADO COM SUCESSO ---');
    return res.status(200).send(challenge);
  }
  return res.status(403).end();
});

// 2. RECEBIMENTO E AUTOMAÇÃO DE MENSAGENS (POST)
app.post('/', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messageObj = value?.messages?.[0];

    // Verifica se recebemos uma mensagem de texto válida do cliente
    if (messageObj && messageObj.type === 'text') {
      const clienteWhats = messageObj.from; // Número do cliente
      const textoRecebido = messageObj.text.body.trim().toLowerCase(); // Texto enviado
      const nomeCliente = value?.contacts?.[0]?.profile?.name || "Cliente";

      console.log(`[Mensagem Recebida] de ${nomeCliente} (${clienteWhats}): "${textoRecebido}"`);

      // 🤖 REGRAS DE AUTOMAÇÃO (O ROBÔ RESPONDE AQUI)
      let mensagemResposta = "";

      if (textoRecebido.includes('oi') || textoRecebido.includes('olá') || textoRecebido.includes('bom dia')) {
        mensagemResposta = `Olá, ${nomeCliente}! Bem-vindo ao nosso atendimento automatizado. \n\nDigite o número da opção desejada:\n1. Saber mais sobre o painel de leads\n2. Falar com suporte humano`;
      } else if (textoRecebido === '1') {
        mensagemResposta = "O nosso Painel de Leads monitora suas mensagens em tempo real e qualifica os clientes usando inteligência artificial!";
      } else if (textoRecebido === '2') {
        mensagemResposta = "Entendido! Um atendente humano foi notificado e entrará em contato em instantes.";
      } else {
        mensagemResposta = "Desculpe, não entendi. Digite 'Oi' para retornar ao menu principal.";
      }

      // Envia a resposta de volta ao WhatsApp do cliente
      await enviarMensagemOficial(clienteWhats, mensagemResposta);
    }

    return res.status(200).end();
  } catch (error) {
    console.error("Erro ao processar automação do webhook:", error);
    return res.status(200).end(); // Retorna 200 para a Meta não travar seu fluxo
  }
});

// 3. FUNÇÃO QUE DISPARA A MENSAGEM VIA API DA META
async function enviarMensagemOficial(numeroDestino, texto) {
  // Configurações extraídas do seu painel Meta para desenvolvedores
  const ACCESS_TOKEN = "SEU_ACCESS_TOKEN_PROVISORIO_OU_PERMANENTE_DA_META";
  const PHONE_NUMBER_ID = "SEU_PHONE_NUMBER_ID_DA_META"; 

  if (ACCESS_TOKEN.startsWith("SEU_")) {
    console.log(`[Simulação Automação] Respondendo número ${numeroDestino}: "${texto}"`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numeroDestino,
        type: "text",
        text: { preview_url: false, body: texto }
      })
    });

    const data = await response.json();
    console.log(`[Status Envio] Mensagem enviada para ${numeroDestino}. ID:`, data.messages?.[0]?.id);
  } catch (err) {
    console.error("Erro ao disparar mensagem pela API da Meta:", err);
  }
}

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Servidor de Automação Ativo na Porta: ${PORT}`);
  console.log(`==================================================`);
});
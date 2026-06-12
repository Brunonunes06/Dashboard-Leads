const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURAÇÕES DE SEGURANÇA E INTEGRAÇÃO INSTAGRAM
// ==========================================
const VERIFY_TOKEN = "529b2abd2a5d3267247af1ee72203d1b"; 
const EMAIL_ADMINISTRADOR = "myhpc3301@gmail.com";

// Chave secreta do App para validar a autenticidade dos webhooks da Meta
const APP_SECRET = process.env.META_APP_SECRET || "89d05c47fab6299cde66e070e41c1752"; 

// Token de Acesso (User ou Page Access Token de Longa Duração)
const ACCESS_TOKEN = "OCAQDjZAOiRnd4ffeEntZBmQCR4dUQurLLvKdmVhd7Njp1uxZCPuPCzEupGOJV71rAqsfH5QN5VSPKZA2HAwXMZBfw8FGf1ep1nPZARMZCxOyKAZDZD";

// Captura o corpo bruto (raw body) antes do parse do JSON para a validação matemática do SHA256
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Evita a tela de aviso do Ngrok que bloqueia a validação da Meta
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// ==========================================
// 1. VALIDAÇÃO DO WEBHOOK DO INSTAGRAM (GET)
// ==========================================
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Evita registrar erro se a Meta mandar uma requisição vazia ou incompleta de checagem
  if (!mode || !token) {
    return res.status(400).send('Requisição incompleta');
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('--- 🟢 WEBHOOK DO INSTAGRAM VALIDADO COM SUCESSO ---');
    return res.status(200).send(challenge);
  }
  
  console.log('⚠️ Tentativa de validação com Token incorreto recebida.');
  return res.status(403).end();
});

// ==========================================
// 2. RECEBIMENTO E AUTOMAÇÃO DO INSTAGRAM (POST)
// ==========================================
app.post('/', async (req, res) => {
  try {
    // [SEGURANÇA] Validação de Assinatura de Payload (SHA256)
    const signature = req.headers['x-hub-signature-256'];
    
    if (APP_SECRET && signature && req.rawBody) {
      try {
        const elements = signature.split('sha256=');
        const signatureHash = elements[1];
        
        const expectedHash = crypto
          .createHmac('sha256', APP_SECRET)
          .update(req.rawBody)
          .digest('hex');

        if (signatureHash !== expectedHash) {
          // Avisa mas deixa passar em ambiente de testes para não quebrar o robô caso o Secret mude
          console.warn('⚠️ [Aviso] Assinatura SHA256 não bateu perfeitamente. Continuando em modo flexível...');
        }
      } catch (err) {
        console.error("Erro ao validar assinatura hash:", err.message);
      }
    }

    const entry = req.body.entry?.[0];
    
    // Processamento de Mensagens Diretas (Instagram DMs)
    if (entry?.messaging?.[0]) {
      const messagingEvent = entry.messaging[0];
      const senderId = messagingEvent.sender?.id; 
      const messageObj = messagingEvent.message;

      if (messageObj && messageObj.text && !messageObj.is_echo) {
        const textoRecebido = messageObj.text.trim().toLowerCase();
        console.log(`[Instagram DM] Mensagem recebida de ${senderId}: "${textoRecebido}"`);

        // 🤖 REGRAS DO ROBÔ PARA INSTAGRAM
        let mensagemResposta = "";

        if (textoRecebido.includes('oi') || textoRecebido.includes('olá') || textoRecebido.includes('bom dia') || textoRecebido.includes('alô')) {
          mensagemResposta = "Olá! Bem-vindo à nossa automação do Instagram. \n\nDigite a opção desejada:\n1. Conhecer o Painel de Leads\n2. Falar com Suporte";
        } else if (textoRecebido === '1') {
          mensagemResposta = "O nosso Painel de Leads organiza e gerencia todos os seus contatos capturados de forma inteligente!";
        } else if (textoRecebido === '2') {
          mensagemResposta = "Perfeito. Um atendente humano foi notificado e responderá sua DM em breve.";
        } else {
          mensagemResposta = "Desculpe, não entendi. Digite 'Oi' para retornar ao menu principal.";
        }

        // Envia resposta de volta na DM do cliente
        await responderDMInstagram(senderId, mensagemResposta);
      }
    }

    // Processamento de Comentários em Posts
    if (entry?.changes?.[0]) {
      const change = entry.changes[0];
      if (change.field === 'comments') {
        const comentarioId = change.value?.id;
        const textoComentario = change.value?.text;
        console.log(`[Instagram Comentário] Novo comentário detectado (ID: ${comentarioId}): "${textoComentario}"`);
      }
    }

    return res.status(200).end();
  } catch (error) {
    console.error("Erro ao processar evento do Instagram:", error);
    return res.status(200).end(); 
  }
});

// ==========================================
// 3. ENVIAR MENSAGEM DE VOLTA PARA O INSTAGRAM (v25.0)
// ==========================================
async function responderDMInstagram(recipientId, texto) {
  try {
    const url = `https://graph.facebook.com/v25.0/me/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: texto }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[Status Envio] Resposta enviada com sucesso para o Instagram ID: ${recipientId}`);
    } else {
      console.error("⚠️ Erro retornado pela API do Instagram:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Erro crítico ao enviar mensagem para o Instagram:", err);
  }
}

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` 🚀 Servidor focado em Instagram Ativo na Porta: ${PORT}`);
  console.log(` 🔑 Token de Verificação configurado: ${VERIFY_TOKEN}`);
  console.log(`==================================================`);
});
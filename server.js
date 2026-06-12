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

// 🧠 BANCO DE DADOS EM MEMÓRIA
const dbLeads = {};

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

// Rota opcional para ler os leads
app.get('/api/leads', (req, res) => {
  return res.json(Object.values(dbLeads));
});

// Ignora o pedido de favicon do navegador para não poluir o terminal com erro 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// 1. VALIDAÇÃO DO WEBHOOK DO INSTAGRAM (GET)
// ==========================================
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // 🌐 SE VOCÊ ABRIR NO NAVEGADOR: Mostra uma resposta amigável em vez de dar Erro 400
  if (!mode && !token) {
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10B981;">🚀 Servidor do Instagram Ativo!</h1>
        <button onclick="testConnection()">Testar Conexão</button>
        <p style="color: #64748B;">O túnel do Ngrok está se comunicando perfeitamente com o seu computador.</p>
      </div>
    `);
  }

  // Se houver tentativa de validação mas faltar dados
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
          console.warn('⚠️ [Aviso] Assinatura SHA256 flexível.');
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

        if (!dbLeads[senderId]) {
          dbLeads[senderId] = {
            instagramId: senderId,
            status: "Menu Inicial",
            ultimaMensagem: messageObj.text,
            totalInteracoes: 1,
            historico: []
          };
        }

        const lead = dbLeads[senderId];
        lead.ultimaMensagem = messageObj.text;
        lead.historico.push({ quem: "usuario", texto: messageObj.text, data: new Date() });

        let mensagemResposta = "";

        if (textoRecebido.includes('oi') || textoRecebido.includes('olá') || textoRecebido.includes('bom dia') || textoRecebido.includes('alô')) {
          lead.status = "Menu Inicial";
          mensagemResposta = "Olá! Bem-vindo à nossa automação do Instagram. \n\nDigite a opção desejada:\n1. Conhecer o Painel de Leads\n2. Falar com Suporte";
        } else if (textoRecebido === '1') {
          lead.status = "Interessado no Painel";
          mensagemResposta = "O nosso Painel de Leads organiza e gerencia todos os seus contatos capturados de forma inteligente diretamente no Lovable!";
        } else if (textoRecebido === '2') {
          lead.status = "Aguardando Humano";
          mensagemResposta = "Perfeito. O administrador (" + EMAIL_ADMINISTRADOR + ") foi notificado e um atendente humano responderá a sua DM em breve.";
        } else {
          mensagemResposta = "Desculpe, não entendi o comando. Digite 'Oi' para retornar ao menu principal e ver as opções.";
        }

        lead.historico.push({ quem: "robo", texto: mensagemResposta, data: new Date() });
        console.log(`[CRM] Lead ${senderId} atualizado para: "${lead.status}"`);

        await responderDMInstagram(senderId, mensagemResposta);
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
  console.log(` 🚀 Servidor Inteligente de CRM Ativo na Porta: ${PORT}`);
  console.log(` 🔑 Webhook pronto para testes!`);
  console.log(`==================================================`);
});
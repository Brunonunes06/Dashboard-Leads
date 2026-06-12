export type LeadStatus = "novo" | "qualificando" | "qualificado" | "transferido" | "descartado";
export type MessageSender = "lead" | "ai" | "human";

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  property: string;
  status: LeadStatus;
  budget?: string;
  bedrooms?: string;
  region?: string;
  intent?: string;
  score: number;
  lastMessage: string;
  lastActivity: string;
  unread: number;
  responseTime: string;
  messages: Message[];
}

export const leads: Lead[] = [
  {
    id: "1",
    name: "Marina Albuquerque",
    phone: "+55 11 98123-4521",
    source: "Anúncio Instagram — Cobertura Vila Madalena",
    property: "Cobertura 3 quartos — Vila Madalena",
    status: "qualificado",
    budget: "R$ 2,5M – R$ 3M",
    bedrooms: "3",
    region: "Vila Madalena, Pinheiros",
    intent: "Mudança em 90 dias",
    score: 92,
    lastMessage: "Perfeito! Posso visitar sábado de manhã?",
    lastActivity: "agora",
    unread: 2,
    responseTime: "3s",
    messages: [
      { id: "m1", sender: "lead", text: "Oi, vi o anúncio da cobertura na Vila Madalena. Ainda está disponível?", time: "14:02" },
      { id: "m2", sender: "ai", text: "Olá Marina! 👋 Sim, a cobertura ainda está disponível. Posso te ajudar com algumas informações rápidas? Qual a faixa de orçamento que você considera?", time: "14:02" },
      { id: "m3", sender: "lead", text: "Estou olhando entre 2.5 e 3 milhões", time: "14:04" },
      { id: "m4", sender: "ai", text: "Ótimo, está dentro da faixa do imóvel. Você procura quantos quartos e tem alguma preferência de região?", time: "14:04" },
      { id: "m5", sender: "lead", text: "3 quartos, e quero ficar pela Vila Madalena ou Pinheiros mesmo", time: "14:06" },
      { id: "m6", sender: "ai", text: "Combinação perfeita! E qual seu prazo de mudança aproximado?", time: "14:06" },
      { id: "m7", sender: "lead", text: "Pretendo me mudar nos próximos 3 meses", time: "14:07" },
      { id: "m8", sender: "ai", text: "Excelente, Marina. Vou conectar você agora com o Rafael, especialista nesse imóvel. Ele pode agendar a visita ainda hoje. 👍", time: "14:07" },
      { id: "m9", sender: "human", text: "Oi Marina, aqui é o Rafael. Tenho disponibilidade sábado às 10h ou 11h. Qual horário fica melhor?", time: "14:09" },
      { id: "m10", sender: "lead", text: "Perfeito! Posso visitar sábado de manhã?", time: "14:11" },
      { id: "m11", sender: "lead", text: "Ótimo, vou agendar para sábado às 10h então. Vou te enviar a confirmação e o endereço certinho por aqui. Qualquer dúvida, é só me chamar!", time: "14:12" }

    ],
  },
  {
    id: "2",
    name: "Carlos Eduardo Tavares",
    phone: "+55 21 99876-1102",
    source: "Google Ads — Apto Botafogo",
    property: "Apartamento 2 quartos — Botafogo",
    status: "qualificando",
    budget: "R$ 800k – R$ 1M",
    bedrooms: "2",
    region: "Botafogo",
    score: 71,
    lastMessage: "Quais condomínios você tem disponíveis?",
    lastActivity: "2 min",
    unread: 1,
    responseTime: "4s",
    messages: [
      { id: "m1", sender: "lead", text: "Vi um apartamento no Botafogo, queria mais detalhes", time: "16:21" },
      { id: "m2", sender: "ai", text: "Olá Carlos! Posso te ajudar. Qual a faixa de investimento que você considera?", time: "16:21" },
      { id: "m3", sender: "lead", text: "Até 1 milhão", time: "16:23" },
      { id: "m4", sender: "ai", text: "Perfeito. Você busca quantos quartos?", time: "16:23" },
      { id: "m5", sender: "lead", text: "2 quartos", time: "16:24" },
      { id: "m6", sender: "ai", text: "Ótimo. E qual seu prazo de mudança?", time: "16:24" },
      { id: "m7", sender: "lead", text: "Quais condomínios você tem disponíveis?", time: "16:25" },
    ],
  },
  {
    id: "3",
    name: "Patrícia Oliveira",
    phone: "+55 31 98445-7700",
    source: "Site — Formulário Lançamento",
    property: "Lançamento Savassi — Studio",
    status: "novo",
    score: 48,
    lastMessage: "Quero saber mais sobre o lançamento",
    lastActivity: "5 min",
    unread: 1,
    responseTime: "2s",
    messages: [
      { id: "m1", sender: "lead", text: "Quero saber mais sobre o lançamento", time: "17:40" },
      { id: "m2", sender: "ai", text: "Olá Patrícia! Que bom seu interesse. 🏢 Para te enviar a melhor opção, posso fazer 3 perguntas rápidas? Qual a faixa de investimento que você considera?", time: "17:40" },
    ],
  },
  {
    id: "4",
    name: "Ricardo Menezes",
    phone: "+55 47 99221-3398",
    source: "Anúncio Facebook — Casa Beira-Mar",
    property: "Casa 4 quartos — Balneário Camboriú",
    status: "transferido",
    budget: "R$ 4M+",
    bedrooms: "4",
    region: "Balneário Camboriú",
    intent: "Investimento + veraneio",
    score: 88,
    lastMessage: "Já estou em contato com a Juliana, obrigado!",
    lastActivity: "1h",
    unread: 0,
    responseTime: "3s",
    messages: [
      { id: "m1", sender: "lead", text: "Boa tarde, vi a casa de Balneário", time: "13:10" },
      { id: "m2", sender: "ai", text: "Olá Ricardo! Vou te ajudar. Qual sua faixa de investimento?", time: "13:10" },
      { id: "m3", sender: "lead", text: "Acima de 4 milhões, sem problema", time: "13:12" },
      { id: "m4", sender: "ai", text: "Ótimo! É para moradia, veraneio ou investimento?", time: "13:12" },
      { id: "m5", sender: "lead", text: "Veraneio e investimento mesmo", time: "13:13" },
      { id: "m6", sender: "human", text: "Oi Ricardo, sou a Juliana, vou cuidar do seu atendimento. Posso te ligar agora?", time: "13:15" },
      { id: "m7", sender: "lead", text: "Já estou em contato com a Juliana, obrigado!", time: "13:18" },
    ],
  },
  {
    id: "5",
    name: "Felipe Andrade",
    phone: "+55 11 97002-3344",
    source: "Anúncio Instagram — Studio Centro",
    property: "Studio — Centro SP",
    status: "descartado",
    budget: "Sem orçamento definido",
    score: 18,
    lastMessage: "Tô só dando uma olhadinha por curiosidade mesmo",
    lastActivity: "3h",
    unread: 0,
    responseTime: "4s",
    messages: [
      { id: "m1", sender: "lead", text: "Vi um anúncio aí", time: "11:02" },
      { id: "m2", sender: "ai", text: "Oi Felipe! Posso te ajudar. Qual seu orçamento aproximado?", time: "11:02" },
      { id: "m3", sender: "lead", text: "Tô só dando uma olhadinha por curiosidade mesmo", time: "11:05" },
    ],
  },
  {
    id: "6",
    name: "Juliana Castro",
    phone: "+55 51 98800-2211",
    source: "Google Ads — Apto Moinhos",
    property: "Apartamento 3 quartos — Moinhos de Vento",
    status: "qualificado",
    budget: "R$ 1,8M",
    bedrooms: "3",
    region: "Moinhos de Vento, Bela Vista",
    intent: "Mudança em 60 dias",
    score: 85,
    lastMessage: "Pode me ligar amanhã às 10h?",
    lastActivity: "12 min",
    unread: 0,
    responseTime: "5s",
    messages: [
      { id: "m1", sender: "lead", text: "Olá, vi o anúncio do apto em Moinhos", time: "15:30" },
      { id: "m2", sender: "ai", text: "Oi Juliana! Posso te ajudar. Qual a faixa de investimento?", time: "15:30" },
      { id: "m3", sender: "lead", text: "Até 1.8 milhão", time: "15:32" },
      { id: "m4", sender: "ai", text: "3 quartos serve, ou prefere outra metragem?", time: "15:32" },
      { id: "m5", sender: "lead", text: "3 quartos perfeito", time: "15:33" },
      { id: "m6", sender: "ai", text: "Qual seu prazo de mudança?", time: "15:33" },
      { id: "m7", sender: "lead", text: "60 dias", time: "15:34" },
      { id: "m8", sender: "ai", text: "Ótimo! Vou conectar com a corretora especialista. Qual o melhor horário para um contato?", time: "15:34" },
      { id: "m9", sender: "lead", text: "Pode me ligar amanhã às 10h?", time: "15:36" },
    ],
  },
];

  export const weeklyData = [
  { day: "Seg", leads: 50, qualificados: 100 },
  { day: "Ter", leads: 24, qualificados: 11 },
  { day: "Qua", leads: 10, qualificados: 14 },
  { day: "Qui", leads: 27, qualificados: 12 },
  { day: "Sex", leads: 42, qualificados: 19 },
  { day: "Sáb", leads: 35, qualificados: 16 },
  { day: "Dom", leads: 22, qualificados: 9 },
];

export const sources = [
  { name: "Instagram Ads", value: 10, color: "oklch(0.74 0.17 155)", },
  { name: "Google Ads", value: 20, color: "oklch(0.65 0.18 200)" },
  { name: "Facebook Ads", value: 50, color: "oklch(0.78 0.16 75)" },
  { name: "Site/Orgânico", value: 80, color: "oklch(0.6 0.2 295)" },
];

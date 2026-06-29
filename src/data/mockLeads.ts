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
      {
        id: "m1",
        sender: "lead",
        text: "Oi, vi o anúncio da cobertura na Vila Madalena. Ainda está disponível?",
        time: "14:02",
      },
      {
        id: "m2",
        sender: "ai",
        text: "Olá Marina! 👋 Sim, a cobertura ainda está disponível. Posso te ajudar com algumas informações rápidas? Qual a faixa de orçamento que você considera?",
        time: "14:02",
      },
      { id: "m3", sender: "lead", text: "Estou olhando entre 2.5 e 3 milhões", time: "14:04" },
      {
        id: "m4",
        sender: "ai",
        text: "Ótimo, está dentro da faixa do imóvel. Você procura quantos quartos e tem alguma preferência de região?",
        time: "14:04",
      },
      {
        id: "m5",
        sender: "lead",
        text: "3 quartos, e quero ficar pela Vila Madalena ou Pinheiros mesmo",
        time: "14:06",
      },
      {
        id: "m6",
        sender: "ai",
        text: "Combinação perfeita! E qual seu prazo de mudança aproximado?",
        time: "14:06",
      },
      { id: "m7", sender: "lead", text: "Pretendo me mudar nos próximos 3 meses", time: "14:07" },
      {
        id: "m8",
        sender: "ai",
        text: "Excelente, Marina. Vou conectar você agora com o Rafael, especialista nesse imóvel. Ele pode agendar a visita ainda hoje. 👍",
        time: "14:07",
      },
      {
        id: "m9",
        sender: "human",
        text: "Oi Marina, aqui é o Rafael. Tenho disponibilidade sábado às 10h ou 11h. Qual horário fica melhor?",
        time: "14:09",
      },
      {
        id: "m10",
        sender: "lead",
        text: "Perfeito! Posso visitar sábado de manhã?",
        time: "14:11",
      },
      {
        id: "m11",
        sender: "lead",
        text: "Ótimo, vou agendar para sábado às 10h então. Vou te enviar a confirmação e o endereço certinho por aqui. Qualquer dúvida, é só me chamar!",
        time: "14:12",
      },
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
  { name: "Instagram Ads", value: 10, color: "oklch(0.74 0.17 155)" },
  { name: "Google Ads", value: 20, color: "oklch(0.65 0.18 200)" },
  { name: "Facebook Ads", value: 50, color: "oklch(0.78 0.16 75)" },
  { name: "Site/Orgânico", value: 80, color: "oklch(0.6 0.2 295)" },
];

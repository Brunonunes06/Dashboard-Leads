import { create } from "zustand";

export type IGStatus = "menu_inicial" | "interessado_painel" | "aguardando_suporte" | "finalizado";

export type IGSender = "lead" | "bot" | "human";

export interface IGMessage {
  id: string;
  sender: IGSender;
  text: string;
  time: string;
}

export interface IGLead {
  id: string;
  senderId: string; // Instagram user id / handle
  avatar: string;
  status: IGStatus;
  lastMessage: string;
  lastContact: string; // ISO
  unread: number;
  messages: IGMessage[];
}

export const STATUS_META: Record<IGStatus, { label: string; className: string; dot: string }> = {
  menu_inicial: {
    label: "Menu Inicial",
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    dot: "bg-slate-400",
  },
  interessado_painel: {
    label: "Interessado em Painel",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  aguardando_suporte: {
    label: "Aguardando Suporte Humano",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    dot: "bg-sky-400",
  },
};

function iso(hoursAgo: number) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

const seed: IGLead[] = [
  {
    id: "l1",
    senderId: "@mariana.costa",
    avatar: "MC",
    status: "interessado_painel",
    lastMessage: "Quero saber o preço do painel solar de 5kW",
    lastContact: iso(0.05),
    unread: 2,
    messages: [
      { id: "1", sender: "lead", text: "Oi! Vi o anúncio de vocês.", time: "14:02" },
      {
        id: "2",
        sender: "bot",
        text: "Olá Mariana! 👋 Eu sou o assistente Express. Como posso ajudar?\n\n1️⃣ Conhecer painéis solares\n2️⃣ Falar com um atendente",
        time: "14:02",
      },
      { id: "3", sender: "lead", text: "1", time: "14:03" },
      {
        id: "4",
        sender: "bot",
        text: "Ótima escolha! ☀️ Temos painéis de 3kW, 5kW e 10kW. Qual te interessa?",
        time: "14:03",
      },
      {
        id: "5",
        sender: "lead",
        text: "Quero saber o preço do painel solar de 5kW",
        time: "14:04",
      },
    ],
  },
  {
    id: "l2",
    senderId: "@joao_almeida",
    avatar: "JA",
    status: "aguardando_suporte",
    lastMessage: "Preciso falar com alguém da equipe técnica",
    lastContact: iso(0.5),
    unread: 1,
    messages: [
      {
        id: "1",
        sender: "lead",
        text: "Comprei um painel mês passado e tenho dúvidas",
        time: "10:11",
      },
      {
        id: "2",
        sender: "bot",
        text: "Olá João! Posso te ajudar.\n\n1️⃣ Conhecer painéis\n2️⃣ Falar com atendente",
        time: "10:11",
      },
      { id: "3", sender: "lead", text: "2", time: "10:12" },
      {
        id: "4",
        sender: "bot",
        text: "Perfeito! Vou transferir você para um especialista. Aguarde um instante. 🙏",
        time: "10:12",
      },
      {
        id: "5",
        sender: "lead",
        text: "Preciso falar com alguém da equipe técnica",
        time: "10:13",
      },
    ],
  },
  {
    id: "l3",
    senderId: "@luiza.fern",
    avatar: "LF",
    status: "menu_inicial",
    lastMessage: "oi",
    lastContact: iso(1),
    unread: 1,
    messages: [
      { id: "1", sender: "lead", text: "oi", time: "13:00" },
      {
        id: "2",
        sender: "bot",
        text: "Olá! 👋 Eu sou o assistente Express.\n\n1️⃣ Conhecer painéis solares\n2️⃣ Falar com um atendente",
        time: "13:00",
      },
    ],
  },
  {
    id: "l4",
    senderId: "@pedro.santos",
    avatar: "PS",
    status: "finalizado",
    lastMessage: "Obrigado, ficou tudo certo!",
    lastContact: iso(3),
    unread: 0,
    messages: [
      { id: "1", sender: "lead", text: "Quero comprar um painel", time: "09:00" },
      { id: "2", sender: "bot", text: "Olá! 1️⃣ Painéis 2️⃣ Atendente", time: "09:00" },
      { id: "3", sender: "lead", text: "1", time: "09:01" },
      { id: "4", sender: "bot", text: "Temos 3kW, 5kW e 10kW.", time: "09:01" },
      { id: "5", sender: "human", text: "Oi Pedro, sou o Rafael. Vou te ajudar!", time: "09:05" },
      { id: "6", sender: "lead", text: "Obrigado, ficou tudo certo!", time: "09:20" },
    ],
  },
  {
    id: "l5",
    senderId: "@bia.ribeiro",
    avatar: "BR",
    status: "interessado_painel",
    lastMessage: "Vocês instalam em SP?",
    lastContact: iso(2),
    unread: 0,
    messages: [
      { id: "1", sender: "lead", text: "Bom dia", time: "08:30" },
      { id: "2", sender: "bot", text: "Bom dia! 1️⃣ Painéis 2️⃣ Atendente", time: "08:30" },
      { id: "3", sender: "lead", text: "1", time: "08:31" },
      { id: "4", sender: "bot", text: "Ótimo! Qual potência te interessa?", time: "08:31" },
      { id: "5", sender: "lead", text: "Vocês instalam em SP?", time: "08:32" },
    ],
  },
  {
    id: "l6",
    senderId: "@thiago.dev",
    avatar: "TD",
    status: "menu_inicial",
    lastMessage: "Quero ver opções",
    lastContact: iso(5),
    unread: 0,
    messages: [
      { id: "1", sender: "lead", text: "Quero ver opções", time: "07:10" },
      { id: "2", sender: "bot", text: "Olá! 1️⃣ Painéis 2️⃣ Atendente", time: "07:10" },
    ],
  },
  {
    id: "l7",
    senderId: "@camila.arq",
    avatar: "CA",
    status: "aguardando_suporte",
    lastMessage: "Posso falar com um humano?",
    lastContact: iso(6),
    unread: 3,
    messages: [
      { id: "1", sender: "lead", text: "Posso falar com um humano?", time: "06:00" },
      { id: "2", sender: "bot", text: "Claro! Vou transferir. 🙏", time: "06:00" },
    ],
  },
];

// Weekly chart data (last 7 days)
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const weeklyFlow = days.map((d, i) => ({
  day: d,
  recebidas: 12 + Math.round(Math.sin(i) * 6 + i * 3),
  qualificados: 4 + Math.round(Math.cos(i) * 3 + i * 1.5),
}));

interface State {
  leads: IGLead[];
  sendHumanReply: (leadId: string, text: string) => void;
  markRead: (leadId: string) => void;
  setStatus: (leadId: string, status: IGStatus) => void;
}

export const useInstagramStore = create<State>((set) => ({
  leads: seed,
  sendHumanReply: (leadId, text) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              lastMessage: text,
              lastContact: new Date().toISOString(),
              messages: [
                ...l.messages,
                {
                  id: `m${Date.now()}`,
                  sender: "human",
                  text,
                  time: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            }
          : l,
      ),
    })),
  markRead: (leadId) =>
    set((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, unread: 0 } : l)) })),
  setStatus: (leadId, status) =>
    set((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, status } : l)) })),
}));

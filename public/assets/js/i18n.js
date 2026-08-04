// Porta fiel de src/lib/i18n.ts — dicionários copiados verbatim, sem
// dependência de React (useSyncExternalStore vira um Set simples de
// listeners + applyI18n() que percorre [data-i18n]).
(function () {
  const SUPPORTED_LOCALES = ["pt", "en", "es"];

  const pt = {
    "nav.platform": "Plataforma",
    "nav.dashboard": "Dashboard",
    "nav.chat": "Conversas WhatsApp",
    "nav.plans": "Planos",
    "nav.instagram": "CRM Instagram",
    "nav.settings": "Configurar IA",
    "nav.profile": "Perfil",

    "common.logout": "Sair",
    "common.viewDetails": "Ver detalhado",
    "common.loading": "Carregando…",
    "common.viewAll": "Ver tudo",
    "common.noLeadsYet": "Nenhum lead ainda.",
    "common.noLeadsFiltered": "Nenhum lead com esses filtros.",
    "common.selectConversation": "Selecione uma conversa",
    "common.noMessagesYet": "Nenhuma mensagem ainda.",
    "common.startConversation": "Inicie a conversa!",
    "common.online": "Online",
    "common.offline": "Offline",
    "common.typing": "digitando...",
    "common.activeConversation": "Conversação ativa",
    "common.of": "de",

    "greeting.morning": "Bom dia",
    "greeting.afternoon": "Boa tarde",
    "greeting.evening": "Boa noite",

    "dashboard.subtitlePrefix": "Sua central processou",
    "dashboard.subtitleSuffix": "nesta sessão.",
    "dashboard.chartTitle": "Leads x Qualificados · últimos 7 dias",
    "dashboard.sourcesTitle": "Origem dos leads",
    "dashboard.metric.leadsToday": "Leads hoje",
    "dashboard.metric.avgResponse": "Tempo médio de resposta",
    "dashboard.metric.qualRate": "Taxa de qualificação",
    "dashboard.metric.transferred": "Transferidos ao vendedor",
    "dashboard.activeLeads": "Leads ativos recebidos",
    "chart.leads": "Leads",
    "chart.qualified": "Qualificados",

    "lead.score": "Score de qualidade",
    "lead.lastActivity": "Última atividade",
    "lead.info": "Informações",
    "lead.phone": "Telefone",
    "lead.messages": "Mensagens",
    "lead.origin": "Origem",
    "lead.transfer": "Transferir",
    "lead.transferred": "Transferido",
    "lead.close": "Fechar",

    "chat.searchPlaceholder": "Buscar lead, telefone…",
    "chat.messagePlaceholder": "Mensagem...",
    "chat.filters.all": "Todos",
    "chat.filters.new": "Novos",
    "chat.filters.qualifying": "Qualificando",
    "chat.filters.qualified": "Qualificados",
    "chat.filters.transferred": "Transferidos",

    "plans.title": "Escolha seu plano",
    "plans.subtitle": "Comece com período grátis e mantenha sua operação de leads ativa.",
    "plans.paymentMethod": "Forma de pagamento",
    "plans.howToPay": "Como deseja pagar?",
    "plans.pix": "Pix",
    "plans.subscribe": "Assinar",
    "plans.generatingPix": "Gerando Pix…",
    "plans.scanQr": "Escaneie o QR Code pelo app do seu banco.",
    "plans.copyPixCode": "Copiar código Pix",
    "plans.pixUnavailable": "Pix indisponível no momento.",
    "plans.contactSupport": "Fale com o suporte pra finalizar sua assinatura por outro meio.",

    "cookies.message": "Usamos cookies essenciais e, com sua permissão, cookies de preferências (idioma e tema).",
    "cookies.learnMore": "Saiba mais",
    "cookies.decline": "Recusar",
    "cookies.accept": "Aceitar",
  };

  const en = {
    "nav.platform": "Platform",
    "nav.dashboard": "Dashboard",
    "nav.chat": "WhatsApp Conversations",
    "nav.plans": "Plans",
    "nav.instagram": "Instagram CRM",
    "nav.settings": "Configure AI",
    "nav.profile": "Profile",

    "common.logout": "Log out",
    "common.viewDetails": "View details",
    "common.loading": "Loading…",
    "common.viewAll": "View all",
    "common.noLeadsYet": "No leads yet.",
    "common.noLeadsFiltered": "No leads match these filters.",
    "common.selectConversation": "Select a conversation",
    "common.noMessagesYet": "No messages yet.",
    "common.startConversation": "Start the conversation!",
    "common.online": "Online",
    "common.offline": "Offline",
    "common.typing": "typing...",
    "common.activeConversation": "Active conversation",
    "common.of": "of",

    "greeting.morning": "Good morning",
    "greeting.afternoon": "Good afternoon",
    "greeting.evening": "Good evening",

    "dashboard.subtitlePrefix": "Your hub has processed",
    "dashboard.subtitleSuffix": "this session.",
    "dashboard.chartTitle": "Leads vs Qualified · last 7 days",
    "dashboard.sourcesTitle": "Lead sources",
    "dashboard.metric.leadsToday": "Leads today",
    "dashboard.metric.avgResponse": "Average response time",
    "dashboard.metric.qualRate": "Qualification rate",
    "dashboard.metric.transferred": "Transferred to sales rep",
    "dashboard.activeLeads": "Active leads received",
    "chart.leads": "Leads",
    "chart.qualified": "Qualified",

    "lead.score": "Quality score",
    "lead.lastActivity": "Last activity",
    "lead.info": "Information",
    "lead.phone": "Phone",
    "lead.messages": "Messages",
    "lead.origin": "Source",
    "lead.transfer": "Transfer",
    "lead.transferred": "Transferred",
    "lead.close": "Close",

    "chat.searchPlaceholder": "Search lead, phone…",
    "chat.messagePlaceholder": "Message...",
    "chat.filters.all": "All",
    "chat.filters.new": "New",
    "chat.filters.qualifying": "Qualifying",
    "chat.filters.qualified": "Qualified",
    "chat.filters.transferred": "Transferred",

    "plans.title": "Choose your plan",
    "plans.subtitle": "Start with a free trial and keep your lead pipeline running.",
    "plans.paymentMethod": "Payment method",
    "plans.howToPay": "How would you like to pay?",
    "plans.pix": "Pix",
    "plans.subscribe": "Subscribe",
    "plans.generatingPix": "Generating Pix…",
    "plans.scanQr": "Scan the QR code with your bank's app.",
    "plans.copyPixCode": "Copy Pix code",
    "plans.pixUnavailable": "Pix is unavailable right now.",
    "plans.contactSupport": "Contact support to complete your subscription another way.",

    "cookies.message": "We use essential cookies and, with your permission, preference cookies (language and theme).",
    "cookies.learnMore": "Learn more",
    "cookies.decline": "Decline",
    "cookies.accept": "Accept",
  };

  const es = {
    "nav.platform": "Plataforma",
    "nav.dashboard": "Dashboard",
    "nav.chat": "Conversaciones de WhatsApp",
    "nav.plans": "Planes",
    "nav.instagram": "CRM de Instagram",
    "nav.settings": "Configurar IA",
    "nav.profile": "Perfil",

    "common.logout": "Cerrar sesión",
    "common.viewDetails": "Ver detalles",
    "common.loading": "Cargando…",
    "common.viewAll": "Ver todo",
    "common.noLeadsYet": "Aún no hay leads.",
    "common.noLeadsFiltered": "Ningún lead con esos filtros.",
    "common.selectConversation": "Selecciona una conversación",
    "common.noMessagesYet": "Aún no hay mensajes.",
    "common.startConversation": "¡Inicia la conversación!",
    "common.online": "En línea",
    "common.offline": "Desconectado",
    "common.typing": "escribiendo...",
    "common.activeConversation": "Conversación activa",
    "common.of": "de",

    "greeting.morning": "Buenos días",
    "greeting.afternoon": "Buenas tardes",
    "greeting.evening": "Buenas noches",

    "dashboard.subtitlePrefix": "Tu central procesó",
    "dashboard.subtitleSuffix": "en esta sesión.",
    "dashboard.chartTitle": "Leads vs Calificados · últimos 7 días",
    "dashboard.sourcesTitle": "Origen de los leads",
    "dashboard.metric.leadsToday": "Leads hoy",
    "dashboard.metric.avgResponse": "Tiempo medio de respuesta",
    "dashboard.metric.qualRate": "Tasa de calificación",
    "dashboard.metric.transferred": "Transferidos al vendedor",
    "dashboard.activeLeads": "Leads activos recibidos",
    "chart.leads": "Leads",
    "chart.qualified": "Calificados",

    "lead.score": "Puntuación de calidad",
    "lead.lastActivity": "Última actividad",
    "lead.info": "Información",
    "lead.phone": "Teléfono",
    "lead.messages": "Mensajes",
    "lead.origin": "Origen",
    "lead.transfer": "Transferir",
    "lead.transferred": "Transferido",
    "lead.close": "Cerrar",

    "chat.searchPlaceholder": "Buscar lead, teléfono…",
    "chat.messagePlaceholder": "Mensaje...",
    "chat.filters.all": "Todos",
    "chat.filters.new": "Nuevos",
    "chat.filters.qualifying": "Calificando",
    "chat.filters.qualified": "Calificados",
    "chat.filters.transferred": "Transferidos",

    "plans.title": "Elige tu plan",
    "plans.subtitle": "Empieza con un período gratis y mantén tu operación de leads activa.",
    "plans.paymentMethod": "Método de pago",
    "plans.howToPay": "¿Cómo deseas pagar?",
    "plans.pix": "Pix",
    "plans.subscribe": "Suscribir",
    "plans.generatingPix": "Generando Pix…",
    "plans.scanQr": "Escanea el código QR con la app de tu banco.",
    "plans.copyPixCode": "Copiar código Pix",
    "plans.pixUnavailable": "Pix no está disponible en este momento.",
    "plans.contactSupport": "Contacta con soporte para completar tu suscripción de otra forma.",

    "cookies.message": "Usamos cookies esenciales y, con tu permiso, cookies de preferencias (idioma y tema).",
    "cookies.learnMore": "Saber más",
    "cookies.decline": "Rechazar",
    "cookies.accept": "Aceptar",
  };

  const dictionaries = { pt, en, es };

  function detectLocale() {
    const stored = localStorage.getItem("locale");
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;

    const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const raw of candidates) {
      const lang = raw.slice(0, 2).toLowerCase();
      if (SUPPORTED_LOCALES.includes(lang)) return lang;
    }
    return "pt";
  }

  let currentLocale = detectLocale();
  const listeners = new Set();

  function getLocale() {
    return currentLocale;
  }

  function translate(key, vars) {
    const template = dictionaries[currentLocale][key] ?? dictionaries.pt[key] ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template);
  }

  function applyI18n(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = translate(el.getAttribute("data-i18n"));
    });
    (root || document).querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", translate(el.getAttribute("data-i18n-placeholder")));
    });
  }

  function setLocale(locale) {
    if (currentLocale === locale || !SUPPORTED_LOCALES.includes(locale)) return;
    currentLocale = locale;
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
    applyI18n();
    listeners.forEach((l) => l());
  }

  function onLocaleChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  document.documentElement.lang = currentLocale;

  window.i18n = { t: translate, getLocale, setLocale, applyI18n, onLocaleChange, SUPPORTED_LOCALES };
})();

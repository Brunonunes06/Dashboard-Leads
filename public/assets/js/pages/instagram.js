// Porta de src/routes/instagram.tsx — dados 100% mock (igual à versão React
// atual, que já é assim de propósito, sem tabela real no Supabase).
(function () {
  const STATUS_META = {
    menu_inicial: { label: "Menu Inicial", color: "var(--muted-foreground)" },
    interessado_painel: { label: "Interessado em Painel", color: "var(--primary)" },
    aguardando_suporte: { label: "Aguardando Suporte Humano", color: "var(--chart-2)" },
    finalizado: { label: "Finalizado", color: "var(--chart-5)" },
  };

  let leads = [
    {
      id: "l1",
      senderId: "@mariana.costa",
      avatar: "MC",
      status: "interessado_painel",
      lastMessage: "Quero saber o preço do painel solar de 5kW",
      lastContactIso: "2026-07-16T13:58:00.000Z",
      unread: 2,
      messages: [
        { sender: "lead", text: "Oi! Vi o anúncio de vocês.", time: "14:02" },
        {
          sender: "bot",
          text: "Olá Mariana! 👋 Eu sou o assistente Express. Como posso ajudar?\n\n1️⃣ Conhecer painéis solares\n2️⃣ Falar com um atendente",
          time: "14:02",
        },
        { sender: "lead", text: "1", time: "14:03" },
        { sender: "bot", text: "Ótima escolha! ☀️ Temos painéis de 3kW, 5kW e 10kW. Qual te interessa?", time: "14:03" },
        { sender: "lead", text: "Quero saber o preço do painel solar de 5kW", time: "14:04" },
      ],
    },
  ];

  const WEEKLY_FLOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => ({
    day,
    recebidas: 12 + Math.round(Math.sin(i) * 6 + i * 3),
    qualificados: 4 + Math.round(Math.cos(i) * 3 + i * 1.5),
  }));

  const STATUS_FILTERS = [
    { value: "todos", label: "Todos os status" },
    { value: "menu_inicial", label: "Menu Inicial" },
    { value: "interessado_painel", label: "Interessado em Painel" },
    { value: "aguardando_suporte", label: "Aguardando Suporte Humano" },
    { value: "finalizado", label: "Finalizado" },
  ];

  let query = "";
  let statusFilter = "todos";
  let openId = null;
  let lineChart = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function relativeTime(iso) {
    const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diffSec < 60) return "agora";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    return `${Math.floor(diffSec / 86400)}d`;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function renderMetrics() {
    const waiting = leads.filter((l) => l.status === "aguardando_suporte").length;
    const finalized = leads.filter((l) => l.status === "finalizado").length;
    const rate = leads.length ? Math.round((finalized / leads.length) * 100) : 0;
    const metrics = [
      { icon: "users", label: "Total de Leads", value: leads.length, color: "var(--primary)" },
      { icon: "inbox", label: "Recebidos Hoje", value: leads.length, color: "var(--chart-2)" },
      { icon: "clock", label: "Aguardando Resposta", value: waiting, color: "var(--chart-3)" },
      { icon: "trending-up", label: "Taxa de Conversão", value: `${rate}%`, color: "var(--chart-5)" },
    ];
    document.getElementById("ig-metrics").innerHTML = metrics
      .map(
        (m) => `
      <div class="card">
        <div class="card-body metric-card">
          <div>
            <p class="text-muted" style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.04em">${m.label}</p>
            <p class="metric-value" style="margin-top:0.4rem">${m.value}</p>
          </div>
          <div class="metric-icon" style="width:2.25rem;height:2.25rem;color:${m.color}"><i data-lucide="${m.icon}" style="width:1rem;height:1rem"></i></div>
        </div>
      </div>
    `,
      )
      .join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function renderChart() {
    const ctx = document.getElementById("ig-chart").getContext("2d");
    const config = {
      type: "line",
      data: {
        labels: WEEKLY_FLOW.map((d) => d.day),
        datasets: [
          {
            label: "Recebidas",
            data: WEEKLY_FLOW.map((d) => d.recebidas),
            borderColor: cssVar("--chart-2"),
            backgroundColor: cssVar("--chart-2"),
            tension: 0.35,
            pointRadius: 3,
          },
          {
            label: "Qualificados",
            data: WEEKLY_FLOW.map((d) => d.qualificados),
            borderColor: cssVar("--primary"),
            backgroundColor: cssVar("--primary"),
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: cssVar("--muted-foreground") } },
          y: { ticks: { color: cssVar("--muted-foreground") }, grid: { color: cssVar("--border") } },
        },
        plugins: { legend: { labels: { color: cssVar("--muted-foreground"), boxWidth: 10, boxHeight: 10 } } },
      },
    };
    if (lineChart) {
      lineChart.data = config.data;
      lineChart.update();
    } else {
      lineChart = new Chart(ctx, config);
    }
  }

  function getFiltered() {
    const q = query.toLowerCase().trim();
    return leads
      .filter((l) => statusFilter === "todos" || l.status === statusFilter)
      .filter((l) => !q || l.senderId.toLowerCase().includes(q) || l.lastMessage.toLowerCase().includes(q) || l.messages.some((m) => m.text.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.lastContactIso) - new Date(a.lastContactIso));
  }

  function renderTable() {
    const filtered = getFiltered();
    document.getElementById("ig-count").textContent = `${filtered.length} de ${leads.length} leads`;

    const tbody = document.getElementById("ig-table-body");
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:2.5rem;text-align:center;font-size:0.875rem" class="text-muted">Nenhum lead encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((l) => {
        const meta = STATUS_META[l.status];
        return `
        <tr data-lead-id="${l.id}" style="cursor:pointer;border-bottom:1px solid var(--border)">
          <td style="padding:0.75rem 1.25rem">
            <div class="flex-row gap-2">
              <div class="avatar" style="width:2.25rem;height:2.25rem;font-size:0.7rem;background-image:linear-gradient(135deg, color-mix(in srgb, #ec4899 30%, transparent), color-mix(in srgb, #a855f7 30%, transparent))">${l.avatar}</div>
              <div>
                <div class="flex-row gap-2">
                  <span style="font-weight:500">${escapeHtml(l.senderId)}</span>
                  ${l.unread > 0 ? `<span class="badge" style="background:var(--primary);color:var(--primary-foreground);height:1rem;padding:0 0.4rem">${l.unread}</span>` : ""}
                </div>
                <span class="text-muted" style="font-size:0.7rem">Instagram Direct</span>
              </div>
            </div>
          </td>
          <td class="truncate" style="padding:0.75rem 1.25rem;max-width:26rem">${escapeHtml(l.lastMessage)}</td>
          <td style="padding:0.75rem 1.25rem">
            <span class="badge" style="text-transform:none;background:color-mix(in srgb, ${meta.color} 15%, transparent);color:${meta.color}">${meta.label}</span>
          </td>
          <td style="padding:0.75rem 1.25rem;text-align:right;font-size:0.7rem" class="text-muted">${relativeTime(l.lastContactIso)}</td>
        </tr>
      `;
      })
      .join("");

    tbody.querySelectorAll("tr[data-lead-id]").forEach((row) => {
      row.addEventListener("click", () => selectLead(row.getAttribute("data-lead-id")));
    });
  }

  function selectLead(id) {
    openId = id;
    leads = leads.map((l) => (l.id === id ? { ...l, unread: 0 } : l));
    renderTable();
    renderSheet();
  }

  function closeSheet() {
    openId = null;
    renderSheet();
  }

  function renderSheet() {
    const openLead = leads.find((l) => l.id === openId) || null;
    const sheet = document.getElementById("ig-sheet");
    sheet.hidden = !openLead;
    if (!openLead) return;

    document.getElementById("ig-sheet-avatar").textContent = openLead.avatar;
    document.getElementById("ig-sheet-title").textContent = openLead.senderId;

    document.getElementById("ig-sheet-messages").innerHTML = openLead.messages
      .map((m) => {
        const mine = m.sender !== "lead";
        const label = m.sender === "bot" ? "Express Bot" : m.sender === "human" ? "Você" : "Lead";
        return `
        <div style="display:flex;${mine ? "justify-content:flex-end" : ""}">
          <div style="max-width:85%;border:1px solid var(--border);border-radius:1rem;background:var(--card);padding:0.5rem 0.75rem;font-size:0.875rem">
            <div class="text-muted" style="margin-bottom:0.25rem;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.04em">${label}</div>
            <p style="white-space:pre-line;line-height:1.5;margin:0">${escapeHtml(m.text)}</p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function sendReply() {
    const input = document.getElementById("ig-reply-input");
    const text = input.value.trim();
    if (!text || !openId) return;
    leads = leads.map((l) =>
      l.id === openId
        ? {
            ...l,
            lastMessage: text,
            lastContactIso: new Date().toISOString(),
            messages: [...l.messages, { sender: "human", text, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }],
          }
        : l,
    );
    input.value = "";
    renderTable();
    renderSheet();
  }

  async function boot() {
    const user = await window.RouteGuard.requireAdmin();
    if (!user) return;

    renderMetrics();
    renderChart();
    renderTable();

    document.getElementById("ig-status-filter").innerHTML = STATUS_FILTERS.map((f) => `<option value="${f.value}">${f.label}</option>`).join("");

    document.getElementById("ig-search").addEventListener("input", (e) => {
      query = e.target.value;
      renderTable();
    });
    document.getElementById("ig-status-filter").addEventListener("change", (e) => {
      statusFilter = e.target.value;
      renderTable();
    });

    document.getElementById("ig-sheet-close").addEventListener("click", closeSheet);
    document.getElementById("ig-sheet-send").addEventListener("click", sendReply);
    document.getElementById("ig-reply-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendReply();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

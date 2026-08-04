// Porta de src/routes/index.tsx.
(function () {
  const DEMO_SOURCES = [
    { name: "Instagram Ads", value: 10, color: "var(--primary)" },
    { name: "Google Ads", value: 20, color: "var(--chart-2)" },
    { name: "Facebook Ads", value: 50, color: "var(--chart-3)" },
    { name: "Site/Orgânico", value: 80, color: "var(--chart-5)" },
  ];

  const DEMO_WEEKDAY_LABELS = {
    pt: ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    es: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
  };
  const DEMO_WEEKLY_VALUES = [
    { leads: 50, qualificados: 30 },
    { leads: 24, qualificados: 11 },
    { leads: 10, qualificados: 14 },
    { leads: 27, qualificados: 12 },
    { leads: 42, qualificados: 19 },
    { leads: 35, qualificados: 16 },
    { leads: 22, qualificados: 9 },
  ];
  function getDemoWeeklyData(locale) {
    const labels = DEMO_WEEKDAY_LABELS[locale] || DEMO_WEEKDAY_LABELS.pt;
    return DEMO_WEEKLY_VALUES.map((v, i) => ({ label: labels[i], ...v }));
  }

  const DATE_LOCALE = { pt: "pt-BR", en: "en-US", es: "es-ES" };

  function decodeGoogleCredential(token) {
    const payload = token.split(".")[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ---- estado ----
  let leads = [];
  let isLoadingLeads = true;
  let isFetching = false;
  let refetchPending = false;
  let debounceTimer = null;
  let channel = null;
  let barChart = null;
  let pieChart = null;
  let blockReason = null;
  let pendingLoginName = null; // preenchimento otimista pro nome, igual ao "displayName" do useAuth

  async function fetchLeads() {
    if (isFetching) {
      refetchPending = true;
      return;
    }
    isFetching = true;
    try {
      const { data, error } = await window.supabaseClient
        .from("leads")
        .select("id, name, phone, status, score, created_at")
        .order("created_at", { ascending: false });

      if (error || !data) return;

      const enriched = await Promise.all(
        data.map(async (lead) => {
          const { data: lastMsg } = await window.supabaseClient
            .from("messages")
            .select("content, created_at")
            .eq("lead_id", lead.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await window.supabaseClient
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("lead_id", lead.id)
            .eq("sender_role", "client")
            .is("read_at", null);

          return {
            ...lead,
            last_message: lastMsg?.content ?? null,
            last_message_at: lastMsg?.created_at ?? null,
            unread_count: count ?? 0,
          };
        }),
      );

      enriched.sort((a, b) => {
        const aT = a.last_message_at ?? a.created_at;
        const bT = b.last_message_at ?? b.created_at;
        return new Date(bT).getTime() - new Date(aT).getTime();
      });

      leads = enriched;
      isLoadingLeads = false;
      renderAll();
    } finally {
      isFetching = false;
      if (refetchPending) {
        refetchPending = false;
        fetchLeads();
      }
    }
  }

  // Várias mensagens (enviar, receber, marcar como lida) podem disparar esse
  // evento em rajada — sem debounce, cada uma dispara um refetch completo.
  function scheduleFetch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchLeads, 400);
  }

  function initRealtime() {
    if (channel) window.supabaseClient.removeChannel(channel);
    channel = window.supabaseClient
      .channel("admin:leads-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleFetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, scheduleFetch)
      .subscribe();
  }

  // ---- render ----

  function getPeriodGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return window.i18n.t("greeting.morning");
    if (hour >= 12 && hour < 18) return window.i18n.t("greeting.afternoon");
    return window.i18n.t("greeting.evening");
  }

  function renderHeader() {
    const user = window.AppAuth.getUser();
    const displayName = user ? user.name : null;

    document.getElementById("greeting").textContent =
      `${getPeriodGreeting()}${displayName ? `, ${displayName}` : ""} 👋`;

    document.getElementById("subtitle").innerHTML = `${window.i18n.t("dashboard.subtitlePrefix")} <strong style="color:var(--foreground)">${leads.length} leads</strong> ${window.i18n.t("dashboard.subtitleSuffix")}`;

    const authArea = document.getElementById("dashboard-auth-area");
    if (user) {
      authArea.innerHTML = `<button type="button" class="btn btn-outline btn-sm" id="dash-logout-btn" data-i18n="common.logout"></button>`;
      window.i18n.applyI18n(authArea);
      document.getElementById("dash-logout-btn").addEventListener("click", handleLogout);
    } else {
      authArea.innerHTML = `<div id="google-login-btn"></div>`;
      renderGoogleButton();
    }
  }

  function renderMetrics() {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const leadsHoje = leads.filter((l) => new Date(l.created_at) >= today0).length;
    const qualificados = leads.filter((l) => l.status === "qualificado" || l.status === "qualificando").length;
    const taxaQualificacao = leads.length ? Math.round((qualificados / leads.length) * 100) : 0;
    const transferidos = leads.filter((l) => l.status === "transferido").length;

    const metrics = [
      { label: window.i18n.t("dashboard.metric.leadsToday"), value: leadsHoje, icon: "users", color: "var(--chart-2)" },
      { label: window.i18n.t("dashboard.metric.avgResponse"), value: "3,2s", icon: "clock", color: "var(--primary)" },
      {
        label: window.i18n.t("dashboard.metric.qualRate"),
        value: `${taxaQualificacao}%`,
        icon: "target",
        color: "var(--chart-3)",
      },
      {
        label: window.i18n.t("dashboard.metric.transferred"),
        value: transferidos,
        icon: "trending-up",
        color: "var(--chart-5)",
      },
    ];

    document.getElementById("metrics-grid").innerHTML = metrics
      .map(
        (m) => `
        <div class="card">
          <div class="card-body metric-card">
            <div>
              <p class="metric-value">${m.value}</p>
              <p class="metric-label">${m.label}</p>
            </div>
            <div class="metric-icon" style="color:${m.color}"><i data-lucide="${m.icon}"></i></div>
          </div>
        </div>
      `,
      )
      .join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function getWeeklyData() {
    const locale = window.i18n.getLocale();
    if (leads.length === 0) return getDemoWeeklyData(locale);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayLeads = leads.filter((l) => {
        const created = new Date(l.created_at);
        return created >= day && created < next;
      });
      const qualificados = dayLeads.filter((l) => l.status === "qualificado" || l.status === "qualificando").length;
      return {
        label: day.toLocaleDateString(DATE_LOCALE[locale], { weekday: "short" }).replace(".", ""),
        leads: dayLeads.length,
        qualificados,
      };
    });
  }

  function renderCharts() {
    const weeklyData = getWeeklyData();

    const barCtx = document.getElementById("weekly-chart").getContext("2d");
    const barConfig = {
      type: "bar",
      data: {
        labels: weeklyData.map((d) => d.label),
        datasets: [
          {
            label: window.i18n.t("chart.leads"),
            data: weeklyData.map((d) => d.leads),
            backgroundColor: cssVar("--chart-2"),
            borderRadius: 4,
          },
          {
            label: window.i18n.t("chart.qualified"),
            data: weeklyData.map((d) => d.qualificados),
            backgroundColor: cssVar("--primary"),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: cssVar("--muted-foreground") } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: cssVar("--muted-foreground") },
            grid: { color: cssVar("--border") },
          },
        },
        plugins: {
          legend: { labels: { color: cssVar("--muted-foreground"), boxWidth: 10, boxHeight: 10 } },
        },
      },
    };

    // Reaproveitar a instância via `chart.data = ...; chart.update()` é frágil
    // no Chart.js (o gráfico às vezes fica em branco depois de um refetch
    // disparado pelo realtime — mesma classe de bug que já tivemos com o
    // ResponsiveContainer do Recharts na versão React). Destruir e recriar a
    // cada render é mais barato que parece pra um gráfico desse tamanho e
    // elimina esse estado inconsistente de vez.
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, barConfig);

    const pieCtx = document.getElementById("sources-chart").getContext("2d");
    const pieConfig = {
      type: "doughnut",
      data: {
        labels: DEMO_SOURCES.map((s) => s.name),
        datasets: [
          {
            data: DEMO_SOURCES.map((s) => s.value),
            backgroundColor: DEMO_SOURCES.map((s) => cssVar(s.color.replace("var(", "").replace(")", ""))),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "62%",
        plugins: { legend: { display: false } },
      },
    };

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, pieConfig);

    const sourcesTotal = DEMO_SOURCES.reduce((sum, s) => sum + s.value, 0);
    document.getElementById("sources-legend").innerHTML = DEMO_SOURCES.map(
      (s) => `
      <div class="flex-row" style="justify-content:space-between; font-size:0.75rem">
        <div class="flex-row gap-2">
          <span style="width:0.5rem;height:0.5rem;border-radius:9999px;background:${s.color}"></span>
          <span class="text-muted">${s.name}</span>
        </div>
        <span style="font-weight:600">${Math.round((s.value / sourcesTotal) * 100)}%</span>
      </div>
    `,
    ).join("");
  }

  function renderActiveLeads() {
    const el = document.getElementById("active-leads");
    if (isLoadingLeads) {
      el.innerHTML = `<p style="padding:1rem;font-size:0.875rem" class="text-muted" data-i18n="common.loading"></p>`;
    } else if (leads.length === 0) {
      el.innerHTML = `<p style="padding:1rem;font-size:0.875rem" class="text-muted" data-i18n="common.noLeadsYet"></p>`;
    } else {
      el.innerHTML = leads
        .slice(0, 5)
        .map(
          (lead) => `
          <div class="flex-row" style="justify-content:space-between;gap:1rem;padding:1rem;border-top:1px solid var(--border)">
            <div style="min-width:0">
              <p class="truncate" style="font-size:0.875rem;font-weight:500">${escapeHtml(lead.name)}</p>
              <p class="truncate text-muted" style="font-size:0.75rem">${escapeHtml(lead.last_message ?? lead.phone)}</p>
            </div>
            <span class="text-muted" style="font-size:0.75rem;flex-shrink:0">score ${lead.score}</span>
          </div>
        `,
        )
        .join("");
    }
    window.i18n.applyI18n(el);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderBlockDialog() {
    const overlay = document.getElementById("block-dialog");
    if (!blockReason) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    document.getElementById("block-dialog-message").textContent = blockReason.message;
  }

  function renderAll() {
    renderHeader();
    renderMetrics();
    renderCharts();
    renderActiveLeads();
  }

  // ---- login com Google ----

  let gsiInitialized = false;

  function renderGoogleButton() {
    const clientId = window.__APP_CONFIG__ && window.__APP_CONFIG__.googleClientId;
    const container = document.getElementById("google-login-btn");
    if (!clientId || !container || !window.google || !window.google.accounts) return;

    if (!gsiInitialized) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSuccess,
        auto_select: false,
        use_fedcm_for_prompt: true,
      });
      gsiInitialized = true;
    }
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      shape: "pill",
      theme: "outline",
      size: "large",
      text: "signin_with",
    });
  }

  async function handleGoogleSuccess(response) {
    if (!response || !response.credential) return;
    try {
      const profile = decodeGoogleCredential(response.credential);

      const recaptchaToken = window.getRecaptchaToken ? await window.getRecaptchaToken("login") : null;
      if (recaptchaToken) {
        const recaptchaCheck = await fetch("/api/recaptcha/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: recaptchaToken }),
        })
          .then((r) => r.json())
          .catch((err) => {
            console.warn("[reCAPTCHA] Verificação indisponível, login liberado:", err);
            return { allowed: true, score: 1 };
          });
        if (!recaptchaCheck.allowed) {
          blockReason = { code: recaptchaCheck.code, message: recaptchaCheck.message };
          renderBlockDialog();
          return;
        }
      }

      const ipCheck = await fetch("/api/auth/ip-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, name: profile.name }),
      })
        .then(async (r) => (r.ok ? { allowed: true } : { allowed: false, ...(await r.json().catch(() => ({}))) }))
        .catch((err) => {
          console.warn("[Auth] Validação de IP/VPN indisponível, login liberado:", err);
          return { allowed: true };
        });

      if (!ipCheck.allowed) {
        blockReason = { code: ipCheck.code, message: ipCheck.error || ipCheck.message };
        renderBlockDialog();
        return;
      }

      window.AppAuth.login({
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      const { error } = await window.supabaseClient.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (error) {
        console.error("Erro ao autenticar no Supabase:", error);
      }
    } catch (error) {
      console.error("Erro no login Google:", error);
    }
  }

  async function handleLogout() {
    await window.AppAuth.logout();
  }

  // ---- boot ----

  function boot() {
    document.getElementById("block-dialog-close").addEventListener("click", () => {
      blockReason = null;
      renderBlockDialog();
    });

    document.addEventListener("app-user-changed", renderHeader);
    window.i18n.onLocaleChange(renderAll);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (barChart) barChart.resize();
        if (pieChart) pieChart.resize();
      }
    });

    renderAll();

    if (window.supabaseClient) {
      fetchLeads();
      initRealtime();
    } else {
      document.addEventListener("app-config-ready", () => {
        fetchLeads();
        initRealtime();
      });
    }

    // Google Identity Services carrega assíncrono; tenta renderizar o botão
    // de novo quando terminar, caso a primeira tentativa (dentro de
    // renderHeader) tenha rodado antes do script existir.
    const gsiCheck = setInterval(() => {
      if (window.google && window.google.accounts && !window.AppAuth.getUser()) {
        renderGoogleButton();
      }
      if (window.google && window.google.accounts) clearInterval(gsiCheck);
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

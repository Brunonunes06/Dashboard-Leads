// Porta de src/routes/settings.tsx — 100% localStorage, sem chamada de servidor.
(function () {
  const DEFAULT_QUESTIONS = [
    "Qual a faixa de investimento que você considera?",
    "Quantos quartos você procura?",
    "Qual região prefere?",
    "Qual seu prazo de mudança?",
  ];

  const DEFAULTS = {
    aiName: "Sofia",
    aiBrand: "Premier Imóveis",
    aiTone:
      "Você é a Sofia, atendente da Premier Imóveis. Fale como um humano: linguagem natural brasileira, frases curtas, sem jargão corporativo. Use no máximo 1 emoji por conversa. Faça uma pergunta por vez. Nunca invente preços ou disponibilidade — se não souber, diga que vai confirmar com o corretor.",
    botName: "Express Bot",
    botDelaySeconds: "0",
    botGreeting: "Olá! Sou o Express Bot e posso te ajudar com imóveis, disponibilidade e agendamento.",
    botHandoff: "Perfeito. Vou te conectar agora com um especialista humano para seguir com o atendimento.",
  };

  function readLS(key, fallback) {
    return localStorage.getItem(key) ?? fallback;
  }
  function readLSBool(key, fallback) {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "true";
  }

  let state = {
    aiName: readLS("aiName", DEFAULTS.aiName),
    aiBrand: readLS("aiBrand", DEFAULTS.aiBrand),
    aiTone: readLS("aiTone", DEFAULTS.aiTone),
    botEnabled: readLSBool("botEnabled", true),
    botName: readLS("botName", DEFAULTS.botName),
    botDelaySeconds: readLS("botDelaySeconds", DEFAULTS.botDelaySeconds),
    botGreeting: readLS("botGreeting", DEFAULTS.botGreeting),
    botHandoff: readLS("botHandoff", DEFAULTS.botHandoff),
    botAutoReply: readLSBool("botAutoReply", true),
    autoTransfer: readLSBool("autoTransfer", true),
    minScore: Number(localStorage.getItem("minScore") || 70),
    questions: DEFAULT_QUESTIONS,
  };
  try {
    const stored = JSON.parse(localStorage.getItem("aiQuestions") || "null");
    if (Array.isArray(stored) && stored.length) state.questions = stored;
  } catch {
    // mantém defaults
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderQuestions() {
    document.getElementById("questions-list").innerHTML = state.questions
      .map(
        (q, i) => `
      <div class="flex-row gap-2" style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background);padding:0.4rem">
        <i data-lucide="grip-vertical" style="width:1rem;height:1rem;flex-shrink:0;color:var(--muted-foreground)"></i>
        <span style="display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:9999px;background:color-mix(in srgb, var(--primary) 15%, transparent);color:var(--primary);font-size:0.7rem;font-weight:600;flex-shrink:0">${i + 1}</span>
        <input class="input" style="border:0;background:transparent;box-shadow:none" data-question-index="${i}" value="${escapeHtml(q)}" />
        <button type="button" class="btn btn-ghost btn-icon" style="width:2rem;height:2rem" data-remove-question="${i}" aria-label="Remover pergunta">
          <i data-lucide="trash-2" style="width:0.85rem;height:0.85rem"></i>
        </button>
      </div>
    `,
      )
      .join("");
    if (window.lucide) window.lucide.createIcons();

    document.querySelectorAll("[data-question-index]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const i = Number(e.target.getAttribute("data-question-index"));
        state.questions[i] = e.target.value;
      });
    });
    document.querySelectorAll("[data-remove-question]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const i = Number(e.currentTarget.getAttribute("data-remove-question"));
        state.questions.splice(i, 1);
        renderQuestions();
      });
    });
  }

  function bindField(id, key) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener("input", () => {
      state[key] = el.value;
    });
  }

  function bindSwitch(id, key) {
    const el = document.getElementById(id);
    el.checked = state[key];
    el.addEventListener("change", () => {
      state[key] = el.checked;
    });
  }

  function bindSlider() {
    const el = document.getElementById("min-score-slider");
    const label = document.getElementById("min-score-value");
    const hint = document.getElementById("min-score-hint");
    el.value = state.minScore;
    label.textContent = state.minScore;
    hint.textContent = `Leads abaixo de ${state.minScore} continuam conversando com a IA ou são marcados como frios.`;
    el.addEventListener("input", () => {
      state.minScore = Number(el.value);
      label.textContent = state.minScore;
      hint.textContent = `Leads abaixo de ${state.minScore} continuam conversando com a IA ou são marcados como frios.`;
    });
  }

  function saveSettings() {
    localStorage.setItem("aiQuestions", JSON.stringify(state.questions));
    localStorage.setItem("aiName", state.aiName);
    localStorage.setItem("aiBrand", state.aiBrand);
    localStorage.setItem("aiTone", state.aiTone);
    localStorage.setItem("botEnabled", String(state.botEnabled));
    localStorage.setItem("botName", state.botName);
    localStorage.setItem("botDelaySeconds", state.botDelaySeconds);
    localStorage.setItem("botGreeting", state.botGreeting);
    localStorage.setItem("botHandoff", state.botHandoff);
    localStorage.setItem("botAutoReply", String(state.botAutoReply));
    localStorage.setItem("autoTransfer", String(state.autoTransfer));
    localStorage.setItem("minScore", String(state.minScore));
    window.toast.success("Configurações salvas", { description: "A IA já está usando as novas regras." });
  }

  async function boot() {
    const user = await window.RouteGuard.requireAdmin();
    if (!user) return;

    bindField("ai-name", "aiName");
    bindField("ai-brand", "aiBrand");
    bindField("ai-tone", "aiTone");
    bindSwitch("bot-enabled", "botEnabled");
    bindField("bot-name", "botName");
    bindField("bot-delay", "botDelaySeconds");
    bindField("bot-greeting", "botGreeting");
    bindField("bot-handoff", "botHandoff");
    bindSwitch("bot-auto-reply", "botAutoReply");
    bindSwitch("auto-transfer", "autoTransfer");
    bindSlider();
    renderQuestions();

    document.getElementById("add-question").addEventListener("click", () => {
      state.questions.push("Nova pergunta");
      renderQuestions();
    });
    document.getElementById("save-settings").addEventListener("click", saveSettings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

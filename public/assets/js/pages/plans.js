// Porta de src/routes/plans.tsx.
(function () {
  const PLANS_BY_LOCALE = {
    pt: {
      semanal: {
        title: "Plano Semanal",
        badge: "Plano Free",
        price: "Gratuito",
        priceNote: "Primeira semana",
        description: "Experimente todos os principais recursos da plataforma durante 7 dias, sem qualquer compromisso.",
        features: [
          "Acesso completo por 7 dias",
          "Sem cobrança durante o período de teste",
          "Sem compromisso de permanência",
          "Ideal para conhecer a plataforma",
        ],
      },
      mensal: {
        title: "Mensalidade",
        badge: "MENSAL",
        price: "R$ 299,99",
        priceNote: "Primeira parcela",
        description: "Ideal para quem busca flexibilidade e acesso contínuo aos recursos da plataforma, sem compromisso anual.",
        features: [
          "Acesso ilimitado a todos os recursos",
          "Atualizações constantes da plataforma",
          "Suporte prioritário",
          "Cobrança mensal recorrente",
          "Cancele quando desejar",
        ],
      },
      anual: {
        title: "Anual",
        badge: "ANUAL",
        price: "R$ 1.600,00",
        priceNote: "Primeira parcela",
        description: "A opção mais vantajosa para quem pretende utilizar a plataforma a longo prazo, com economia significativa.",
        features: [
          "Melhor custo-benefício",
          "Economia nas renovações anuais",
          "Acesso completo durante 12 meses",
          "Prioridade em novos recursos",
          "Suporte prioritário",
        ],
      },
    },
    en: {
      semanal: {
        title: "Weekly Plan",
        badge: "Free Plan",
        price: "Free",
        priceNote: "First week",
        description: "Try all the platform's main features for 7 days, with no commitment.",
        features: [
          "Full access for 7 days",
          "No charge during the trial period",
          "No long-term commitment",
          "Great way to get to know the platform",
        ],
      },
      mensal: {
        title: "Monthly",
        badge: "MONTHLY",
        price: "R$ 299.99",
        priceNote: "First installment",
        description:
          "Ideal for those who want flexibility and continuous access to the platform's features, with no annual commitment.",
        features: [
          "Unlimited access to all features",
          "Constant platform updates",
          "Priority support",
          "Recurring monthly billing",
          "Cancel anytime",
        ],
      },
      anual: {
        title: "Annual",
        badge: "ANNUAL",
        price: "R$ 1,600.00",
        priceNote: "First installment",
        description: "The most advantageous option for those planning to use the platform long-term, with significant savings.",
        features: [
          "Best value for money",
          "Savings on annual renewals",
          "Full access for 12 months",
          "Priority access to new features",
          "Priority support",
        ],
      },
    },
    es: {
      semanal: {
        title: "Plan Semanal",
        badge: "Plan Gratis",
        price: "Gratis",
        priceNote: "Primera semana",
        description: "Prueba todas las funciones principales de la plataforma durante 7 días, sin compromiso.",
        features: [
          "Acceso completo durante 7 días",
          "Sin cobros durante el período de prueba",
          "Sin compromiso de permanencia",
          "Ideal para conocer la plataforma",
        ],
      },
      mensal: {
        title: "Mensualidad",
        badge: "MENSUAL",
        price: "R$ 299,99",
        priceNote: "Primera cuota",
        description:
          "Ideal para quienes buscan flexibilidad y acceso continuo a las funciones de la plataforma, sin compromiso anual.",
        features: [
          "Acceso ilimitado a todas las funciones",
          "Actualizaciones constantes de la plataforma",
          "Soporte prioritario",
          "Cobro mensual recurrente",
          "Cancela cuando quieras",
        ],
      },
      anual: {
        title: "Anual",
        badge: "ANUAL",
        price: "R$ 1.600,00",
        priceNote: "Primera cuota",
        description: "La opción más ventajosa para quienes planean usar la plataforma a largo plazo, con un ahorro significativo.",
        features: [
          "Mejor relación calidad-precio",
          "Ahorro en las renovaciones anuales",
          "Acceso completo durante 12 meses",
          "Prioridad en nuevas funciones",
          "Soporte prioritario",
        ],
      },
    },
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  let currentPix = null;

  function renderPlans() {
    const locale = window.i18n.getLocale();
    const PLANS = PLANS_BY_LOCALE[locale];
    document.getElementById("plans-title").textContent = window.i18n.t("plans.title");
    document.getElementById("plans-subtitle").textContent = window.i18n.t("plans.subtitle");

    document.getElementById("plans-grid").innerHTML = Object.keys(PLANS)
      .map((key) => {
        const p = PLANS[key];
        return `
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-body" style="display:flex;flex:1;flex-direction:column">
            <div class="flex-row" style="justify-content:space-between;align-items:flex-start;gap:0.75rem">
              <div>
                <p class="text-muted" style="font-size:0.75rem">${escapeHtml(p.badge)}</p>
                <h2 style="margin-top:0.4rem;font-size:1.5rem;font-weight:600">${escapeHtml(p.title)}</h2>
              </div>
              <span class="badge" style="background:var(--secondary);color:var(--secondary-foreground);text-transform:none">${escapeHtml(p.badge)}</span>
            </div>

            <div style="margin-top:1.25rem">
              <p class="text-muted" style="font-size:0.75rem">${escapeHtml(p.priceNote)}</p>
              <p style="margin-top:0.25rem;font-family:var(--font-display);font-size:2.25rem;font-weight:700">${escapeHtml(p.price)}</p>
              <p class="text-muted" style="margin-top:0.5rem;font-size:0.75rem">${escapeHtml(p.description)}</p>
            </div>

            <div style="margin-top:1.25rem;display:flex;flex:1;flex-direction:column;gap:0.6rem;font-size:0.875rem">
              ${p.features
                .map(
                  (f) => `
                <div class="flex-row gap-2">
                  <i data-lucide="check" style="width:1rem;height:1rem;color:var(--primary);flex-shrink:0"></i>
                  <span>${escapeHtml(f)}</span>
                </div>
              `,
                )
                .join("")}
            </div>

            <button type="button" class="btn btn-primary" style="margin-top:1.5rem;width:100%" data-select-plan="${key}">
              ${window.i18n.t("plans.subscribe")} ${escapeHtml(p.title)}
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    if (window.lucide) window.lucide.createIcons();
    document.querySelectorAll("[data-select-plan]").forEach((btn) => {
      btn.addEventListener("click", () => handleSelectPlan(btn.getAttribute("data-select-plan"), PLANS));
    });
  }

  function activatedCopy() {
    const locale = window.i18n.getLocale();
    return locale === "pt" ? "Aproveite 7 dias grátis." : locale === "es" ? "Disfruta 7 días gratis." : "Enjoy 7 days free.";
  }
  function activatedTitle(title) {
    const locale = window.i18n.getLocale();
    return `${title} ${locale === "pt" ? "ativado!" : locale === "es" ? "activado!" : "activated!"}`;
  }

  async function handleSelectPlan(key, PLANS) {
    if (key === "semanal") {
      window.toast.success(activatedTitle(PLANS.semanal.title), { description: activatedCopy() });
      return;
    }

    openDialog(PLANS[key]);
    currentPix = null;
    setDialogState("loading");

    const user = window.AppAuth.getUser();
    const result = await fetch("/api/payments/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: key, email: (user && user.email) || "cliente@teamwolf.local" }),
    })
      .then((r) => r.json())
      .catch((err) => ({ success: false, error: err.message }));

    if (result.success) {
      currentPix = { qrCode: result.qrCode, qrCodeBase64: result.qrCodeBase64 };
      setDialogState("qr");
    } else {
      setDialogState("error", result.error);
    }
  }

  function openDialog(plan) {
    document.getElementById("pix-dialog-title").textContent = `${window.i18n.t("plans.subscribe")} ${plan.title}`;
    document.getElementById("pix-dialog-desc").textContent = `${window.i18n.t("plans.pix")} — ${plan.price}`;
    document.getElementById("pix-dialog").hidden = false;
  }
  function closeDialog() {
    document.getElementById("pix-dialog").hidden = true;
  }

  function setDialogState(kind, errorMessage) {
    const loading = document.getElementById("pix-loading");
    const qr = document.getElementById("pix-qr");
    const error = document.getElementById("pix-error");
    loading.hidden = kind !== "loading";
    qr.hidden = kind !== "qr";
    error.hidden = kind !== "error";

    if (kind === "loading") loading.textContent = window.i18n.t("plans.generatingPix");
    if (kind === "qr" && currentPix) {
      document.getElementById("pix-qr-img").src = `data:image/png;base64,${currentPix.qrCodeBase64}`;
      document.getElementById("pix-scan-hint").textContent = window.i18n.t("plans.scanQr");
      document.getElementById("pix-copy-btn").hidden = !currentPix.qrCode;
    }
    if (kind === "error") {
      error.textContent = `${errorMessage || window.i18n.t("plans.pixUnavailable")} ${window.i18n.t("plans.contactSupport")}`;
    }
  }

  function copyPixCode() {
    if (!currentPix || !currentPix.qrCode) return;
    navigator.clipboard
      .writeText(currentPix.qrCode)
      .then(() => {
        const locale = window.i18n.getLocale();
        window.toast.success(locale === "en" ? "Pix code copied" : "Código Pix copiado");
      })
      .catch(() => {
        const locale = window.i18n.getLocale();
        window.toast.error(locale === "en" ? "Couldn't copy" : locale === "es" ? "No se pudo copiar" : "Não foi possível copiar");
      });
  }

  async function boot() {
    const user = await window.RouteGuard.requireSession();
    if (!user) return;

    renderPlans();
    window.i18n.onLocaleChange(renderPlans);

    document.getElementById("pix-dialog-close").addEventListener("click", closeDialog);
    document.getElementById("pix-copy-btn").addEventListener("click", copyPixCode);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

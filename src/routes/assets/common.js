// Shared sidebar, theme toggle, toast — runs on every page
(function () {
  const ADMIN_EMAILS = ["myhpc3301@gmail.com", "marudona231@gmail.com"];
  const ADMIN_ONLY_PAGES = ["settings.html"];

  function isAdminEmail(email) {
    return ADMIN_EMAILS.includes(String(email || "").toLowerCase());
  }

  window.isAdminUser = function () {
    return isAdminEmail(localStorage.getItem("userEmail"));
  };

  // ----- Theme -----
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.classList.toggle("light", savedTheme === "light");

  window.toggleTheme = function () {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    if (window.lucide) lucide.createIcons();
  };

  // ----- Sidebar injection -----
  const navItems = [
    { href: "index.html", icon: "layout-dashboard", label: "Dashboard" },
    { href: "leads.html", icon: "messages-square", label: "Conversas WhatsApp" },
    { href: "instagram.html", icon: "instagram", label: "CRM Instagram" },
    { href: "settings.html", icon: "settings-2", label: "Configurar IA", adminOnly: true },
    { href: "profile.html", icon: "user-circle", label: "Perfil" },
  ];
  const current = location.pathname.split("/").pop() || "index.html";

  function getVisibleNavItems() {
    const admin = window.isAdminUser();
    return navItems.filter((item) => admin || !item.adminOnly);
  }

  function sidebarHTML() {
    const visibleItems = getVisibleNavItems();
    return `
    <div class="sidebar-brand">
          <img src="./img/logo.jpg" alt="Logo da Marca" class="brand-mark">
      <div class="brand-text"><strong>Resposta</strong><span>SaaS de leads</span></div>
    </div>
    <nav class="nav">
      <p class="nav-section">Plataforma</p>
      ${visibleItems.map((n) => `<a href="${n.href}" class="${current === n.href ? "active" : ""}"><i data-lucide="${n.icon}"></i>${n.label}</a>`).join("")}
    </nav>`;
  }

  function renderAccessBlocked() {
    const main = document.querySelector(".main");
    if (!main) return;
    main.innerHTML = `
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="menu-btn" onclick="openMobileSidebar()"><i data-lucide="menu"></i></button>
          <span class="topbar-title">Acesso restrito</span>
        </div>
        <button class="btn btn-outline btn-icon" onclick="toggleTheme()"><i data-lucide="sun-moon"></i></button>
      </header>
      <div style="max-width:720px;margin:0 auto;padding:48px 24px;width:100%">
        <div class="card" style="padding:28px;text-align:center">
          <div style="width:54px;height:54px;border-radius:16px;background:var(--secondary);display:grid;place-items:center;margin:0 auto 14px;color:var(--primary)">
            <i data-lucide="lock" style="width:24px;height:24px"></i>
          </div>
          <h1 style="font-size:24px;font-weight:600;margin:0">Pagina exclusiva para admin</h1>
          <p style="font-size:13px;color:var(--muted);margin:8px auto 18px;max-width:420px">Sua conta atual e de cliente. Entre com uma conta admin para acessar a configuracao da IA.</p>
          <a class="btn btn-primary" href="index.html">Voltar para o dashboard</a>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Inject desktop sidebar
    const sb = document.querySelector(".sidebar");
    if (sb) sb.innerHTML = sidebarHTML();

    // Inject mobile sidebar
    const mobileWrap = document.createElement("div");
    mobileWrap.className = "sidebar-mobile";
    mobileWrap.id = "mobileSidebar";
    mobileWrap.innerHTML = `<div class="sb-back" onclick="closeMobileSidebar()"></div><aside class="sb-panel">${sidebarHTML()}</aside>`;
    document.body.appendChild(mobileWrap);

    if (ADMIN_ONLY_PAGES.includes(current) && !window.isAdminUser()) {
      renderAccessBlocked();
    }

    // Inject toast root
    if (!document.getElementById("toast-root")) {
      const t = document.createElement("div");
      t.id = "toast-root";
      document.body.appendChild(t);
    }

    if (window.lucide) lucide.createIcons();
  });

  window.openMobileSidebar = function () {
    document.getElementById("mobileSidebar").classList.add("open");
  };
  window.closeMobileSidebar = function () {
    document.getElementById("mobileSidebar").classList.remove("open");
  };

  // ----- Toast -----
  window.toast = function (title, desc) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<strong>${title}</strong>${desc ? `<span>${desc}</span>` : ""}`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
      setTimeout(() => el.remove(), 200);
    }, 3200);
  };

  // ----- Helpers -----
  window.escapeHtml = function (s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  };
  window.nowLabel = function () {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // ----- User profile sync -----
  function initials(name) {
    return (
      String(name || "Usuario")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  }

  window.getStoredUserProfile = function () {
    return {
      name: localStorage.getItem("userName") || "",
      email: localStorage.getItem("userEmail") || "",
      phone: localStorage.getItem("userPhone") || "",
      photo: localStorage.getItem("userPhoto") || "",
    };
  };

  window.syncUserProfile = function (profile) {
    const user = {
      ...window.getStoredUserProfile(),
      ...(profile || {}),
    };
    const name = user.name || "Usuario";
    const email = user.email || "";
    const photo = user.photo || "";

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const displayNameEl = document.getElementById("displayName");
    const avatarEl = document.getElementById("avatar");
    const profileMini = document.getElementById("profileMini");

    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    if (phoneInput && user.phone) phoneInput.value = user.phone;
    if (displayNameEl) displayNameEl.textContent = name;
    if (avatarEl) {
      if (photo) {
        avatarEl.innerHTML = `<img src="${window.escapeHtml(photo)}" alt="${window.escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" referrerpolicy="no-referrer">`;
      } else {
        avatarEl.textContent = initials(name);
      }
    }
    if (profileMini && (name || email)) {
      profileMini.innerHTML = `
        <span>${window.escapeHtml(name)}</span>
        ${email ? `<span>${window.escapeHtml(email)}</span>` : ""}
      `;
    }
  };

  window.saveUserProfile = function (profile) {
    if (profile.name) localStorage.setItem("userName", profile.name);
    if (profile.email) localStorage.setItem("userEmail", profile.email);
    if (profile.phone) localStorage.setItem("userPhone", profile.phone);
    if (profile.photo) localStorage.setItem("userPhoto", profile.photo);
    window.syncUserProfile(profile);
  };

  window.readGoogleCredentialPayload = function (response) {
    const base64Url = response && response.credential && response.credential.split(".")[1];
    if (!base64Url) throw new Error("Token do Google invalido.");
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  };

  window.importGoogleProfile = function (response) {
    const payload = window.readGoogleCredentialPayload(response);
    const profile = {
      name: payload.name || payload.given_name || "",
      email: payload.email || "",
      photo: payload.picture || "",
    };
    window.saveUserProfile(profile);
    if (typeof window.checkUserLogin === "function") window.checkUserLogin();
    if (typeof window.updateGreeting === "function") window.updateGreeting();
    if (typeof window.refresh === "function") window.refresh();
    return profile;
  };

  window.renderUser = function () {
    window.syncUserProfile();
    if (typeof window.checkUserLogin === "function") window.checkUserLogin();
    if (typeof window.updateGreeting === "function") window.updateGreeting();
    if (typeof window.refresh === "function") window.refresh();
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.syncUserProfile();
  });
  window.addEventListener("storage", function (e) {
    if (["userName", "userEmail", "userPhone"].includes(e.key)) window.syncUserProfile();
  });

  // ----- Developer-only visual test data controls -----
  const originalSnapshots = new Map();
  const originalChartSnapshots = new Map();

  function snapshotEl(id) {
    const el = document.getElementById(id);
    if (el && !originalSnapshots.has(id)) originalSnapshots.set(id, el.innerHTML);
  }

  function getChart(id) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return null;
    return Chart.getChart(el) || null;
  }

  function zeroChart(id) {
    const chart = getChart(id);
    if (!chart) return false;
    if (!originalChartSnapshots.has(id)) {
      originalChartSnapshots.set(
        id,
        chart.data.datasets.map((dataset) => [...dataset.data]),
      );
    }
    chart.data.datasets.forEach((dataset) => {
      dataset.data = dataset.data.map(() => 0);
    });
    chart.update();
    return true;
  }

  function setChartData(id, datasetIndex, values) {
    const chart = getChart(id);
    if (!chart || !chart.data.datasets[datasetIndex] || !Array.isArray(values)) return false;
    if (!originalChartSnapshots.has(id)) {
      originalChartSnapshots.set(
        id,
        chart.data.datasets.map((dataset) => [...dataset.data]),
      );
    }
    chart.data.datasets[datasetIndex].data = values.map(Number);
    chart.update();
    return true;
  }

  function setChart(id, datasets) {
    const chart = getChart(id);
    if (!chart || !Array.isArray(datasets)) return false;
    if (!originalChartSnapshots.has(id)) {
      originalChartSnapshots.set(
        id,
        chart.data.datasets.map((dataset) => [...dataset.data]),
      );
    }
    datasets.forEach((values, index) => {
      if (chart.data.datasets[index] && Array.isArray(values)) {
        chart.data.datasets[index].data = values.map(Number);
      }
    });
    chart.update();
    return true;
  }

  function metricValueEl(card) {
    return card.querySelector("p[style*='font-size:28px']");
  }

  function setMetrics(values) {
    const metrics = document.getElementById("metrics");
    if (!metrics || !Array.isArray(values)) return false;
    snapshotEl("metrics");
    const cards = metrics.querySelectorAll(".card");
    values.forEach((value, index) => {
      const target = cards[index] && metricValueEl(cards[index]);
      if (target && value !== null && value !== undefined) target.textContent = String(value);
    });
    return true;
  }

  function zeroMetricCards() {
    const metrics = document.getElementById("metrics");
    if (!metrics) return false;
    snapshotEl("metrics");
    metrics.querySelectorAll(".card").forEach((card) => {
      const value = card.querySelector("p[style*='font-size:28px']");
      if (!value) return;
      value.textContent = value.textContent.trim().includes("%") ? "0%" : "0";
    });
    return true;
  }

  function restoreMetrics() {
    const metrics = document.getElementById("metrics");
    if (!metrics || !originalSnapshots.has("metrics")) return false;
    metrics.innerHTML = originalSnapshots.get("metrics");
    if (window.lucide) lucide.createIcons();
    return true;
  }

  function restoreChart(id) {
    const chart = getChart(id);
    const snapshot = originalChartSnapshots.get(id);
    if (!chart || !snapshot) return false;
    chart.data.datasets.forEach((dataset, index) => {
      if (snapshot[index]) dataset.data = [...snapshot[index]];
    });
    chart.update();
    return true;
  }

  window.devTestData = {
    zero() {
      const changed = {
        metrics: zeroMetricCards(),
        barChart: zeroChart("barChart"),
        pieChart: zeroChart("pieChart"),
        flowChart: zeroChart("flowChart"),
      };
      console.info("[devTestData] Dados visuais zerados apenas nesta tela.", changed);
      return changed;
    },
    restore() {
      const changed = {
        metrics: restoreMetrics(),
      };
      ["barChart", "pieChart", "flowChart"].forEach((id) => {
        changed[id] = restoreChart(id);
      });
      console.info("[devTestData] Snapshot visual restaurado quando disponivel.", changed);
      return changed;
    },
    setMetric(index, value) {
      const metrics = document.getElementById("metrics");
      if (!metrics) return false;
      snapshotEl("metrics");
      const cards = metrics.querySelectorAll(".card");
      const target = cards[index] && metricValueEl(cards[index]);
      if (!target) return false;
      target.textContent = String(value);
      return true;
    },
    setMetrics,
    setChart,
    setChartData,
    syncProfile: window.syncUserProfile,
  };

  window.zeroTestData = function () {
    return window.devTestData.zero();
  };
  window.setTestData = function (config) {
    if (!config || typeof config !== "object") return false;
    const changed = {};
    if (Array.isArray(config.metrics)) changed.metrics = setMetrics(config.metrics);
    if (config.barChart) changed.barChart = setChart("barChart", config.barChart);
    if (config.pieChart) changed.pieChart = setChart("pieChart", config.pieChart);
    if (config.flowChart) changed.flowChart = setChart("flowChart", config.flowChart);
    console.info("[devTestData] Dados visuais alterados apenas nesta tela.", changed);
    return changed;
  };
})();

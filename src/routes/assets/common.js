// Shared sidebar, theme toggle, toast — runs on every page DEVELOPER
(function () {
  const ADMIN_EMAILS = ["myhpc3301@gmail.com", "marudona231@gmail.com"];
  const ADMIN_ONLY_PAGES = ["settings.html"];

  function isAdminEmail(email) {
    return ADMIN_EMAILS.includes(
      String(email || "")
        .trim()
        .toLowerCase(),
    );
  }

  window.isAdminUser = function () {
    return isAdminEmail(localStorage.getItem("userEmail"));
  };

  // ----- Theme -----
  const savedTheme = localStorage.getItem("theme") || "dark";

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    document.documentElement.classList.toggle("light", resolved === "light");
    localStorage.setItem("theme", theme);
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: light)");
      mql.addEventListener("change", () => applyTheme("system"));
    }
    return resolved;
  }

  window.setTheme = function (theme) {
    applyTheme(theme);
    if (window.lucide) lucide.createIcons();
  };

  window.toggleTheme = function () {
    const current = localStorage.getItem("theme") || "dark";
    const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
    window.setTheme(next);
  };

  applyTheme(savedTheme);

  // ----- Sidebar injection -----
  const navItems = [
    { href: "index.html", icon: "layout-dashboard", label: "Dashboard" },
    { href: "leads.html", icon: "messages-square", label: "Conversas WhatsApp" },
    { href: "plans.html", icon: "credit-card", label: "Planos",},
    { href: "instagram.html", icon: "camera", label: "CRM Instagram", adminOnly: true },
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
      <div class="brand-text"><strong>TEAM WOLF</strong><span>SaaS de leads</span></div>
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

  const CRM_SHARED_LEADS_KEY = "crmSharedLeads";

  window.slugifyHandle = function (name) {
    return (
      "@" +
      String(name || "lead")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") || "@lead"
    );
  };

  window.loadSharedLeads = function (fallback = [], legacyKeys = ["whatsappLeads", "instagramLeads"]) {
    const keys = [CRM_SHARED_LEADS_KEY, ...legacyKeys];
    for (const key of keys) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(saved) && saved.length) return saved;
      } catch (error) {
        console.warn("Nao foi possivel ler conversas salvas.", error);
      }
    }
    return JSON.parse(JSON.stringify(fallback));
  };

  window.saveSharedLeads = function (items, legacyKeys = ["whatsappLeads", "instagramLeads"]) {
    const payload = JSON.stringify(items);
    localStorage.setItem(CRM_SHARED_LEADS_KEY, payload);
    legacyKeys.forEach((key) => localStorage.setItem(key, payload));
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
    const email = localStorage.getItem("userEmail") || "";
    const persisted = email ? window.loadPersistedUserProfile(email) || {} : {};
    return {
      name: localStorage.getItem("userName") || persisted.name || "",
      email: localStorage.getItem("userEmail") || persisted.email || "",
      phone: localStorage.getItem("userPhone") || persisted.phone || "",
      photo: localStorage.getItem("userPhoto") || persisted.photo || "",
    };
  };

  function getPersistedProfileKey(email) {
    return `crm_user_profile:${String(email || "").trim().toLowerCase()}`;
  }

  window.loadPersistedUserProfile = function (email) {
    if (!email) return null;
    const key = getPersistedProfileKey(email);
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      console.warn("Erro ao ler perfil persistido:", error);
      return null;
    }
  };

  window.savePersistedUserProfile = function (profile) {
    const email = String(profile?.email || "").trim().toLowerCase();
    if (!email) return null;
    const key = getPersistedProfileKey(email);
    const existing = window.loadPersistedUserProfile(email) || {};
    const payload = {
      ...existing,
      ...profile,
      email,
    };
    localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  };

  window.dataURLToBlob = function (dataUrl) {
    const parts = dataUrl.split(",");
    const meta = parts[0] || "";
    const base64 = parts[1] || "";
    const mimeMatch = meta.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  };

  window.openProfilePhotoDb = function () {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB não suportado."));
        return;
      }
      const request = indexedDB.open("crmUserPhotos", 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains("avatars")) {
          db.createObjectStore("avatars", { keyPath: "email" });
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  };

  window.saveProfilePhoto = function (email, dataUrl) {
    if (!email || !dataUrl || !/^data:image\//i.test(dataUrl)) {
      return Promise.resolve(dataUrl);
    }
    return window
      .openProfilePhotoDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          const tx = db.transaction("avatars", "readwrite");
          const store = tx.objectStore("avatars");
          const blob = window.dataURLToBlob(dataUrl);
          const req = store.put({ email, blob, updatedAt: Date.now() });
          req.onsuccess = function () {
            resolve(`indexeddb:${email}`);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        return dataUrl;
      });
  };

  window.loadProfilePhoto = function (photoRef) {
    if (!photoRef) return Promise.resolve(null);
    if (/^https?:\/\//i.test(photoRef) || /^data:image\//i.test(photoRef)) {
      return Promise.resolve(photoRef);
    }
    if (!/^indexeddb:/i.test(photoRef)) return Promise.resolve(null);
    const email = photoRef.replace(/^indexeddb:/i, "");
    return window
      .openProfilePhotoDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          const tx = db.transaction("avatars", "readonly");
          const store = tx.objectStore("avatars");
          const req = store.get(email);
          req.onsuccess = function () {
            const record = req.result;
            if (!record || !record.blob) {
              resolve(null);
              return;
            }
            const url = URL.createObjectURL(record.blob);
            resolve(url);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        return null;
      });
  };

  window.getUserRoleLabel = function (email) {
    return isAdminEmail(email) ? "Administrador" : "Cliente";
  };

  window.updateUserRoleBadge = function (email) {
    const roleEl = document.getElementById("userRoleLabel");
    if (roleEl) {
      roleEl.textContent = window.getUserRoleLabel(email || localStorage.getItem("userEmail"));
    }
  };

  window.syncUserProfile = function (profile) {
    const user = {
      ...window.getStoredUserProfile(),
      ...(profile || {}),
    };
    const name = user.name || "Usuario";
    const email = user.email || "";
    const photo = String(user.photo || "");

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
    // Exibe pill de plano ao lado do nome do usuário (visível para todos após login)
    try {
      let qualPill = document.getElementById("displayQualPill");
      const persisted = window.loadPersistedUserProfile(email) || {};
      const billing = String(persisted.billingPlan || "").toLowerCase();
      const tags = persisted.tags || [];
      let label = "Free";
      let cls = "pill status-transferido";
      if (billing === "mensal") {
        label = "MENSAL";
        cls = "pill status-qualificado";
      } else if (billing === "anual") {
        label = "ANUAL";
        cls = "pill status-transferido";
      } else if (billing === "semanal" || tags.some((t) => /Plano:/i.test(t))) {
        label = "Plano Free";
        cls = "pill status-transferido";
      }

      if (!qualPill) {
        qualPill = document.createElement("span");
        qualPill.id = "displayQualPill";
        qualPill.style.marginLeft = "8px";
        if (displayNameEl && displayNameEl.parentNode) {
          displayNameEl.parentNode.insertBefore(qualPill, displayNameEl.nextSibling);
        }
      }
      qualPill.className = cls;
      qualPill.textContent = label;
      qualPill.style.display = "inline-block";
    } catch (err) {
      console.warn("Erro ao renderizar pill de plano ao lado do nome:", err);
    }
    window.updateUserRoleBadge(email);
    // plan pill is rendered next to the display name (handled above)
    if (avatarEl) {
      if (/^https?:\/\//i.test(photo) || /^data:image\//i.test(photo)) {
        avatarEl.innerHTML = `<img src="${window.escapeHtml(photo)}" alt="${window.escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" referrerpolicy="no-referrer">`;
      } else if (/^indexeddb:/i.test(photo)) {
        avatarEl.textContent = initials(name);
        window.loadProfilePhoto(photo).then(function (resolvedUrl) {
          if (!resolvedUrl) return;
          const currentPhoto = String(user.photo || "");
          if (currentPhoto !== photo) return;
          if (!avatarEl) return;
          avatarEl.innerHTML = `<img src="${window.escapeHtml(resolvedUrl)}" alt="${window.escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" referrerpolicy="no-referrer">`;
        });
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
    const email = String(profile?.email || localStorage.getItem("userEmail") || "").trim().toLowerCase();
    const save = function (resolvedPhoto) {
      const profileToSave = { ...profile, email };
      if (resolvedPhoto != null) profileToSave.photo = resolvedPhoto;

      const savedProfile = window.savePersistedUserProfile(profileToSave);
      if (!savedProfile) return;
      if (savedProfile.name) localStorage.setItem("userName", savedProfile.name);
      if (savedProfile.email) localStorage.setItem("userEmail", savedProfile.email);
      if (savedProfile.phone) localStorage.setItem("userPhone", savedProfile.phone);
      if (savedProfile.photo) localStorage.setItem("userPhoto", savedProfile.photo);
      window.syncUserProfile(savedProfile);
      // Also update CRM client-side auth storage (`crm_user`) so React hooks reflect changes
      try {
        const existing = JSON.parse(localStorage.getItem("crm_user") || "null");
        const role = isAdminEmail(savedProfile.email) ? "admin" : "client";
        const updated = {
          id: existing && existing.id ? existing.id : savedProfile.email || "",
          email: savedProfile.email || (existing && existing.email) || "",
          name: savedProfile.name || (existing && existing.name) || "",
          avatarUrl: savedProfile.photo || (existing && existing.avatarUrl) || "",
          role,
          billingToken: (existing && existing.billingToken) || null,
          billingActive: Boolean(savedProfile.billingPlan) || (existing && existing.billingActive),
          billingPlan: savedProfile.billingPlan || (existing && existing.billingPlan) || null,
        };
        localStorage.setItem("crm_user", JSON.stringify(updated));
        // dispatch event so React hooks can react
        window.dispatchEvent(new CustomEvent("crm_user_profile_updated", { detail: updated }));
      } catch (err) {
        // ignore
      }
    };

    if (profile.photo && /^data:image\//i.test(profile.photo)) {
      window.saveProfilePhoto(email, profile.photo)
        .then(function (photoRef) {
          save(photoRef);
        })
        .catch(function () {
          save(profile.photo);
        });
    } else {
      save(profile.photo);
    }
  };

  window.readGoogleCredentialPayload = function (response) {
    const credential = String(response && response.credential ? response.credential : "");
    const base64Url = credential.split(".")[1];
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

  window.getApiBaseUrl = function () {
    return window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || "http://localhost:3000";
  };

  window.registerUserAccountForIp = async function (profile) {
    const email = String((profile && profile.email) || "")
      .trim()
      .toLowerCase();
    if (!email) throw new Error("E-mail da conta e obrigatorio.");

    const response = await fetch(`${window.getApiBaseUrl()}/api/auth/ip-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name || "",
        email,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Nao foi possivel validar o limite de conta por IP.");
      error.code = data.code;
      throw error;
    }

    return data;
  };

  window.importGoogleProfile = async function (response) {
    const payload = window.readGoogleCredentialPayload(response);
    const emailVerified = payload.email_verified;
    if (emailVerified === false || emailVerified === "false") {
      throw new Error("O e-mail do Google precisa estar verificado.");
    }
    const profile = {
      name: payload.name || payload.given_name || "",
      email: String(payload.email || "").trim().toLowerCase(),
      photo: payload.picture || "",
    };
    const persisted = window.loadPersistedUserProfile(profile.email);
    const mergedProfile = {
      ...profile,
      ...(persisted || {}),
    };
    // Chamada ao servidor para limitar contas por IP pode falhar quando o servidor
    // local não está ativo — comentada para evitar erros no console durante desenvolvimento.
    // await window.registerUserAccountForIp(profile);
    // Se quiser validar no servidor, descomente a linha acima.
    window.saveUserProfile(mergedProfile);
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

  // ----- Developer console & commands (F2 to toggle) -----
  (function () {
    const commands = new Map();

    function register(name, fn, desc) {
      commands.set(name, { fn, desc: desc || "" });
      // Expose command globally only for admin users
      try {
        if (typeof window.isAdminUser === "function" && window.isAdminUser()) {
          window[name] = function (...args) {
            try {
              const r = fn.apply(null, args);
              console.info(`[devcmd] ${name} executed`, args, r);
              return r;
            } catch (e) {
              console.error(`[devcmd] ${name} error:`, e);
              throw e;
            }
          };
        }
      } catch (err) {
        // do not expose command if check fails
      }
    }

    // Pagar command: simula pagamento para o usuário atual (localStorage only)
    register(
      "Pagar",
      function (plan) {
        const storedEmail = localStorage.getItem("userEmail") || "";
        if (!storedEmail) throw new Error("Nenhum usuário logado (userEmail não definido). Faça login antes de usar Pagar().");
        const email = String(storedEmail).trim().toLowerCase();
        const persisted = window.loadPersistedUserProfile(email) || {};
        const now = new Date().toISOString();
        const billingPlan = String(plan || "").toLowerCase();
        const tags = persisted.tags || [];
        // Adiciona tag do plano para mostrar no perfil
        const planTag = `Plano: ${String(plan)}`;
        if (!tags.includes(planTag)) tags.push(planTag);
        const newProfile = {
          ...persisted,
          email,
          billingPlan: billingPlan,
          billingPaidAt: now,
          tags,
          // marca como simulação de desenvolvedor para não confundir com dados reais
          devSimulation: true,
        };
        window.savePersistedUserProfile(newProfile);
        // Atualiza localStorage exibido em páginas
        if (newProfile.name) localStorage.setItem("userName", newProfile.name);
        if (newProfile.email) localStorage.setItem("userEmail", newProfile.email);
        if (newProfile.phone) localStorage.setItem("userPhone", newProfile.phone);
        if (newProfile.photo) localStorage.setItem("userPhoto", newProfile.photo);
        window.syncUserProfile(newProfile);
        if (typeof window.renderPlanTags === "function") window.renderPlanTags();
        return newProfile;
      },
      "Simula pagamento (local) para o usuário logado. Uso: Pagar('Semanal')",
    );

    register(
      "ListDevCommands",
      function () {
        const list = Array.from(commands.keys()).map((k) => ({ name: k, desc: commands.get(k).desc }));
        console.table(list);
        return list;
      },
      "Lista comandos de desenvolvedor disponíveis",
    );

    register(
      "DevHelp",
      function () {
        const list = Array.from(commands.entries()).map(([name, info]) => ({
          name,
          usage: info.desc || "Sem descrição disponível",
        }));
        console.table(list);
        return list;
      },
      "Mostra todos os comandos dev e como usar cada um",
    );

    register(
      "ResetDevPayment",
      function () {
        const storedEmail = localStorage.getItem("userEmail") || "";
        if (!storedEmail) throw new Error("Nenhum usuário logado (userEmail não definido).");
        const email = String(storedEmail).trim().toLowerCase();
        const persisted = window.loadPersistedUserProfile(email) || {};
        delete persisted.billingPlan;
        delete persisted.billingPaidAt;
        delete persisted.devSimulation;
        persisted.tags = (persisted.tags || []).filter((t) => !t.startsWith("Plano:"));
        window.savePersistedUserProfile(persisted);
        window.syncUserProfile(persisted);
        if (typeof window.renderPlanTags === "function") window.renderPlanTags();
        return persisted;
      },
      "Remove simulação de pagamento do usuário logado",
    );

    // Expose a safe command runner for the overlay
    window.__dev_commands = commands;

    // Build overlay
    let overlay;
    function createOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement("div");
      overlay.id = "dev-console-overlay";
      overlay.style.position = "fixed";
      overlay.style.right = "18px";
      overlay.style.bottom = "18px";
      overlay.style.width = "420px";
      overlay.style.maxWidth = "calc(100% - 36px)";
      overlay.style.zIndex = 99999;
      overlay.style.background = "rgba(2,6,23,0.9)";
      overlay.style.color = "#fff";
      overlay.style.border = "1px solid rgba(255,255,255,0.06)";
      overlay.style.borderRadius = "10px";
      overlay.style.padding = "10px";
      overlay.style.boxShadow = "0 10px 30px rgba(2,6,23,0.6)";
      overlay.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <strong>Dev Console</strong>
          <button id="dev-console-close" style="background:transparent;border:0;color:#9ca3af;cursor:pointer">Fechar</button>
        </div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:6px">Comandos: Pagar('Semanal'|'Mensal'|'Anual'), ListDevCommands(), ResetDevPayment(), DevHelp()</div>
        <input id="dev-console-input" placeholder="Comando ex: Pagar('Mensal')" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#fff" />
        <div id="dev-console-help" style="margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:rgba(255,255,255,0.03);font-size:12px;color:#d1fae5;max-height:160px;overflow:auto"></div>
        <div id="dev-console-output" style="margin-top:8px;font-size:13px;max-height:180px;overflow:auto;color:#d1fae5"></div>
      `;
      document.body.appendChild(overlay);
      document.getElementById("dev-console-close").addEventListener("click", () => toggleOverlay(false));
      const input = document.getElementById("dev-console-input");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runCommand(input.value.trim());
          input.value = "";
        }
      });
      renderDevHelp();
      return overlay;
    }

    function toggleOverlay(force) {
      const el = createOverlay();
      const visible = el.style.display !== "none" && el.style.display !== "";
      const show = typeof force === "boolean" ? force : !visible;
      el.style.display = show ? "block" : "none";
      if (show) document.getElementById("dev-console-input").focus();
    }

    function renderDevHelp() {
      const helpEl = document.getElementById("dev-console-help");
      if (!helpEl) return;
      const list = Array.from(commands.entries()).map(([name, info]) => {
        return `<div style="margin-bottom:8px"><strong>${name}</strong>: ${window.escapeHtml(info.desc || "Sem descrição disponível")}</div>`;
      });
      helpEl.innerHTML = list.join("");
    }

    function runCommand(text) {
      const out = document.getElementById("dev-console-output");
      if (!text) return;
      try {
        // naive parser: extract name and args
        const m = text.match(/^([a-zA-Z_$][\w$]*)\s*\((.*)\)\s*$/);
        if (!m) throw new Error("Comando inválido. Use NomeComando(arg1, arg2)");
        const name = m[1];
        const argsText = m[2].trim();
        const args = argsText ? JSON.parse(`[${argsText.replace(/'/g, '"')}]`) : [];
        const cmd = commands.get(name);
        if (!cmd) throw new Error(`Comando não encontrado: ${name}`);
        const res = cmd.fn.apply(null, args);
        out.innerText = `> ${text}\n` + JSON.stringify(res, null, 2);
        console.info("[dev-console] executed", name, args, res);
        return res;
      } catch (err) {
        out.innerText = `Erro: ${err.message || err}`;
        console.error(err);
        return null;
      }
    }

    // Toggle overlay with F2
    document.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        try {
          if (typeof window.isAdminUser === "function" && window.isAdminUser()) toggleOverlay();
        } catch (err) {
          // swallow
        }
      }
    });
  })();
})();

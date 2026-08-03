// Porta de src/routes/profile.tsx.
(function () {
  const INTEGRATIONS = [
    { icon: "mail", title: "Conta Google", desc: "Login único e sincronização.", status: "pending" },
    { icon: "message-circle", title: "WhatsApp Business", desc: "Automação de mensagens.", status: "pending" },
    { icon: "user-plus", title: "Convidar alguém", desc: "Compartilhe o site com outra pessoa.", status: "invite" },
    { icon: "phone", title: "Telefonia", desc: "Integração de chamadas.", status: "soon" },
  ];

  function getInitials(name) {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  }

  function getInviteUrl() {
    return new URL("/index.html", window.location.origin).href;
  }

  function sharePlatform(platform) {
    const url = getInviteUrl();
    const text = "Junte-se a mim no site Resposta para gerenciar leads e conversas.";
    const message = `${text} ${url}`;
    let shareUrl = "";

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "x":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent("Convite para o site")}&summary=${encodeURIComponent(text)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent("Convite para o site")}&body=${encodeURIComponent(message)}`;
        break;
      default:
        return;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  let state = { name: "", email: "", phone: "", avatarUrl: "", deleteRequested: false };

  function renderAvatar() {
    const wrap = document.getElementById("avatar-preview");
    if (state.avatarUrl) {
      wrap.innerHTML = `<img src="${state.avatarUrl}" alt="${state.name}" />`;
    } else {
      wrap.textContent = getInitials(state.name || "Usuário");
    }
  }

  function renderIdentity() {
    document.getElementById("profile-name-display").textContent = state.name || "Usuário";
    const user = window.AppAuth.getUser();
    document.getElementById("profile-role-display").textContent = user && user.role === "admin" ? "Admin" : "Cliente";
  }

  function renderIntegrations() {
    document.getElementById("integrations-list").innerHTML = INTEGRATIONS.map(
      (it) => `
      <div class="flex-row" style="justify-content:space-between;gap:0.75rem;border:1px solid var(--border);border-radius:var(--radius-lg);padding:0.85rem">
        <div class="flex-row gap-2">
          <div style="display:grid;place-items:center;width:2.25rem;height:2.25rem;border-radius:var(--radius-lg);background:var(--secondary)">
            <i data-lucide="${it.icon}" style="width:1rem;height:1rem"></i>
          </div>
          <div>
            <p style="font-size:0.875rem;font-weight:500">${it.title}</p>
            <p class="text-muted" style="font-size:0.75rem">${it.desc}</p>
          </div>
        </div>
        ${
          it.status === "soon"
            ? `<span class="text-muted" style="font-size:0.75rem">Em breve</span>`
            : it.status === "invite"
              ? `<button type="button" class="btn btn-outline btn-sm" data-action="invite">Convidar</button>`
              : `<button type="button" class="btn btn-outline btn-sm" data-action="connect" data-title="${it.title}">Conectar</button>`
        }
      </div>
    `,
    ).join("");
    if (window.lucide) window.lucide.createIcons();

    document.querySelector('[data-action="invite"]')?.addEventListener("click", () => openShareDialog());
    document.querySelectorAll('[data-action="connect"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        window.toast.info("Integração em curso", { description: `${btn.getAttribute("data-title")} solicitada.` });
      });
    });
  }

  function openShareDialog() {
    document.getElementById("share-dialog").hidden = false;
  }
  function closeShareDialog() {
    document.getElementById("share-dialog").hidden = true;
  }

  function openDeleteDialog() {
    document.getElementById("delete-dialog").hidden = false;
  }
  function closeDeleteDialog() {
    document.getElementById("delete-dialog").hidden = true;
  }

  function updateDeleteButton() {
    const btn = document.getElementById("delete-account-btn");
    btn.disabled = state.deleteRequested;
    btn.textContent = state.deleteRequested ? "Pedido de exclusão enviado" : "Excluir meus dados";
  }

  async function handleRequestDeletion() {
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) {
      window.toast.error("Sessão expirada", { description: "Faça login novamente." });
      return;
    }
    const result = await fetch("/api/lgpd/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: data.session.access_token }),
    }).then((r) => r.json());

    closeDeleteDialog();
    if (result.success) {
      state.deleteRequested = true;
      updateDeleteButton();
      window.toast.success("Pedido registrado", {
        description: "Vamos processar a exclusão dos seus dados e entrar em contato pelo seu e-mail.",
      });
    } else {
      window.toast.error("Não foi possível registrar o pedido", { description: result.error });
    }
  }

  function handleAvatarFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      state.avatarUrl = dataUrl;
      renderAvatar();
      window.toast.success("Foto atualizada", { description: "Avatar carregado com sucesso." });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleSave() {
    window.AppAuth.updateProfile({ name: state.name, avatarUrl: state.avatarUrl });
    renderIdentity();
    window.toast.success("Perfil atualizado com sucesso!");
  }

  function copyInviteLink() {
    navigator.clipboard
      .writeText(getInviteUrl())
      .then(() => window.toast.success("Link copiado", { description: "URL de convite copiada para a área de transferência." }))
      .catch(() => window.toast.error("Erro ao copiar", { description: "Não foi possível copiar o link." }));
  }

  async function boot() {
    const user = await window.RouteGuard.requireSession();
    if (!user) return;

    state.name = user.name || "";
    state.email = user.email || "";
    state.avatarUrl = user.avatarUrl || "";

    document.getElementById("profile-name").value = state.name;
    document.getElementById("profile-email").value = state.email;
    document.getElementById("profile-phone").value = state.phone;
    document.getElementById("profile-name").addEventListener("input", (e) => {
      state.name = e.target.value;
      renderAvatar();
    });
    document.getElementById("profile-email").addEventListener("input", (e) => (state.email = e.target.value));
    document.getElementById("profile-phone").addEventListener("input", (e) => (state.phone = e.target.value));

    renderAvatar();
    renderIdentity();
    renderIntegrations();
    updateDeleteButton();

    document.getElementById("avatar-file").addEventListener("change", handleAvatarFile);
    document.getElementById("avatar-edit-btn").addEventListener("click", () => document.getElementById("avatar-file").click());
    document.getElementById("save-profile").addEventListener("click", handleSave);

    document.getElementById("delete-account-btn").addEventListener("click", openDeleteDialog);
    document.getElementById("delete-cancel").addEventListener("click", closeDeleteDialog);
    document.getElementById("delete-confirm").addEventListener("click", handleRequestDeletion);

    document.getElementById("share-close").addEventListener("click", closeShareDialog);
    document.getElementById("share-copy").addEventListener("click", copyInviteLink);
    document.querySelectorAll("[data-share-platform]").forEach((btn) => {
      btn.addEventListener("click", () => sharePlatform(btn.getAttribute("data-share-platform")));
    });

    document.getElementById("theme-toggle-inline").addEventListener("click", () => window.AppTheme.cycleTheme());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

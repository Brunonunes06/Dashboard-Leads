// Porta de src/routes/leads/chat.tsx + src/components/ChatWindow.tsx +
// src/hooks/useRealtimeChat.ts + src/hooks/useLeads.ts.
(function () {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Lista de leads (porta de useLeads.ts)
  // ---------------------------------------------------------------------
  let leads = [];
  let isLoadingLeads = true;
  let isFetchingLeads = false;
  let refetchLeadsPending = false;
  let leadsDebounceTimer = null;
  let leadsChannel = null;

  let query = "";
  let statusFilter = "todos";
  let selectedLead = null;
  let adminId = null;
  let adminName = "CEO";

  async function fetchLeads() {
    if (isFetchingLeads) {
      refetchLeadsPending = true;
      return;
    }
    isFetchingLeads = true;
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

      // mantém a seleção sincronizada com os dados novos (ex: status mudou)
      if (selectedLead) {
        const fresh = leads.find((l) => l.id === selectedLead.id);
        if (fresh) selectedLead = fresh;
      }

      renderSidebar();
      if (selectedLead) renderChatHeader();
    } finally {
      isFetchingLeads = false;
      if (refetchLeadsPending) {
        refetchLeadsPending = false;
        fetchLeads();
      }
    }
  }

  function scheduleFetchLeads() {
    if (leadsDebounceTimer) clearTimeout(leadsDebounceTimer);
    leadsDebounceTimer = setTimeout(fetchLeads, 400);
  }

  function initLeadsRealtime() {
    if (leadsChannel) window.supabaseClient.removeChannel(leadsChannel);
    leadsChannel = window.supabaseClient
      .channel("admin:leads-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleFetchLeads)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, scheduleFetchLeads)
      .subscribe();
  }

  const STATUS_FILTERS = [
    { key: "todos", labelKey: "chat.filters.all" },
    { key: "novo", labelKey: "chat.filters.new" },
    { key: "qualificando", labelKey: "chat.filters.qualifying" },
    { key: "qualificado", labelKey: "chat.filters.qualified" },
    { key: "transferido", labelKey: "chat.filters.transferred" },
  ];

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  function getFilteredLeads() {
    const q = query.toLowerCase().trim();
    return leads.filter((l) => {
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (q && !`${l.name} ${l.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderFilters() {
    document.getElementById("chat-filters").innerHTML = STATUS_FILTERS.map(
      (f) => `
      <button type="button" data-filter="${f.key}" class="chat-filter-btn" style="padding:4px 10px;border-radius:9999px;font-size:11px;border:1px solid var(--border);cursor:pointer;background:${statusFilter === f.key ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent"};color:${statusFilter === f.key ? "var(--primary)" : "var(--muted-foreground)"}">${window.i18n.t(f.labelKey)}</button>
    `,
    ).join("");
    document.querySelectorAll(".chat-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.getAttribute("data-filter");
        renderFilters();
        renderSidebar();
      });
    });
  }

  function renderSidebar() {
    const list = document.getElementById("chat-lead-list");
    const filtered = getFilteredLeads();

    if (isLoadingLeads) {
      list.innerHTML = `<p style="padding:20px;font-size:13px;text-align:center" class="text-muted">${window.i18n.t("common.loading")}</p>`;
      return;
    }
    if (filtered.length === 0) {
      list.innerHTML = `<p style="padding:20px;font-size:13px;text-align:center" class="text-muted">${window.i18n.t(leads.length ? "common.noLeadsFiltered" : "common.noLeadsYet")}</p>`;
      return;
    }

    list.innerHTML = filtered
      .map((lead) => {
        const initials = lead.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("");
        const isSelected = selectedLead && selectedLead.id === lead.id;
        return `
        <button type="button" data-lead-id="${lead.id}" class="chat-lead-item" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isSelected ? "var(--secondary)" : "transparent"};border:none;border-radius:8px;cursor:pointer;text-align:left;margin:2px 4px;width:calc(100% - 8px)">
          <div style="position:relative;width:40px;height:40px;border-radius:50%;background:var(--secondary);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--foreground);text-transform:uppercase;flex-shrink:0">
            ${initials}
            ${lead.unread_count > 0 ? `<div style="position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#5865f2;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;padding:0 4px">${lead.unread_count}</div>` : ""}
          </div>
          <div style="min-width:0;flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="truncate" style="font-size:14px;font-weight:600;color:var(--foreground)">${escapeHtml(lead.name)}</span>
              <span class="text-muted" style="font-size:11px;flex-shrink:0;margin-left:6px">${timeAgo(lead.last_message_at)}</span>
            </div>
            <p class="truncate text-muted" style="font-size:12.5px;margin:2px 0 0">${escapeHtml(lead.last_message ?? lead.phone)}</p>
            <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
              ${window.StatusBadge.html(lead.status)}
              <span class="text-muted" style="font-size:10px">score ${lead.score}</span>
            </div>
          </div>
        </button>
      `;
      })
      .join("");

    list.querySelectorAll("[data-lead-id]").forEach((btn) => {
      btn.addEventListener("click", () => selectLead(btn.getAttribute("data-lead-id")));
    });
  }

  // ---------------------------------------------------------------------
  // Chat (porta de useRealtimeChat.ts + ChatWindow.tsx)
  // ---------------------------------------------------------------------
  let messages = [];
  let isLoadingMessages = true;
  let chatChannel = null;
  let draft = "";
  let isSending = false;
  let isTransferring = false;
  let isSuggesting = false;

  function selectLead(id) {
    selectedLead = leads.find((l) => l.id === id) || null;
    draft = "";
    document.getElementById("chat-empty-state").style.display = selectedLead ? "none" : "flex";
    document.getElementById("chat-window").style.display = selectedLead ? "flex" : "none";
    renderSidebar();
    if (selectedLead) loadChat(selectedLead.id);
  }

  async function loadChat(leadId) {
    isLoadingMessages = true;
    renderMessages();

    const { data, error } = await window.supabaseClient
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    messages = !error && data ? data : [];
    isLoadingMessages = false;
    renderChatHeader();
    renderMessages();
    markAsRead();

    if (chatChannel) window.supabaseClient.removeChannel(chatChannel);
    chatChannel = window.supabaseClient
      .channel(`chat:${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const nova = payload.new;
          if (messages.some((m) => m.id === nova.id)) return;
          messages = [...messages, nova].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          renderMessages();
          markAsRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const updated = payload.new;
          messages = messages.map((m) => (m.id === updated.id ? updated : m));
          renderMessages();
        },
      )
      .subscribe();
  }

  async function markAsRead() {
    if (!selectedLead || messages.length === 0) return;
    await window.supabaseClient
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("lead_id", selectedLead.id)
      .neq("sender_id", adminId)
      .is("read_at", null);
  }

  function renderChatHeader() {
    if (!selectedLead) return;
    document.getElementById("chat-header-name").textContent = selectedLead.name;
    document.getElementById("chat-header-status").innerHTML = window.StatusBadge.html(selectedLead.status);
    document.getElementById("chat-header-avatar").textContent = getInitials(selectedLead.name);

    const transferBtn = document.getElementById("chat-transfer-btn");
    const isTransferred = selectedLead.status === "transferido";
    transferBtn.disabled = isTransferring || isTransferred;
    transferBtn.style.background = isTransferred ? "transparent" : "var(--gradient-primary)";
    transferBtn.style.color = isTransferred ? "var(--primary)" : "var(--primary-foreground)";
    transferBtn.querySelector("span").textContent = window.i18n.t(isTransferred ? "lead.transferred" : "lead.transfer");
  }

  function getInitials(name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function formatMessageTime(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function formatSeparator(iso) {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const day = isToday ? "Hoje" : weekdays[d.getDay()];
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${day}, ${time}`;
  }

  function shouldShowSeparator(index) {
    if (index === 0) return true;
    const previous = messages[index - 1];
    const current = messages[index];
    return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() > 30 * 60 * 1000;
  }

  function renderMessages() {
    const container = document.getElementById("chat-messages");
    if (isLoadingMessages) {
      container.innerHTML = `<div style="display:flex;flex:1;align-items:center;justify-content:center;height:100%"><p class="text-muted" style="font-size:13px">${window.i18n.t("common.loading")}</p></div>`;
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = `<div style="display:flex;flex:1;align-items:center;justify-content:center;height:100%"><p class="text-muted" style="font-size:13px;text-align:center">${window.i18n.t("common.noMessagesYet")}<br>${window.i18n.t("common.startConversation")}</p></div>`;
      return;
    }

    const senderLabel = adminName || "CEO";
    const groups = [];
    for (const msg of messages) {
      const last = groups[groups.length - 1];
      const senderName = msg.sender_role === "admin" ? senderLabel : selectedLead.name;
      if (last && last.senderId === msg.sender_id) {
        last.msgs.push(msg);
        continue;
      }
      groups.push({ senderId: msg.sender_id, senderName, msgs: [msg] });
    }

    let messageIndex = 0;
    let html = "";
    for (const group of groups) {
      const isOwn = group.senderId === adminId;
      const firstIndex = messageIndex;
      messageIndex += group.msgs.length;

      if (shouldShowSeparator(firstIndex)) {
        html += `<div style="text-align:center;margin:18px auto 14px;font-size:11px;color:var(--muted-foreground);width:fit-content;padding:6px 10px;border-radius:9999px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16)">${formatSeparator(group.msgs[0].created_at)}</div>`;
      }

      html += `<div style="display:flex;flex-direction:column;align-items:${isOwn ? "flex-end" : "flex-start"};gap:2px;margin-bottom:12px">`;
      if (!isOwn) {
        html += `<span class="text-muted" style="font-size:12px;margin-left:8px;margin-bottom:2px">${escapeHtml(group.senderName)}</span>`;
      }
      group.msgs.forEach((msg, idx) => {
        const isLast = idx === group.msgs.length - 1;
        const radius = isOwn ? `18px 18px ${isLast ? "6px" : "18px"} 18px` : `18px 18px 18px ${isLast ? "6px" : "18px"}`;
        html += `<div style="display:flex;align-items:flex-end;gap:8px;flex-direction:${isOwn ? "row-reverse" : "row"}">`;
        if (!isOwn) {
          html += `<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;background:${isLast ? "rgba(30,41,59,.9)" : "transparent"}">${isLast ? escapeHtml(getInitials(group.senderName)) : ""}</div>`;
        }
        html += `
          <div style="max-width:72%;padding:10px 14px;border-radius:${radius};font-size:14.5px;line-height:1.45;word-break:break-word;background:${isOwn ? "var(--gradient-primary)" : "var(--secondary)"};color:${isOwn ? "var(--primary-foreground)" : "var(--foreground)"}">
            ${escapeHtml(msg.content)}
            <div style="font-size:10px;opacity:0.65;margin-top:2px;text-align:right">${formatMessageTime(msg.created_at)}</div>
          </div>
        `;
        html += `</div>`;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || isSending || !selectedLead) return;

    draft = "";
    document.getElementById("chat-input").value = "";
    isSending = true;

    const optimisticId = crypto.randomUUID();
    const optimistic = {
      id: optimisticId,
      lead_id: selectedLead.id,
      sender_id: adminId,
      sender_role: "admin",
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    messages = [...messages, optimistic];
    renderMessages();

    const { data, error } = await window.supabaseClient
      .from("messages")
      // Passa o id explicitamente: a tabela messages ao vivo não está
      // preenchendo o DEFAULT gen_random_uuid() (mesmo o schema em
      // supabase/001_messages_rls.sql declarando isso), então o insert sem
      // id falha com "null value in column id". Gerar o UUID no cliente
      // funciona independente da causa no banco.
      .insert({ id: optimisticId, lead_id: selectedLead.id, sender_id: adminId, sender_role: "admin", content: text })
      .select()
      .single();

    if (error) {
      messages = messages.filter((m) => m.id !== optimisticId);
      console.error(error);
      window.toast.error("Erro ao enviar mensagem", { description: error.message });
    } else if (data) {
      messages = messages.map((m) => (m.id === optimisticId ? data : m));
    }
    renderMessages();
    isSending = false;
    document.getElementById("chat-input").focus();
  }

  async function handleTransfer() {
    if (isTransferring || !selectedLead) return;
    isTransferring = true;
    renderChatHeader();

    const { error } = await window.supabaseClient.from("leads").update({ status: "transferido" }).eq("id", selectedLead.id);
    isTransferring = false;

    if (error) {
      console.error("Erro ao transferir lead:", error);
      window.toast.error("Erro ao transferir", { description: error.message });
      renderChatHeader();
      return;
    }
    window.toast.success("Lead transferido", { description: `${selectedLead.name} foi marcado como transferido.` });
    selectedLead = { ...selectedLead, status: "transferido" };
    renderChatHeader();
    await fetchLeads();
  }

  async function handleAiSuggest() {
    if (isSuggesting || !selectedLead) return;
    if (window.AIReplyClient.getAISettings().botEnabled === false) {
      window.toast.warning("Bot desativado", { description: "Ative o bot em Configurar IA para usar sugestões." });
      return;
    }
    isSuggesting = true;
    try {
      const input = window.AIReplyClient.buildAIReplyInput(
        { name: selectedLead.name, phone: selectedLead.phone },
        messages.map((m) => ({ sender_role: m.sender_role, content: m.content })),
      );
      const { data } = await window.supabaseClient.auth.getSession();
      if (!data.session) {
        window.toast.error("Sessão expirada", { description: "Faça login novamente para usar a IA." });
        return;
      }
      const result = await fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, accessToken: data.session.access_token }),
      }).then((r) => r.json());

      if (result.error || !result.output_text) {
        window.toast.error("IA indisponível", { description: result.error || "Não foi possível gerar uma resposta agora." });
        return;
      }
      const { text, handoff } = window.AIReplyClient.splitHandoff(result.output_text);
      draft = text;
      document.getElementById("chat-input").value = text;
      document.getElementById("chat-input").focus();
      if (handoff) {
        window.toast.warning("Sugestão de transferência", {
          description: "A IA identificou que este atendimento pode precisar de um humano.",
        });
      }
    } catch (error) {
      window.toast.error("IA indisponível", { description: error.message || "Tente novamente." });
    } finally {
      isSuggesting = false;
    }
  }

  function openLeadDetails() {
    if (!selectedLead) return;
    document.getElementById("lead-details-avatar").textContent = getInitials(selectedLead.name);
    document.getElementById("lead-details-name").textContent = selectedLead.name;
    document.getElementById("lead-details-phone").textContent = selectedLead.phone;
    document.getElementById("lead-details-status").innerHTML = window.StatusBadge.html(selectedLead.status);
    document.getElementById("lead-details-score").textContent = selectedLead.score;
    document.getElementById("lead-details-phone2").textContent = selectedLead.phone;
    document.getElementById("lead-details-messages").textContent = messages.length;
    document.getElementById("lead-details-messages-count").textContent = messages.length;
    document.getElementById("lead-details-origin").textContent = selectedLead.last_message || "Conversação ativa";
    document.getElementById("lead-details-dialog").hidden = false;
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  async function boot() {
    const user = await window.RouteGuard.requireAdmin();
    if (!user) return;

    const { data } = await window.supabaseClient.auth.getSession();
    adminId = data.session ? data.session.user.id : user.id;
    adminName = "CEO";

    renderFilters();
    renderSidebar();

    document.getElementById("chat-search").addEventListener("input", (e) => {
      query = e.target.value;
      renderSidebar();
    });

    document.getElementById("chat-input").addEventListener("input", (e) => (draft = e.target.value));
    document.getElementById("chat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    document.getElementById("chat-send-btn").addEventListener("click", handleSend);
    document.getElementById("chat-ai-btn").addEventListener("click", handleAiSuggest);
    document.getElementById("chat-transfer-btn").addEventListener("click", handleTransfer);
    document.getElementById("chat-header-avatar-btn").addEventListener("click", openLeadDetails);
    document.getElementById("lead-details-close").addEventListener("click", () => {
      document.getElementById("lead-details-dialog").hidden = true;
    });

    fetchLeads();
    initLeadsRealtime();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

// Porta de src/hooks/useAuth.ts + src/lib/permissions.ts. A identidade
// (email/id) vem sempre da sessão real do Supabase — nunca de um campo
// persistido no localStorage. O "role" é recalculado sempre a partir do
// e-mail real contra a lista adminEmails vinda de /config.js.
(function () {
  let session = null;
  let pendingUser = null; // preenchimento otimista entre o login do Google e a sessão do Supabase ficar pronta
  const listeners = new Set();

  function profileOverrideKey(email) {
    return `crm_profile_overrides:${email.trim().toLowerCase()}`;
  }

  function readProfileOverride(email) {
    if (!email) return null;
    try {
      const raw = localStorage.getItem(profileOverrideKey(email));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isAdminEmail(email) {
    if (!email) return false;
    const admins = (window.__APP_CONFIG__ && window.__APP_CONFIG__.adminEmails) || [];
    return admins.includes(email.trim().toLowerCase());
  }

  function currentUser() {
    const email = (session && session.user && session.user.email) || (pendingUser && pendingUser.email) || null;
    if (!email) return null;

    const override = readProfileOverride(email) || {};
    const metadata = (session && session.user && session.user.user_metadata) || {};

    return {
      id: (session && session.user && session.user.id) || email,
      email,
      name: override.name || (pendingUser && pendingUser.name) || metadata.name || email,
      avatarUrl: override.avatarUrl || (pendingUser && pendingUser.avatarUrl) || metadata.avatar_url,
      role: isAdminEmail(email) ? "admin" : "client",
    };
  }

  function notify() {
    listeners.forEach((fn) => fn(currentUser()));
  }

  function login(userData) {
    pendingUser = { email: userData.email, name: userData.name, avatarUrl: userData.avatarUrl };
    notify();
  }

  async function logout() {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    pendingUser = null;
    notify();
  }

  function updateProfile(partial) {
    const email = (session && session.user && session.user.email) || (pendingUser && pendingUser.email);
    if (!email) return;
    const merged = { ...readProfileOverride(email), ...partial };
    try {
      localStorage.setItem(profileOverrideKey(email), JSON.stringify(merged));
    } catch {
      // localStorage cheio/indisponível — override só vale nesta sessão de memória
    }
    notify();
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  async function init() {
    if (!window.supabaseClient) return;
    const { data } = await window.supabaseClient.auth.getSession();
    session = data.session;
    notify();

    window.supabaseClient.auth.onAuthStateChange((_event, next) => {
      session = next;
      if (next) pendingUser = null;
      notify();
    });
  }

  if (window.supabaseClient) {
    init();
  } else {
    document.addEventListener("app-config-ready", init, { once: true });
  }

  window.AppAuth = { getUser: currentUser, login, logout, updateProfile, onChange, isAdminEmail };
})();

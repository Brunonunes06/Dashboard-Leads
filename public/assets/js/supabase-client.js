// Cria o client do Supabase a partir de /config.js (window.__APP_CONFIG__).
// Depende do supabase-js UMD já carregado via <script> no <head> da página.
// Mesma convenção de src/lib/supabase.ts, mas sem lançar em import — se a
// config não estiver pronta ainda, window.supabaseClient fica null e quem
// usar deve aguardar o evento "app-config-ready".
(function () {
  function init() {
    const config = window.__APP_CONFIG__;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
      console.error("[Supabase] /config.js não retornou supabaseUrl/supabaseAnonKey.");
      return;
    }
    window.supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    document.dispatchEvent(new CustomEvent("app-config-ready"));
  }

  if (window.__APP_CONFIG__) {
    init();
  } else {
    // /config.js é carregado como <script> normal antes deste arquivo; se por
    // algum motivo ainda não rodou, tenta de novo no próximo tick.
    document.addEventListener("DOMContentLoaded", init);
  }
})();

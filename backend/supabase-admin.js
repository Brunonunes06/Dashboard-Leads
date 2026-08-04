const { createClient } = require("@supabase/supabase-js");

// Client com a service role (ignora RLS) — nunca deve ser exposto ao
// navegador. Mesma lógica de src/lib/ip-guard.server.ts::getServiceClient,
// com fallback pras variáveis VITE_ já existentes no .env da raiz (esse
// servidor Express lê o mesmo .env do app Vite, via dotenv.config() sem path
// explícito = carrega o .env do diretório de onde `npm run server` é rodado).
let client = null;

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

module.exports = { getServiceClient };

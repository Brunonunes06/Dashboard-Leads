const { Router } = require("express");
const { randomUUID } = require("crypto");
const { checkRateLimit, getClientIp } = require("./rate-limit");
const { verifySupabaseAccessToken } = require("./verify-supabase-token");
const { getServiceClient } = require("./supabase-admin");

const router = Router();

// LGPD Art. 18, VI — direito à eliminação dos dados. Registra o pedido em vez
// de apagar na hora — porta fiel de src/lib/lgpd.functions.ts. Um admin
// revisa e processa a exclusão de verdade depois.
router.post("/api/lgpd/delete-request", async (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, "lgpd.delete", { windowMs: 60_000, max: 5 });
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: rateLimit.message });
  }

  const accessToken = req.body && req.body.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    return res.status(400).json({ success: false, error: "Token de acesso é obrigatório." });
  }

  const user = await verifySupabaseAccessToken(accessToken);
  if (!user) {
    return res.status(401).json({ success: false, error: "Sessão inválida ou expirada. Faça login novamente." });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[LGPD] SUPABASE_SERVICE_ROLE_KEY não configurada — não é possível registrar o pedido.");
    return res.status(500).json({ success: false, error: "Não foi possível registrar o pedido. Tente novamente." });
  }

  // id explícito: o mesmo problema encontrado em "messages" (o DEFAULT
  // gen_random_uuid() do schema não está de fato ativo no banco ao vivo)
  // pode valer aqui também — gerar no servidor evita depender disso.
  const { error } = await supabase.from("deletion_requests").insert({
    id: randomUUID(),
    user_id: user.id,
    email: user.email || "",
  });

  if (error) {
    console.error("[LGPD] Erro ao registrar pedido de exclusão:", error.message);
    return res.status(500).json({ success: false, error: "Não foi possível registrar o pedido. Tente novamente." });
  }

  return res.json({ success: true });
});

module.exports = router;

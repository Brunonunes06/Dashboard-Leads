import { createClient } from "@supabase/supabase-js";

// Server-only. Uses the Supabase service role key (bypasses RLS) so this
// works on Cloudflare Workers, where there is no writable/persistent
// filesystem for the previous node:fs-based store.
function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getClientIpFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const rawIp = forwardedFor ? forwardedFor.split(",")[0] : "";
  return rawIp.trim().replace(/^::ffff:/, "") || "unknown";
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

// Usa a API do proxycheck.io para detectar VPN/proxy. Funciona sem chave (limite
// baixo, menos precisa); se PROXYCHECK_API_KEY estiver configurada no .env, usa a
// chave automaticamente para uma detecao mais confiavel.
// Em caso de falha ou indisponibilidade do servico, nao bloqueia o login (fail-open).
async function isVpnOrProxyIp(ip: string): Promise<boolean> {
  if (isPrivateOrLocalIp(ip)) return false;

  try {
    const apiKey = process.env.PROXYCHECK_API_KEY;
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=0${keyParam}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;

    const data = await response.json();
    const info = data && data[ip];
    return Boolean(info && info.proxy === "yes");
  } catch (error) {
    console.error("[Auth] Erro ao consultar proxycheck.io:", (error as Error).message);
    return false;
  }
}

export type IpGuardResult =
  | { allowed: true }
  | { allowed: false; code: "VPN_DETECTED" | "IP_ACCOUNT_LIMIT_REACHED"; message: string };

export async function checkAndRegisterAccountForIp(
  request: Request,
  email: string,
  name: string,
): Promise<IpGuardResult> {
  const ip = getClientIpFromRequest(request);

  if (await isVpnOrProxyIp(ip)) {
    return {
      allowed: false,
      code: "VPN_DETECTED",
      message: "Desligue a VPN para acessar o site.",
    };
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error(
      "[Auth] SUPABASE_SERVICE_ROLE_KEY nao configurada — limite de conta por IP desativado (fail-open).",
    );
    return { allowed: true };
  }

  const { data: existing, error: readError } = await supabase
    .from("ip_account_guard")
    .select("email, name, created_at")
    .eq("ip", ip)
    .maybeSingle();

  if (readError) {
    console.error("[Auth] Erro ao ler limitador de IP:", readError.message);
    return { allowed: true };
  }

  if (existing && existing.email !== email) {
    return {
      allowed: false,
      code: "IP_ACCOUNT_LIMIT_REACHED",
      message: "Este IP ja possui uma conta cadastrada.",
    };
  }

  const { error: writeError } = await supabase.from("ip_account_guard").upsert({
    ip,
    email,
    name: name || existing?.name || "",
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (writeError) {
    console.error("[Auth] Erro ao gravar limitador de IP:", writeError.message);
  }

  return { allowed: true };
}

import { getClientIpFromRequest } from "./ip-guard.server";

const hits = new Map<string, { start: number; count: number }>();

export type RateLimitResult = { allowed: true } | { allowed: false; message: string };

export function checkRateLimit(
  request: Request | null,
  bucket: string,
  { windowMs, max }: { windowMs: number; max: number },
): RateLimitResult {
  const ip = request ? getClientIpFromRequest(request) : "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return { allowed: false, message: "Muitas requisições. Tente novamente em instantes." };
  }

  entry.count += 1;
  return { allowed: true };
}

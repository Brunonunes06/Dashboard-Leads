-- ============================================================
-- IP ACCOUNT GUARD TABLE
-- Run this in Supabase SQL Editor
-- Replaces the local-file-based IP/VPN login guard (src/lib/ip-guard.server.ts),
-- which used node:fs and does not persist on Cloudflare Workers (no writable
-- filesystem in production).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ip_account_guard (
  ip          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security is enabled with NO policies for anon/authenticated roles.
-- Only the service_role key (which bypasses RLS) can read/write this table —
-- the anon/publishable key used by the browser has zero access to it.
-- This table is only ever touched from the server function in
-- src/lib/ip-guard.server.ts, using SUPABASE_SERVICE_ROLE_KEY.
ALTER TABLE public.ip_account_guard ENABLE ROW LEVEL SECURITY;

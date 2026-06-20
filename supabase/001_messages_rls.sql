-- ============================================================
-- MESSAGES TABLE + RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure the messages table has the right shape
-- (Skip CREATE TABLE if you already have it — just add missing columns)

CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL,                  -- auth.uid() of sender
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'client')),
  content     TEXT NOT NULL,
  read_at     TIMESTAMPTZ,                    -- null = unread
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-lead queries
CREATE INDEX IF NOT EXISTS messages_lead_id_idx ON public.messages(lead_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- 2. Enable Realtime for this table (once per table)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- In Supabase dashboard: Database → Replication → Enable "messages"
-- OR via SQL (Supabase manages this automatically when you enable it in the dashboard)

-- 3. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Admins can read ALL messages
CREATE POLICY "admins_read_all_messages"
  ON public.messages FOR SELECT
  USING (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );

-- Clients can only read messages belonging to THEIR lead
CREATE POLICY "clients_read_own_messages"
  ON public.messages FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE user_id = auth.uid()
    )
  );

-- Admins can insert (respond to any lead)
CREATE POLICY "admins_insert_messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    AND sender_role = 'admin'
    AND sender_id = auth.uid()
  );

-- Clients can only insert into their own lead conversation
CREATE POLICY "clients_insert_own_messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads WHERE user_id = auth.uid()
    )
    AND sender_role = 'client'
    AND sender_id = auth.uid()
  );

-- Admins can mark messages as read (UPDATE read_at)
CREATE POLICY "admins_update_read_at"
  ON public.messages FOR UPDATE
  USING (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  )
  WITH CHECK (true);

-- Clients can mark their received messages as read
CREATE POLICY "clients_update_read_at"
  ON public.messages FOR UPDATE
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- ============================================================
-- SET ADMIN EMAILS in Supabase (one-time setup)
-- In: Dashboard → Settings → Database → Configuration
-- Add to "pg_config" or use a Postgres function:
-- ============================================================

-- Option A: Set via ALTER SYSTEM (requires superuser)
-- ALTER SYSTEM SET app.admin_emails TO 'admin@yoursite.com,admin2@yoursite.com';

-- Option B (simpler): Replace the email check with a roles table
-- CREATE TABLE public.user_roles (user_id UUID PRIMARY KEY, role TEXT);
-- INSERT INTO public.user_roles VALUES ('<admin-user-id>', 'admin');
-- Then in RLS: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')

-- ============================================================
-- Enable Realtime broadcast on the table
-- Dashboard → Database → Replication → toggle "messages" ON
-- ============================================================

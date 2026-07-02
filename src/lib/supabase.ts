// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://mevgojuczobxkupvluch.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmdvanVjem9ieGt1cHZsdWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzEwMjksImV4cCI6MjA5NjcwNzAyOX0.f-xzmhDrjM_rbqojD7L7P7DLbgoF6p-YFNxPJ9Juaes";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

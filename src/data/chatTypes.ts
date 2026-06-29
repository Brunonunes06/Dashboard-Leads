// src/data/chatTypes.ts

export type SenderRole = "admin" | "client";

export interface RealtimeMessage {
  id: string;
  lead_id: string;

  sender_id: string;
  sender_role: SenderRole;

  content: string;

  created_at: string;
  read_at: string | null;
}

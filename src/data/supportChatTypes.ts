// src/data/supportChatTypes.ts

export type SupportSenderRole = "client" | "admin" | "bot";

export interface SupportMessage {
  id: string;
  user_id: string;

  sender_id: string;
  sender_role: SupportSenderRole;

  content: string;

  created_at: string;
  read_at: string | null;
}

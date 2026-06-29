"use client";

import { ChatWindow } from "@/components/ChatWindow";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import type { Lead } from "@/types/chat";

interface ClientChatPageProps {
  lead: Lead; // The lead record linked to this user
  userId: string; // The authenticated user's ID
}

// Fetch lead on the server and pass as prop (see server wrapper below)
export default function ClientChatPage({ lead, userId }: ClientChatPageProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="client-layout">
      <header className="client-header">
        <div className="client-header-brand">
          <span className="client-header-title">Suporte</span>
        </div>
        <button className="sign-out-btn" onClick={handleSignOut} title="Sair">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      <div className="client-chat-container">
        <ChatWindow lead={lead} currentUserId={userId} currentRole="client" />
      </div>
    </div>
  );
}

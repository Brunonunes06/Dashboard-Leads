import { supabase } from "@/lib/supabase"

export async function setTyping(
  leadId: string,
  userId: string
) {
  await supabase
    .from("typing_status")
    .upsert({
      lead_id: leadId,
      typing_user: userId,
      updated_at: new Date().toISOString()
    })
}
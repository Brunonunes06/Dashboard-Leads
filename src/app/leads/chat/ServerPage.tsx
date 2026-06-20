// app/leads/chat/ServerPage.tsx  (or keep as page.tsx if using App Router server components)
// This is the SERVER COMPONENT that gates access and fetches data

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ClientChatPage from './page'   // the client component above

export default async function LeadsChatServerPage() {
  const supabase = createServerComponentClient({ cookies })

  // 1. Auth guard
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // 2. Fetch the lead linked to this user
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, name, email, user_id, created_at')
    .eq('user_id', session.user.id)
    .single()

  if (error || !lead) {
    // No lead record — could redirect to onboarding or show error
    redirect('/onboarding')
  }

  return <ClientChatPage lead={lead} userId={session.user.id} />
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { origin } = new URL(request.url)
  if (!user) return NextResponse.redirect(`${origin}/auth/login?next=/events/${params.id}`, 303)

  await supabase.from('registrations').upsert({
    event_id: params.id, user_id: user.id,
  }, { onConflict: 'event_id,user_id' })

  return NextResponse.redirect(`${origin}/events/${params.id}`, 303)
}

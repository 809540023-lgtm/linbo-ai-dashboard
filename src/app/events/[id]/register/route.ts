// 處理報名表單提交
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { origin } = new URL(req.url)
  if (!user) return NextResponse.redirect(`${origin}/auth/login?next=/events/${params.id}`, 303)

  const form = await req.formData()
  const referrer_name = String(form.get('referrer_name') || '').trim()
  const referrer_relation = String(form.get('referrer_relation') || '').trim() || null
  const attendee_phone = String(form.get('attendee_phone') || '').trim() || null
  const notes = String(form.get('notes') || '').trim() || null

  if (!referrer_name) {
    return NextResponse.redirect(`${origin}/events/${params.id}?error=missing_referrer`, 303)
  }

  // 檢查名額
  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('max_attendees').eq('id', params.id).single()
  if (event?.max_attendees) {
    const { count } = await admin.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id)
    if ((count || 0) >= event.max_attendees) {
      return NextResponse.redirect(`${origin}/events/${params.id}?error=full`, 303)
    }
  }

  await admin.from('registrations').upsert({
    event_id: params.id,
    user_id: user.id,
    referrer_name,
    referrer_relation,
    attendee_phone,
    notes,
  }, { onConflict: 'event_id,user_id' })

  return NextResponse.redirect(`${origin}/events/${params.id}?success=1`, 303)
}

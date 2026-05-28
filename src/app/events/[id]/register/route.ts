// 處理報名表單提交（含票種 + LINE ID）
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendRegistrationConfirmation } from '@/lib/email'
import { NextResponse } from 'next/server'

function getPublicOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const origin = getPublicOrigin(req)
  if (!user) return NextResponse.redirect(`${origin}/auth/login?next=/events/${params.id}`, 303)

  const form = await req.formData()
  const ticket_type = String(form.get('ticket_type') || 'onsite').trim()
  const referrer_name = String(form.get('referrer_name') || '').trim()
  const referrer_relation = String(form.get('referrer_relation') || '').trim() || null
  const attendee_phone = String(form.get('attendee_phone') || '').trim() || null
  const line_id = String(form.get('line_id') || '').trim() || null
  const notes = String(form.get('notes') || '').trim() || null

  if (!referrer_name) {
    return NextResponse.redirect(`${origin}/events/${params.id}?error=missing_referrer`, 303)
  }
  if (!['onsite', 'online'].includes(ticket_type)) {
    return NextResponse.redirect(`${origin}/events/${params.id}?error=invalid_ticket`, 303)
  }

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('title, start_at, location, max_attendees')
    .eq('id', params.id)
    .single()
  if (event?.max_attendees) {
    const { count } = await admin.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id)
    if ((count || 0) >= event.max_attendees) {
      return NextResponse.redirect(`${origin}/events/${params.id}?error=full`, 303)
    }
  }

  let price_quoted = 600
  if (ticket_type === 'onsite') {
    const { count: onsiteN } = await admin.from('registrations')
      .select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('ticket_type', 'onsite')
    price_quoted = (onsiteN || 0) === 0 ? 1000 : Math.max(500, Math.min(1000, Math.round(20000 / Math.max((onsiteN || 0) + 1, 1))))
  }

  // 判斷是不是「新報名」（重複報名/編輯就不再寄確認信）
  const { data: existing } = await admin
    .from('registrations')
    .select('id')
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  const isNewRegistration = !existing

  await admin.from('registrations').upsert({
    event_id: params.id,
    user_id: user.id,
    ticket_type,
    price_quoted,
    paid: false,
    referrer_name,
    referrer_relation,
    attendee_phone,
    line_id,
    notes,
  }, { onConflict: 'event_id,user_id' })

  // 報名確認信（第一次報名才寄）— 失敗不擋報名流程
  if (isNewRegistration && user.email && event) {
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    try {
      await sendRegistrationConfirmation({
        toEmail: user.email,
        toName: profile?.display_name || null,
        eventTitle: event.title,
        eventStartAt: event.start_at,
        eventLocation: event.location,
        ticketType: ticket_type as 'onsite' | 'online',
        priceQuoted: price_quoted,
        referrerName: referrer_name,
        lineId: line_id,
        attendeePhone: attendee_phone,
        notes,
        eventUrl: `${origin}/events/${params.id}`,
      })
    } catch (e) {
      console.error('[register] confirmation email failed:', e)
    }
  }

  return NextResponse.redirect(`${origin}/events/${params.id}?success=1`, 303)
}

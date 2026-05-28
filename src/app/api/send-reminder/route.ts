// 活動前 3 日提醒信 cron
// 每天 09:00 由 Render Cron 帶 CRON_SECRET 觸發
// 邏輯：找出 start_at 落在 (now+48h, now+72h] 的活動，對每位報名者寄一封提醒
// 這個 24h 窗口確保每場活動恰好被觸發一次（cron 每天跑一次）
import { createAdminClient } from '@/lib/supabase/server'
import { sendEventReminder } from '@/lib/email'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSiteUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const siteUrl = getSiteUrl(req)
  const now = new Date()
  const lo = new Date(now.getTime() + 48 * 3600 * 1000)
  const hi = new Date(now.getTime() + 72 * 3600 * 1000)

  // 找出 48h < start_at - now <= 72h 的活動
  const { data: events, error: evErr } = await admin
    .from('events')
    .select('id, title, start_at, location, status')
    .gt('start_at', lo.toISOString())
    .lte('start_at', hi.toISOString())

  if (evErr) {
    console.error('[send-reminder] event query error:', evErr)
    return NextResponse.json({ error: 'event_query_failed', detail: evErr.message }, { status: 500 })
  }

  // 過濾掉 cancelled / 已過 / draft 等（'upcoming' 和 'live' 都算）
  const targets = (events || []).filter(
    e => !e.status || e.status === 'upcoming' || e.status === 'live'
  )

  let sent = 0
  let failed = 0
  const perEvent: Array<{ eventId: string; title: string; sent: number; failed: number }> = []

  for (const ev of targets) {
    const { data: regs } = await admin
      .from('registrations')
      .select('user_id, ticket_type')
      .eq('event_id', ev.id)

    let evSent = 0
    let evFailed = 0
    for (const reg of regs || []) {
      try {
        const { data: userResp } = await admin.auth.admin.getUserById(reg.user_id)
        const email = userResp?.user?.email
        if (!email) {
          evFailed++
          continue
        }
        const { data: profile } = await admin
          .from('profiles')
          .select('display_name')
          .eq('id', reg.user_id)
          .maybeSingle()

        const result = await sendEventReminder({
          toEmail: email,
          toName: profile?.display_name || null,
          eventTitle: ev.title,
          eventStartAt: ev.start_at,
          eventLocation: ev.location,
          ticketType: (reg.ticket_type as 'onsite' | 'online') || 'onsite',
          daysUntil: 3,
          eventUrl: `${siteUrl}/events/${ev.id}`,
        })
        if (result.ok) evSent++
        else evFailed++
      } catch (e) {
        console.error('[send-reminder] per-reg error:', e)
        evFailed++
      }
    }
    sent += evSent
    failed += evFailed
    perEvent.push({ eventId: ev.id, title: ev.title, sent: evSent, failed: evFailed })
  }

  return NextResponse.json({
    ok: true,
    windowLo: lo.toISOString(),
    windowHi: hi.toISOString(),
    eventCount: targets.length,
    sent,
    failed,
    perEvent,
  })
}

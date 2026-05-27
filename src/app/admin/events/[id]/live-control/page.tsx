// 活動現場控制面板：開始/結束、看即時統計、發佈公告、Mux 直播
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LiveControl from '@/components/live-control'

export default async function LiveControlPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('*').eq('id', params.id).single()
  if (!event) notFound()

  const [
    { count: totalMessages },
    { count: registeredCount },
    { count: rankingsCount },
  ] = await Promise.all([
    admin.from('messages').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
    admin.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
    admin.from('bearish_rankings').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
  ])

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin/events" className="text-sm text-zinc-500 hover:text-zinc-900">← 活動列表</Link>

      <header className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎙 現場控制</h1>
          <p className="mt-1 text-sm text-zinc-600">{event.title}</p>
          <p className="mt-1 text-xs text-zinc-500">{new Date(event.start_at).toLocaleString('zh-TW')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
          event.status === 'live' ? 'bg-red-100 text-red-700 animate-pulse' :
          event.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
          'bg-zinc-100 text-zinc-600'
        }`}>{event.status}</span>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="報名人數" value={registeredCount || 0} />
        <Stat label="累計訊息" value={totalMessages || 0} />
        <Stat label="浮現股票" value={rankingsCount || 0} />
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold">活動狀態切換</h2>
        <p className="mt-1 text-sm text-zinc-500">
          切到 <strong>live</strong> AI Agent 才會開始跑、Scout 才會抓資料；活動結束記得切 <strong>ended</strong>
        </p>
        <div className="mt-4 flex gap-3">
          <form action={`/api/events/${event.id}/status`} method="POST" className="flex-1">
            <input type="hidden" name="status" value="upcoming" />
            <button className={`w-full rounded-lg px-4 py-2.5 ${
              event.status === 'upcoming' ? 'bg-amber-600 text-white' : 'border border-zinc-300 hover:bg-zinc-50'
            }`}>upcoming</button>
          </form>
          <form action={`/api/events/${event.id}/status`} method="POST" className="flex-1">
            <input type="hidden" name="status" value="live" />
            <button className={`w-full rounded-lg px-4 py-2.5 ${
              event.status === 'live' ? 'bg-red-600 text-white' : 'border border-zinc-300 hover:bg-zinc-50'
            }`}>● live</button>
          </form>
          <form action={`/api/events/${event.id}/status`} method="POST" className="flex-1">
            <input type="hidden" name="status" value="ended" />
            <button className={`w-full rounded-lg px-4 py-2.5 ${
              event.status === 'ended' ? 'bg-zinc-700 text-white' : 'border border-zinc-300 hover:bg-zinc-50'
            }`}>ended</button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">📡 Mux 直播串流</h2>
        <LiveControl eventId={event.id} />
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4">
        <a href={`/big-screen/${event.id}`} target="_blank" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-amber-500">
          <h3 className="font-semibold">📺 大螢幕（投影用）</h3>
          <p className="mt-1 text-sm text-zinc-500">/big-screen/{event.id.slice(0,8)}...</p>
          <p className="mt-2 text-xs text-amber-600">→ 新分頁開啟</p>
        </a>
        <a href={`/host/${event.id}/control`} target="_blank" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-amber-500">
          <h3 className="font-semibold">🎙 林博主控台</h3>
          <p className="mt-1 text-sm text-zinc-500">三欄黑色介面，林博現場用</p>
          <p className="mt-2 text-xs text-amber-600">→ 新分頁開啟</p>
        </a>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold">活動結束後</h2>
        <p className="mt-1 text-sm text-zinc-500">手動觸發產生會員個人化報告</p>
        <form action={`/api/generate-report?eventId=${event.id}`} method="POST" className="mt-3">
          <button className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            為所有貢獻者產生 AI 報告
          </button>
        </form>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  )
}

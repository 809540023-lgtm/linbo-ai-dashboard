import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single()
  if (!event) return <main className="p-12">找不到此活動</main>

  const { data: reg } = user
    ? await supabase.from('registrations').select('id').eq('event_id', params.id).eq('user_id', user.id).maybeSingle()
    : { data: null }

  const isRegistered = !!reg
  const stocks = (event.watchlist_stocks as { code: string; name: string }[]) || []

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/events" className="text-sm text-zinc-500 hover:text-zinc-900">← 所有場次</Link>

      <h1 className="mt-4 text-3xl font-bold">{event.title}</h1>
      <p className="mt-2 text-zinc-700">{event.description}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-xs font-medium text-zinc-500">開始時間</h3>
          <p className="mt-1">{new Date(event.start_at).toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short' })}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-xs font-medium text-zinc-500">狀態</h3>
          <p className="mt-1">{event.status}</p>
        </div>
      </div>

      {stocks.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">今日鎖定的熱門股</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {stocks.map(s => (
              <span key={s.code} className="rounded-full bg-zinc-100 px-3 py-1 text-sm">
                {s.name}（{s.code}）
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 rounded-xl border border-amber-300 bg-amber-50 p-5">
        {!user ? (
          <Link href={`/auth/login?next=/events/${params.id}`} className="block rounded-lg bg-zinc-900 px-4 py-3 text-center font-medium text-white">
            登入後報名
          </Link>
        ) : isRegistered ? (
          <Link href={`/events/${params.id}/live`} className="block rounded-lg bg-amber-600 px-4 py-3 text-center font-medium text-white">
            進入直播間 →
          </Link>
        ) : (
          <form action={`/events/${params.id}/register`} method="POST">
            <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white">立即報名（免費）</button>
          </form>
        )}
      </div>
    </main>
  )
}

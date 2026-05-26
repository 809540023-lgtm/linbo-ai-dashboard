import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'upcoming')
    .order('start_at', { ascending: true })
    .limit(3)

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-6">
        <p className="text-sm font-medium text-amber-600">AI 台股智慧座談會</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          林博的獨立思維<br />
          <span className="text-amber-600">尋找最快掉落的那顆星星</span>
        </h1>
        <p className="text-lg leading-relaxed text-zinc-700">
          台股高檔時，我們不追逐最會漲的股票；而是運用 AI 與獨立判斷，揪出最可能快速轉弱的標的。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/auth/login" className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800">
            立即報名
          </Link>
          <Link href="/demo" className="rounded-lg bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600">
            🎬 看離線示範
          </Link>
          <Link href="#about" className="rounded-lg border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-100">
            了解更多
          </Link>
        </div>
      </div>

      {events && events.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">近期場次</h2>
          <div className="space-y-3">
            {events.map(e => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 hover:border-amber-500"
              >
                <h3 className="font-medium">{e.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {new Date(e.start_at).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="about" className="mt-16 space-y-4 text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">這場座談會的不同</h2>
        <p>
          當市場越熱，越多人只想問哪一檔會漲。但林博的獨立思維，看的不是那場最亮的煙火，而是那顆最可能、最快掉落的星星。
        </p>
        <p>
          全場與會者透過手機即時提供觀察，AI 同時做兩件事：把訊息匯流給林博，並分析計算出每檔股票的下跌機率排行。這不是預測，而是群體智慧 + AI 計算 + 林博獨立判斷的三方共識。
        </p>
      </section>
    </main>
  )
}

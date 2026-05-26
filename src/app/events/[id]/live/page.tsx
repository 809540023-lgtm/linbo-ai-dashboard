'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import { createClient } from '@/lib/supabase/client'

type Stock = { code: string; name: string }
type Message = { id: number; stock_code: string; category: string; content: string; created_at: string }
type Ranking = { stock_code: string; stock_name: string; bearish_score: number; reasons: string[]; message_count: number }

export default function LivePage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [event, setEvent] = useState<any>(null)
  const [stock, setStock] = useState<string>('')
  const [category, setCategory] = useState<string>('chip')
  const [content, setContent] = useState('')
  const [myMessages, setMyMessages] = useState<Message[]>([])
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [sending, setSending] = useState(false)

  // 載入活動
  useEffect(() => {
    supabase.from('events').select('*').eq('id', params.id).single()
      .then(({ data }) => {
        setEvent(data)
        if (data?.watchlist_stocks?.[0]) setStock(data.watchlist_stocks[0].code)
      })
  }, [params.id])

  // 載入自己過去的訊息
  useEffect(() => {
    supabase.from('messages')
      .select('*')
      .eq('event_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setMyMessages(data || []))
  }, [params.id])

  // 訂閱即時排行
  useEffect(() => {
    const fetchRankings = async () => {
      const { data } = await supabase.from('bearish_rankings')
        .select('*')
        .eq('event_id', params.id)
        .order('bearish_score', { ascending: false })
        .limit(5)
      setRankings(data || [])
    }
    fetchRankings()
    const channel = supabase
      .channel(`rankings-${params.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bearish_rankings',
        filter: `event_id=eq.${params.id}`,
      }, fetchRankings)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  async function submitMessage() {
    if (!content || !stock) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('請先登入'); setSending(false); return }
    const { data, error } = await supabase.from('messages').insert({
      event_id: params.id, user_id: user.id,
      stock_code: stock, category, content,
    }).select().single()
    setSending(false)
    if (error) { alert(error.message); return }
    setMyMessages(prev => [data, ...prev])
    setContent('')
  }

  if (!event) return <main className="p-8">載入中...</main>

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{event.title}</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左：直播 */}
        <div className="lg:col-span-2">
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            {process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID ? (
              <MuxPlayer
                streamType="live"
                playbackId={process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID}
                metadata={{ video_title: event.title }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                直播尚未開始
              </div>
            )}
          </div>

          {/* AI 排行榜 */}
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">📉 AI 下跌機率排行（即時）</h2>
            {rankings.length === 0 ? (
              <p className="text-sm text-zinc-500">尚無資料 — 大家開始留言後 60 秒會更新</p>
            ) : (
              <ol className="space-y-2">
                {rankings.map((r, i) => (
                  <li key={r.stock_code} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold">#{i + 1}</span>{' '}
                        <span className="font-medium">{r.stock_name}</span>{' '}
                        <span className="text-sm text-zinc-500">{r.stock_code}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">{Math.round(r.bearish_score)}</div>
                        <div className="text-xs text-zinc-500">{r.message_count} 則觀察</div>
                      </div>
                    </div>
                    {r.reasons && r.reasons.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                        {r.reasons.slice(0, 3).map((reason, j) => (
                          <li key={j}>• {reason}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* 右：互動留言 */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">💬 提交您的觀察</h2>
            <div className="space-y-3">
              <select
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                {event.watchlist_stocks?.map((s: Stock) => (
                  <option key={s.code} value={s.code}>{s.name}（{s.code}）</option>
                ))}
              </select>

              <div className="flex gap-2 text-sm">
                {[
                  { v: 'chip', l: '籌碼' },
                  { v: 'tech', l: '技術' },
                  { v: 'news', l: '消息' },
                  { v: 'industry', l: '產業' },
                ].map(c => (
                  <button
                    key={c.v}
                    onClick={() => setCategory(c.v)}
                    className={`flex-1 rounded-md px-2 py-1.5 ${category === c.v ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}
                  >{c.l}</button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="例如：外資連 5 日賣超超過 8000 張，且跌破 60 日線..."
                maxLength={200}
                rows={3}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="text-right text-xs text-zinc-500">{content.length}/200</div>

              <button
                onClick={submitMessage}
                disabled={sending || !content}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {sending ? '送出中...' : '送出觀察'}
              </button>
            </div>
          </div>

          {/* 我的訊息 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700">我送出的觀察</h3>
            <ul className="space-y-2 text-sm">
              {myMessages.length === 0 && <li className="text-zinc-500">尚未送出</li>}
              {myMessages.map(m => (
                <li key={m.id} className="rounded bg-zinc-50 p-2">
                  <div className="text-xs text-zinc-500">
                    {m.stock_code} · {m.category} ·{' '}
                    {new Date(m.created_at).toLocaleTimeString('zh-TW')}
                  </div>
                  <div>{m.content}</div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}

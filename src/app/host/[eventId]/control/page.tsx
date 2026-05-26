'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 林博主控台：看 AI 匯流摘要 + 即時排行 + 原始訊息流
export default function HostControlPage() {
  const params = useParams<{ eventId: string }>()
  const supabase = createClient()
  const [summaries, setSummaries] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])

  // 最新摘要
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('ai_summaries')
        .select('*')
        .eq('event_id', params.eventId)
        .order('created_at', { ascending: false })
        .limit(1)
      setSummaries(data || [])
    }
    fetch()
    const ch = supabase.channel(`summaries-${params.eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_summaries', filter: `event_id=eq.${params.eventId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [params.eventId])

  // 排行
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('bearish_rankings')
        .select('*')
        .eq('event_id', params.eventId)
        .order('bearish_score', { ascending: false })
      setRankings(data || [])
    }
    fetch()
    const ch = supabase.channel(`hc-rankings-${params.eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bearish_rankings', filter: `event_id=eq.${params.eventId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [params.eventId])

  // 原始訊息流
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('event_id', params.eventId)
        .order('created_at', { ascending: false })
        .limit(30)
      setRecentMessages(data || [])
    }
    fetch()
    const ch = supabase.channel(`hc-msgs-${params.eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${params.eventId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [params.eventId])

  const latest = summaries[0]

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎙 林博主控台</h1>
        <div className="text-sm text-zinc-400">
          Event ID: {params.eventId}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 左欄：AI 匯流摘要 */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold">🤖 AI 匯流摘要（每 30 秒）</h2>
          {!latest ? (
            <p className="text-zinc-500">尚無摘要</p>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-zinc-500">
                更新於 {new Date(latest.created_at).toLocaleTimeString('zh-TW')}
              </div>
              {latest.highlights?.map((h: any, i: number) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <div className="flex items-center justify-between">
                    <strong>{h.stock_name}（{h.stock_code}）</strong>
                    <span className="text-xs text-amber-400">{h.msg_count} 則</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {h.key_points?.map((p: string, j: number) => (
                      <li key={j}>• {p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 中欄：排行榜 */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold">📉 下跌機率排行</h2>
          <ol className="space-y-2">
            {rankings.map((r, i) => (
              <li key={r.stock_code} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">#{i + 1} {r.stock_name}</span>
                    <span className="ml-2 text-xs text-zinc-500">{r.stock_code}</span>
                  </div>
                  <div className="text-xl font-bold text-red-400">{Math.round(r.bearish_score)}</div>
                </div>
                {r.reasons?.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-zinc-300">
                    {r.reasons.slice(0, 2).map((reason: string, j: number) => (
                      <li key={j}>• {reason}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* 右欄：原始訊息流 */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold">💬 原始訊息流</h2>
          <ul className="space-y-2 max-h-[80vh] overflow-y-auto">
            {recentMessages.map(m => (
              <li key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm">
                <div className="text-xs text-zinc-500">
                  {m.stock_code} · {m.category} · {new Date(m.created_at).toLocaleTimeString('zh-TW')}
                </div>
                <div>{m.content}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

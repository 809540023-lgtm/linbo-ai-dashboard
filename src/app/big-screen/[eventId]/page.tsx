'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 大螢幕模式：投影在會場用
export default function BigScreenPage() {
  const params = useParams<{ eventId: string }>()
  const supabase = createClient()
  const [rankings, setRankings] = useState<any[]>([])
  const [stats, setStats] = useState({ messageCount: 0, stockCount: 0 })

  useEffect(() => {
    const fetch = async () => {
      const { data: rks } = await supabase.from('bearish_rankings')
        .select('*')
        .eq('event_id', params.eventId)
        .order('bearish_score', { ascending: false })
        .limit(5)
      setRankings(rks || [])

      const { count: msgs } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', params.eventId)
      setStats(s => ({ ...s, messageCount: msgs || 0, stockCount: rks?.length || 0 }))
    }
    fetch()
    const ch = supabase.channel(`bs-${params.eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bearish_rankings', filter: `event_id=eq.${params.eventId}` }, fetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${params.eventId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [params.eventId])

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-red-950 to-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-12 py-10">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm text-amber-400">林博的獨立思維</p>
            <h1 className="mt-1 text-5xl font-bold">尋找最快掉落的那顆星星</h1>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-zinc-400">即時觀察數</div>
            <div className="text-4xl font-bold text-amber-400">{stats.messageCount}</div>
          </div>
        </header>

        <ol className="space-y-4">
          {rankings.map((r, i) => (
            <li
              key={r.stock_code}
              className="flex items-center gap-6 rounded-2xl border border-red-900/50 bg-black/40 px-8 py-6 backdrop-blur"
            >
              <div className="text-7xl font-bold text-zinc-700">#{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold">{r.stock_name}</span>
                  <span className="text-lg text-zinc-400">{r.stock_code}</span>
                </div>
                {r.reasons?.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-base text-zinc-300">
                    {r.reasons.slice(0, 3).map((reason: string, j: number) => (
                      <li key={j}>• {reason}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">下跌機率</div>
                <div className="text-6xl font-bold text-red-400">{Math.round(r.bearish_score)}</div>
                <div className="mt-1 text-xs text-zinc-500">{r.message_count} 則觀察</div>
              </div>
            </li>
          ))}
        </ol>

        {rankings.length === 0 && (
          <div className="mt-20 text-center text-2xl text-zinc-500">
            等待學員開始提供觀察...
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-zinc-600">
          本平台所有內容僅供教學交流參考，不構成任何投資建議
        </footer>
      </div>
    </main>
  )
}

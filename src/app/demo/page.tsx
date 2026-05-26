'use client'
// 離線示範模式：不需要任何外部服務，用 mock 資料完整展示流程
// 適合在沒設定 Supabase / Mux / Anthropic 時，先看到產品長什麼樣
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const STOCKS = [
  { code: '2330', name: '台積電' },
  { code: '2454', name: '聯發科' },
  { code: '3008', name: '大立光' },
  { code: '2308', name: '台達電' },
  { code: '2382', name: '廣達' },
  { code: '3231', name: '緯創' },
  { code: '2603', name: '長榮' },
]

const SAMPLE_MSGS = [
  { stock: '2330', cat: 'chip', text: '外資連 5 日賣超 8000 張' },
  { stock: '2454', cat: 'tech', text: 'ADR 隔夜 -2.1%，跌破 60 日線' },
  { stock: '3008', cat: 'news', text: 'iPhone 出貨下修，蘋概股拉警報' },
  { stock: '2330', cat: 'tech', text: '量價背離，今日大量未跟漲' },
  { stock: '2382', cat: 'industry', text: 'AI 伺服器拉貨力道趨緩' },
  { stock: '3231', cat: 'chip', text: '投信連續 3 日減碼' },
  { stock: '2454', cat: 'news', text: '聯發科法說保守，毛利率壓力' },
  { stock: '2603', cat: 'industry', text: '運價指數連跌 4 週' },
  { stock: '2330', cat: 'news', text: '費半收黑超過 1.5%' },
  { stock: '3008', cat: 'chip', text: '主力今日大幅出貨' },
]

type Msg = { id: number; stock: string; cat: string; text: string; ts: number }
type Ranking = { code: string; name: string; score: number; reasons: string[]; count: number }

export default function DemoPage() {
  const [view, setView] = useState<'student' | 'host' | 'screen'>('student')
  const [messages, setMessages] = useState<Msg[]>([])
  const [autoMode, setAutoMode] = useState(true)
  const [stock, setStock] = useState('2330')
  const [cat, setCat] = useState('chip')
  const [content, setContent] = useState('')

  // 自動模擬學員傳訊息
  useEffect(() => {
    if (!autoMode) return
    let i = 0
    const timer = setInterval(() => {
      const sample = SAMPLE_MSGS[i % SAMPLE_MSGS.length]
      i++
      setMessages(prev => [{
        id: Date.now() + Math.random(),
        stock: sample.stock,
        cat: sample.cat,
        text: sample.text,
        ts: Date.now(),
      }, ...prev].slice(0, 50))
    }, 2500)
    return () => clearInterval(timer)
  }, [autoMode])

  // 計算 mock 排行（模擬 AI Agent B）
  const rankings = useMemo<Ranking[]>(() => {
    const map = new Map<string, { msgs: string[]; count: number }>()
    messages.forEach(m => {
      const cur = map.get(m.stock) || { msgs: [], count: 0 }
      cur.msgs.push(m.text)
      cur.count++
      map.set(m.stock, cur)
    })
    return Array.from(map.entries())
      .map(([code, { msgs, count }]) => {
        const stockMeta = STOCKS.find(s => s.code === code)
        const score = Math.min(95, 35 + count * 7 + Math.random() * 10)
        return {
          code,
          name: stockMeta?.name || code,
          score: Math.round(score),
          reasons: Array.from(new Set(msgs)).slice(0, 3),
          count,
        }
      })
      .sort((a, b) => b.score - a.score)
  }, [messages])

  // 計算 mock 摘要（模擬 AI Agent A）
  const summary = useMemo(() => {
    const map = new Map<string, string[]>()
    messages.slice(0, 20).forEach(m => {
      const stockMeta = STOCKS.find(s => s.code === m.stock)
      const key = `${m.stock}|${stockMeta?.name || m.stock}`
      const arr = map.get(key) || []
      if (!arr.includes(m.text)) arr.push(m.text)
      map.set(key, arr.slice(0, 3))
    })
    return Array.from(map.entries()).map(([key, points]) => {
      const [code, name] = key.split('|')
      return { code, name, points, count: messages.filter(m => m.stock === code).length }
    })
  }, [messages])

  function submitManual() {
    if (!content) return
    setMessages(prev => [{
      id: Date.now(),
      stock,
      cat,
      text: content,
      ts: Date.now(),
    }, ...prev])
    setContent('')
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← 回首頁</Link>
            <h1 className="text-lg font-bold">🎬 離線示範模式（不需要任何帳號）</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} />
              自動模擬學員留言
            </label>
            <button
              onClick={() => setMessages([])}
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
            >清空</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 px-6 pb-1 text-sm">
          {[
            { v: 'student', l: '👤 學員視角' },
            { v: 'host', l: '🎙 林博主控台' },
            { v: 'screen', l: '📺 大螢幕' },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setView(t.v as any)}
              className={`rounded-t-lg px-4 py-2 ${view === t.v ? 'bg-amber-500 text-white' : 'bg-zinc-100'}`}
            >{t.l}</button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {view === 'student' && <StudentView
          stocks={STOCKS}
          stock={stock} setStock={setStock}
          cat={cat} setCat={setCat}
          content={content} setContent={setContent}
          rankings={rankings.slice(0, 5)}
          myMessages={messages.slice(0, 10)}
          onSubmit={submitManual}
        />}
        {view === 'host' && <HostView summary={summary} rankings={rankings} messages={messages} />}
        {view === 'screen' && <ScreenView rankings={rankings.slice(0, 5)} total={messages.length} />}
      </div>
    </main>
  )
}

function StudentView({ stocks, stock, setStock, cat, setCat, content, setContent, rankings, myMessages, onSubmit }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-zinc-400">
          <div className="text-center">
            <div className="text-2xl">🎥 直播畫面</div>
            <div className="mt-2 text-sm">（這裡會嵌入 Mux 直播）</div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">📉 AI 下跌機率排行（即時更新）</h2>
          {rankings.length === 0 ? (
            <p className="text-zinc-500">開始留言後會出現排行</p>
          ) : (
            <ol className="space-y-2">
              {rankings.map((r: Ranking, i: number) => (
                <li key={r.code} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold">#{i + 1}</span>{' '}
                      <span className="font-medium">{r.name}</span>{' '}
                      <span className="text-sm text-zinc-500">{r.code}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">{r.score}</div>
                      <div className="text-xs text-zinc-500">{r.count} 則觀察</div>
                    </div>
                  </div>
                  {r.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                      {r.reasons.map((reason, j) => <li key={j}>• {reason}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">💬 提交您的觀察</h2>
          <div className="space-y-3">
            <select value={stock} onChange={e => setStock(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2">
              {stocks.map((s: any) => <option key={s.code} value={s.code}>{s.name}（{s.code}）</option>)}
            </select>
            <div className="flex gap-2 text-sm">
              {[{ v: 'chip', l: '籌碼' }, { v: 'tech', l: '技術' }, { v: 'news', l: '消息' }, { v: 'industry', l: '產業' }].map(c => (
                <button key={c.v} onClick={() => setCat(c.v)}
                  className={`flex-1 rounded-md px-2 py-1.5 ${cat === c.v ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}>
                  {c.l}
                </button>
              ))}
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="例：外資連 5 日賣超..." maxLength={200} rows={3}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <button onClick={onSubmit} disabled={!content}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white disabled:opacity-50">
              送出觀察
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function HostView({ summary, rankings, messages }: any) {
  return (
    <div className="rounded-xl bg-zinc-950 p-6 text-zinc-100">
      <div className="grid gap-4 lg:grid-cols-3">
        <section>
          <h2 className="mb-3 text-lg font-semibold">🤖 AI 匯流摘要</h2>
          {summary.length === 0 ? <p className="text-zinc-500">尚無摘要</p> :
            summary.map((s: any, i: number) => (
              <div key={i} className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between">
                  <strong>{s.name}（{s.code}）</strong>
                  <span className="text-xs text-amber-400">{s.count} 則</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {s.points.map((p: string, j: number) => <li key={j}>• {p}</li>)}
                </ul>
              </div>
            ))
          }
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">📉 下跌機率排行</h2>
          <ol className="space-y-2">
            {rankings.map((r: Ranking, i: number) => (
              <li key={r.code} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between">
                  <span><span className="font-bold">#{i + 1}</span> {r.name}</span>
                  <span className="text-xl font-bold text-red-400">{r.score}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">💬 原始訊息流</h2>
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
            {messages.map((m: Msg) => (
              <li key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm">
                <div className="text-xs text-zinc-500">{m.stock} · {m.cat}</div>
                <div>{m.text}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function ScreenView({ rankings, total }: any) {
  return (
    <div className="-mx-6 min-h-[80vh] bg-gradient-to-br from-zinc-950 via-red-950 to-zinc-950 px-12 py-10 text-white">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-sm text-amber-400">林博的獨立思維</p>
          <h1 className="mt-1 text-5xl font-bold">尋找最快掉落的那顆星星</h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-zinc-400">即時觀察數</div>
          <div className="text-4xl font-bold text-amber-400">{total}</div>
        </div>
      </header>

      <ol className="space-y-4">
        {rankings.map((r: Ranking, i: number) => (
          <li key={r.code} className="flex items-center gap-6 rounded-2xl border border-red-900/50 bg-black/40 px-8 py-6 backdrop-blur">
            <div className="text-7xl font-bold text-zinc-700">#{i + 1}</div>
            <div className="flex-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">{r.name}</span>
                <span className="text-lg text-zinc-400">{r.code}</span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-base text-zinc-300">
                {r.reasons.slice(0, 3).map((reason, j) => <li key={j}>• {reason}</li>)}
              </ul>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">下跌機率</div>
              <div className="text-6xl font-bold text-red-400">{r.score}</div>
              <div className="mt-1 text-xs text-zinc-500">{r.count} 則</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

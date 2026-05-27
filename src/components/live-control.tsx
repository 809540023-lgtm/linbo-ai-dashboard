'use client'
import { useEffect, useState } from 'react'

type StreamInfo = {
  exists: boolean
  stream_id?: string
  playback_id?: string
  stream_key?: string
  rtmp_url?: string
  status?: string
}

export default function LiveControl({ eventId }: { eventId: string }) {
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  async function refresh() {
    setLoading(true)
    const r = await fetch(`/api/events/${eventId}/livestream`)
    const j = await r.json()
    setInfo(j)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [eventId])

  async function createStream() {
    if (!confirm('確認建立新的 Mux 直播串流？')) return
    setWorking(true)
    const r = await fetch(`/api/events/${eventId}/livestream`, { method: 'POST' })
    const j = await r.json()
    setWorking(false)
    if (j.error) {
      alert('失敗：' + (j.detail || j.error))
      return
    }
    setInfo({ exists: true, ...j })
  }

  async function deleteStream() {
    if (!confirm('刪除目前串流？刪除後需重新建立。')) return
    setWorking(true)
    await fetch(`/api/events/${eventId}/livestream`, { method: 'DELETE' })
    setWorking(false)
    setInfo({ exists: false })
  }

  if (loading) return <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-500">載入中...</div>

  if (!info?.exists) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
        <h3 className="text-xl font-bold text-amber-900">📡 直播尚未建立</h3>
        <p className="mt-2 text-base text-amber-700">
          按下方按鈕建立 Mux 直播串流，會自動產生 RTMP URL + Stream Key 給 OBS 用。
        </p>
        <button
          onClick={createStream}
          disabled={working}
          className="mt-4 w-full rounded-xl bg-amber-600 px-6 py-4 text-xl font-bold text-white hover:bg-amber-700 disabled:bg-zinc-400"
        >
          {working ? '建立中...' : '🎬 建立 Mux 直播串流'}
        </button>
      </div>
    )
  }

  const statusColor = {
    idle: 'bg-zinc-100 text-zinc-700',
    active: 'bg-red-100 text-red-700 animate-pulse',
    disconnected: 'bg-amber-100 text-amber-700',
  }[info.status || 'idle'] || 'bg-zinc-100 text-zinc-700'

  return (
    <div className="space-y-4 rounded-xl border-2 border-green-300 bg-green-50 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-green-900">📡 Mux 直播已就緒</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}>
          {info.status === 'active' ? '🔴 直播中' : info.status === 'idle' ? '⚪ 待機' : info.status}
        </span>
      </div>

      <div className="space-y-3 rounded-lg bg-white p-4">
        <Field label="RTMP URL（OBS 用）" value={info.rtmp_url!} />
        <Field label="Stream Key（OBS 用 · 機密）" value={info.stream_key!} hidden={!showSecret} onToggle={() => setShowSecret(s => !s)} />
        <Field label="Playback ID（觀看用）" value={info.playback_id!} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <p className="font-semibold">🎬 OBS 設定步驟：</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>下載 <a href="https://obsproject.com/" target="_blank" className="underline">OBS Studio</a>（免費）</li>
          <li>OBS → Settings → Stream → Service: <strong>Custom</strong></li>
          <li>Server 貼上上面 RTMP URL</li>
          <li>Stream Key 貼上上面 Stream Key</li>
          <li>加 Media Source 接兩台小米攝影機的 RTSP</li>
          <li>按「Start Streaming」→ 上面狀態會變 🔴 直播中</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={refresh}
          className="flex-1 rounded-lg border border-green-400 bg-white px-4 py-2 font-medium text-green-700 hover:bg-green-50"
        >
          🔄 重新整理狀態
        </button>
        <button
          onClick={deleteStream}
          disabled={working}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          🗑️ 刪除串流
        </button>
      </div>

      {info.playback_id && info.status === 'active' && (
        <div className="overflow-hidden rounded-lg border-2 border-zinc-300 bg-black">
          <p className="bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">預覽（觀眾看到的畫面）</p>
          <iframe
            src={`https://player.mux.com/${info.playback_id}?autoplay=muted`}
            className="aspect-video w-full"
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}

function Field({ label, value, hidden, onToggle }: { label: string; value: string; hidden?: boolean; onToggle?: () => void }) {
  const display = hidden ? value.replace(/./g, '•') : value
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-zinc-50 px-2 py-1.5 font-mono text-sm">{display}</code>
        {onToggle && (
          <button onClick={onToggle} className="text-xs text-zinc-500 underline">
            {hidden ? '顯示' : '隱藏'}
          </button>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(value); alert('已複製') }}
          className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 hover:bg-amber-200"
        >
          複製
        </button>
      </div>
    </div>
  )
}

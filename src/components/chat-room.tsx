'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = {
  id: string
  user_id: string
  body: string
  created_at: string
  profiles?: { display_name?: string | null; avatar_url?: string | null } | null
}

export default function ChatRoom({
  currentUserId,
  currentUserName,
  initialMessages,
}: {
  currentUserId: string
  currentUserName: string
  initialMessages: Msg[]
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自動捲到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Realtime 訂閱新訊息
  useEffect(() => {
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newRow: any = payload.new
          // 載入 sender profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newRow.user_id)
            .maybeSingle()
          setMessages(prev => [
            ...prev,
            {
              id: newRow.id,
              user_id: newRow.user_id,
              body: newRow.body,
              created_at: newRow.created_at,
              profiles: prof || null,
            },
          ])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      user_id: currentUserId,
      body,
    })
    setSending(false)
    if (error) {
      alert('送出失敗：' + error.message)
      return
    }
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="my-3 flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">
            還沒有訊息——您可以是第一個打招呼的人 👋
          </p>
        ) : (
          messages.map(m => {
            const mine = m.user_id === currentUserId
            const name = m.profiles?.display_name || '會員'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-amber-500 text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}>
                  {!mine && <p className="mb-0.5 text-xs font-medium text-amber-700">{name}</p>}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-amber-100' : 'text-zinc-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Taipei' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder={`以 ${currentUserName} 的身份留言⋯ (Enter 送出，Shift+Enter 換行)`}
          className="flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:bg-zinc-300"
        >
          {sending ? '送出中…' : '送出'}
        </button>
      </div>
    </>
  )
}

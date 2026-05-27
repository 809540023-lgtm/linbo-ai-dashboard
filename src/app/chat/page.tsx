// 會員交流聊天室（伺服器端：權限檢查 + 載入歷史訊息）
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChatRoom from '@/components/chat-room'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/chat')

  const admin = createAdminClient()

  // 只有已報名任何一場活動的會員才能進聊天室
  const { count: regCount } = await admin.from('registrations')
    .select('*', { count: 'exact', head: true }).eq('user_id', user.id)

  if (!regCount || regCount === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">會員交流</h1>
        <p className="mt-4 text-zinc-600">交流區僅開放給已報名活動的會員。</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-amber-600 px-6 py-3 font-medium text-white hover:bg-amber-700">查看近期活動</Link>
      </main>
    )
  }

  // 載入個人資料 + 最近 100 則訊息
  const { data: me } = await admin.from('profiles').select('id,display_name,avatar_url').eq('id', user.id).single()
  const { data: messages } = await admin
    .from('chat_messages')
    .select('id, user_id, body, created_at, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100)

  // 在線人數（過去 5 分鐘有送訊息的人）
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentSenders } = await admin
    .from('chat_messages')
    .select('user_id')
    .gte('created_at', fiveMinAgo)
  const activeUserIds = new Set((recentSenders || []).map((r: any) => r.user_id))

  return (
    <main className="mx-auto flex h-[calc(100vh-60px)] max-w-3xl flex-col px-4 py-4">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-bold">💬 會員交流</h1>
          <p className="text-xs text-zinc-500">
            {activeUserIds.size > 0 ? `🟢 ${activeUserIds.size} 位最近活躍` : '靜悄悄的，歡迎您先說話'}
          </p>
        </div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← 回首頁</Link>
      </header>

      <ChatRoom
        currentUserId={user.id}
        currentUserName={me?.display_name || user.email?.split('@')[0] || '匿名'}
        initialMessages={(messages || []).reverse()}
      />

      <p className="mt-2 text-center text-xs text-zinc-400">
        本平台為教學交流性質，所有訊息不構成任何投資建議。請彼此尊重，禁止人身攻擊、廣告、報明牌。
      </p>
    </main>
  )
}

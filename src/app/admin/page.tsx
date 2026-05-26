// 簡易後台：看活動列表、訊息流；正式版要加 admin role 驗證
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { data: events } = await supabase.from('events').select('*').order('start_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, member_tier, created_at').order('created_at', { ascending: false }).limit(20)
  const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold">管理後台</h1>
      <p className="mt-2 text-sm text-zinc-500">
        ⚠️ 此頁尚未加 admin 角色檢查，正式上線前請在 Supabase 加 RLS 限制
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-500">活動總數</div>
          <div className="mt-1 text-3xl font-bold">{events?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-500">會員總數</div>
          <div className="mt-1 text-3xl font-bold">{profiles?.length || 0}+</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-500">總訊息數</div>
          <div className="mt-1 text-3xl font-bold">{msgCount || 0}</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">活動列表</h2>
        <table className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">標題</th>
              <th className="px-3 py-2">開始時間</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {events?.map(e => (
              <tr key={e.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">{e.title}</td>
                <td className="px-3 py-2">{new Date(e.start_at).toLocaleString('zh-TW')}</td>
                <td className="px-3 py-2">{e.status}</td>
                <td className="px-3 py-2 text-amber-600">
                  <a href={`/host/${e.id}/control`} className="mr-3 underline">主控台</a>
                  <a href={`/big-screen/${e.id}`} className="underline">大螢幕</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">最近註冊會員</h2>
        <table className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">暱稱</th>
              <th className="px-3 py-2">等級</th>
              <th className="px-3 py-2">註冊時間</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map(p => (
              <tr key={p.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">{p.display_name || '—'}</td>
                <td className="px-3 py-2">{p.member_tier}</td>
                <td className="px-3 py-2">{new Date(p.created_at).toLocaleString('zh-TW')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

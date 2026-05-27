// 編輯活動
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single()
  if (!event) notFound()

  const toLocal = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    return o.toISOString().slice(0, 16)
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">編輯活動</h1>
      <p className="mt-2 text-xs text-zinc-500">UUID: {event.id}</p>

      <form action={`/api/events/${event.id}/update`} method="POST" className="mt-6 space-y-5">
        <Field label="標題" name="title" defaultValue={event.title} required />
        <Field label="描述" name="description" defaultValue={event.description} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="開始時間" name="start_at" type="datetime-local" defaultValue={toLocal(event.start_at)} required />
          <Field label="結束時間" name="end_at" type="datetime-local" defaultValue={toLocal(event.end_at)} />
        </div>
        <Field label="YouTube 直播連結" name="livestream_url" defaultValue={event.livestream_url || ''} placeholder="https://youtube.com/watch?v=XXXX" />
        <div>
          <label className="block text-sm font-medium">狀態</label>
          <select name="status" defaultValue={event.status} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2">
            <option value="upcoming">upcoming</option>
            <option value="live">live</option>
            <option value="ended">ended</option>
          </select>
        </div>

        <div className="flex gap-3">
          <a href="/admin/events" className="rounded-lg border border-zinc-300 px-5 py-2.5">取消</a>
          <button className="flex-1 rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white hover:bg-amber-700">儲存</button>
        </div>
      </form>

      <form action={`/api/events/${event.id}/delete`} method="POST" className="mt-10 border-t border-zinc-200 pt-6">
        <button className="text-sm text-red-600 hover:underline"
          onClick={undefined}>刪除這個活動（不可復原）</button>
      </form>
    </main>
  )
}

function Field({ label, name, type = 'text', defaultValue = '', textarea = false, required = false, placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      ) : (
        <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      )}
    </div>
  )
}

// 建立 / 取得 Mux 直播串流
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MUX_API = 'https://api.mux.com/video/v1/live-streams'

function muxAuthHeader() {
  const id = process.env.MUX_TOKEN_ID!
  const secret = process.env.MUX_TOKEN_SECRET!
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

// 建立新串流
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 呼叫 Mux 建立 live stream
  const muxRes = await fetch(MUX_API, {
    method: 'POST',
    headers: {
      Authorization: muxAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playback_policy: ['public'], // Pilot 階段先 public，之後可改 signed
      new_asset_settings: { playback_policy: ['public'] },
      latency_mode: 'low', // 低延遲（互動需要）
      reconnect_window: 60, // 斷線重連 60 秒
    }),
  })

  if (!muxRes.ok) {
    const errBody = await muxRes.text()
    return NextResponse.json({ error: 'mux_create_failed', detail: errBody }, { status: 500 })
  }

  const muxData = await muxRes.json()
  const stream = muxData.data

  // 寫回 events 表
  const admin = createAdminClient()
  const { error } = await admin
    .from('events')
    .update({
      mux_stream_id: stream.id,
      mux_stream_key: stream.stream_key,
      mux_playback_id: stream.playback_ids?.[0]?.id,
      mux_status: stream.status, // idle
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'db_update_failed', detail: error.message }, { status: 500 })

  return NextResponse.json({
    stream_id: stream.id,
    playback_id: stream.playback_ids?.[0]?.id,
    stream_key: stream.stream_key,
    rtmp_url: 'rtmps://global-live.mux.com:443/app',
    status: stream.status,
  })
}

// 查目前串流狀態
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('mux_stream_id, mux_playback_id, mux_stream_key, mux_status')
    .eq('id', params.id)
    .single()

  if (!event?.mux_stream_id) {
    return NextResponse.json({ exists: false })
  }

  // 同步 Mux 端最新狀態
  const muxRes = await fetch(`${MUX_API}/${event.mux_stream_id}`, {
    headers: { Authorization: muxAuthHeader() },
  })
  if (muxRes.ok) {
    const m = await muxRes.json()
    if (m.data?.status !== event.mux_status) {
      await admin
        .from('events')
        .update({ mux_status: m.data.status })
        .eq('id', params.id)
    }
    return NextResponse.json({
      exists: true,
      stream_id: event.mux_stream_id,
      playback_id: event.mux_playback_id,
      stream_key: event.mux_stream_key,
      rtmp_url: 'rtmps://global-live.mux.com:443/app',
      status: m.data.status,
    })
  }

  return NextResponse.json({
    exists: true,
    stream_id: event.mux_stream_id,
    playback_id: event.mux_playback_id,
    stream_key: event.mux_stream_key,
    rtmp_url: 'rtmps://global-live.mux.com:443/app',
    status: event.mux_status,
  })
}

// 刪除串流（活動結束後可清掉）
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('mux_stream_id')
    .eq('id', params.id)
    .single()

  if (event?.mux_stream_id) {
    await fetch(`${MUX_API}/${event.mux_stream_id}`, {
      method: 'DELETE',
      headers: { Authorization: muxAuthHeader() },
    })
    await admin
      .from('events')
      .update({ mux_stream_id: null, mux_stream_key: null, mux_playback_id: null, mux_status: 'idle' })
      .eq('id', params.id)
  }

  return NextResponse.json({ ok: true })
}

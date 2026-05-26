// 研究 Agent 執行 API
// POST /api/research-agents/run
// Body: { agent_id: "agent_01", user_input?: "額外提示", event_id?: "..." }
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents/research-specs'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  // 確認 admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { agent_id, user_input = '', event_id = null } = body || {}
  if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const spec = getAgent(agent_id)
  if (!spec) return NextResponse.json({ error: 'agent not found: ' + agent_id }, { status: 404 })

  const admin = createAdminClient()

  // 建立 run 紀錄
  const { data: run } = await admin.from('agent_runs').insert({
    agent_id: spec.id,
    agent_name: spec.name,
    tier: spec.tier,
    domain: spec.domain,
    trigger_source: event_id ? 'live_event' : 'manual',
    triggered_by: user.id,
    event_id,
    input_payload: { user_input },
    status: 'running',
  }).select().single()

  const t0 = Date.now()
  try {
    // 呼叫 Claude
    const userMessage = user_input
      ? `請執行您的職責，並聚焦於：${user_input}\n\n依照 JSON schema 輸出。`
      : '請執行您的職責，依照 JSON schema 輸出當前最新狀態。'

    const resp = await anthropic.messages.create({
      model: spec.model,
      max_tokens: 4096,
      system: spec.system_prompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
    let parsed: any = null
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch (e) {
      // JSON 解析失敗也保留原始文字
    }

    // 算平均 confidence
    let confidenceAvg = null
    if (parsed?.nodes && Array.isArray(parsed.nodes)) {
      const confs = parsed.nodes.map((n: any) => n.confidence).filter((c: any) => typeof c === 'number')
      if (confs.length) confidenceAvg = confs.reduce((a: number, b: number) => a + b, 0) / confs.length
    } else if (parsed?.confidence) {
      confidenceAvg = parsed.confidence
    }

    // 更新 run 紀錄
    await admin.from('agent_runs').update({
      output_json: parsed || { raw_text: text },
      status: 'completed',
      confidence_avg: confidenceAvg,
      duration_ms: Date.now() - t0,
      completed_at: new Date().toISOString(),
    }).eq('id', run!.id)

    return NextResponse.json({
      ok: true,
      run_id: run!.id,
      agent: spec.name,
      output: parsed || { raw_text: text.slice(0, 500) + '...' },
      confidence_avg: confidenceAvg,
      duration_ms: Date.now() - t0,
    })
  } catch (e: any) {
    await admin.from('agent_runs').update({
      status: 'failed',
      error_message: e.message,
      duration_ms: Date.now() - t0,
      completed_at: new Date().toISOString(),
    }).eq('id', run!.id)

    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

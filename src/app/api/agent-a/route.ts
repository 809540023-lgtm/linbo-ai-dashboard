// Agent A：匯流者
// Vercel Cron 每 30 秒呼叫一次（vercel.json 設定）
// 抓取上個窗口新訊息 → Claude Haiku 摘要分組 → 寫入 ai_summaries
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: Request) {
  // Cron 防呆：要帶 secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sb = createAdminClient()

  // 找所有進行中的活動
  const { data: events } = await sb.from('events')
    .select('id, watchlist_stocks')
    .eq('status', 'live')

  if (!events?.length) return NextResponse.json({ ok: true, msg: '無進行中活動' })

  const results = []
  for (const ev of events) {
    // 抓未處理訊息
    const { data: msgs } = await sb.from('messages')
      .select('id, stock_code, category, content')
      .eq('event_id', ev.id)
      .eq('ai_processed', false)
      .limit(100)

    if (!msgs?.length) continue

    const stockMap = new Map(ev.watchlist_stocks?.map((s: any) => [s.code, s.name]) || [])

    // 呼叫 Claude
    const prompt = `你是台股座談會的即時訊息匯流助理。

以下是學員針對熱門股的觀察留言（每則含股票代號、分類、內容）：
${msgs.map(m => `- [${m.stock_code}/${m.category}] ${m.content}`).join('\n')}

請依照以下規則處理：
1. 依股票代號分組
2. 同組內合併語意相同的訊息（不要逐字列出）
3. 每檔股票輸出最多 3 個關鍵看空理由
4. 用繁體中文，每個理由不超過 25 字
5. 嚴格按照下方 JSON Schema 輸出，不要任何解釋文字

{
  "highlights": [
    {
      "stock_code": "股票代號",
      "stock_name": "股票名稱",
      "msg_count": 該股訊息數,
      "key_points": ["理由1", "理由2", "理由3"]
    }
  ]
}`

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
    let parsed: any = { highlights: [] }
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Parse error', e, text)
    }

    // 補名稱
    parsed.highlights = parsed.highlights.map((h: any) => ({
      ...h,
      stock_name: h.stock_name || stockMap.get(h.stock_code) || h.stock_code,
    }))

    // 寫入摘要
    await sb.from('ai_summaries').insert({
      event_id: ev.id,
      window_start: new Date(Date.now() - 30_000).toISOString(),
      window_end: new Date().toISOString(),
      highlights: parsed.highlights,
    })

    // 標記訊息已處理
    await sb.from('messages')
      .update({ ai_processed: true })
      .in('id', msgs.map(m => m.id))

    results.push({ event_id: ev.id, processed: msgs.length, highlights: parsed.highlights.length })
  }

  return NextResponse.json({ ok: true, results })
}

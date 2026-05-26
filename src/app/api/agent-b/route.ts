// Agent B：分析者
// Vercel Cron 每 60 秒呼叫一次
// 對每檔有訊息的股票，呼叫 Claude Sonnet 算下跌機率
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 抓即時股價（FinMind 免費版範例；自行替換）
async function fetchStockData(code: string) {
  try {
    // 範例：可改用 FinMind API、Yahoo Finance 非官方等
    return { price: null, change: null, candle: '無資料', institutional_flow: '無資料' }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sb = createAdminClient()

  const { data: events } = await sb.from('events')
    .select('id, watchlist_stocks')
    .eq('status', 'live')

  if (!events?.length) return NextResponse.json({ ok: true })

  const results = []
  for (const ev of events) {
    // 找此活動所有有訊息的股票
    const { data: msgGroups } = await sb.from('messages')
      .select('stock_code')
      .eq('event_id', ev.id)

    const stockCodes = Array.from(new Set((msgGroups || []).map((m: any) => m.stock_code).filter(Boolean)))
    const stockMap = new Map(ev.watchlist_stocks?.map((s: any) => [s.code, s.name]) || [])

    for (const code of stockCodes) {
      const { data: msgs } = await sb.from('messages')
        .select('content, category')
        .eq('event_id', ev.id)
        .eq('stock_code', code)

      if (!msgs?.length) continue

      const stockData = await fetchStockData(code)

      const prompt = `你是台股短線風險評估專家。基於下方資料，評估這檔股票未來 1-3 個交易日的「快速轉弱機率」。

# 評估維度與權重
- 籌碼面：35%
- 技術面：25%
- 消息面：25%
- 群體觀察：15%

# 股票資料
代號：${code}
名稱：${stockMap.get(code) || code}
即時報價：${stockData?.price ?? '無'}（${stockData?.change ?? '無'}%）
K 線形態：${stockData?.candle ?? '無'}
法人買賣超：${stockData?.institutional_flow ?? '無'}

# 學員看空觀察（共 ${msgs.length} 則）
${msgs.map(m => `- [${m.category}] ${m.content}`).join('\n')}

# 嚴格按下方 JSON 輸出，不要任何解釋
{
  "bearish_score": 0-100 之間的整數,
  "confidence": "high" | "medium" | "low",
  "reasons": ["理由1", "理由2", "理由3"],
  "watch_trigger": "若 XX 跌破 YY 元，加速下跌風險升高"
}`

      try {
        const resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        })
        const text = resp.content[0].type === 'text' ? resp.content[0].text : ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) continue
        const parsed = JSON.parse(jsonMatch[0])

        // upsert
        await sb.from('bearish_rankings').upsert({
          event_id: ev.id,
          stock_code: code,
          stock_name: stockMap.get(code) || code,
          bearish_score: parsed.bearish_score,
          reasons: parsed.reasons,
          message_count: msgs.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id,stock_code' })

        results.push({ event_id: ev.id, code, score: parsed.bearish_score })
      } catch (e) {
        console.error('Agent B error for', code, e)
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}

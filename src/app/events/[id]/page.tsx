// 活動詳情頁 + 報名表單（含票價系統 + 精品咖啡 + 藍帶甜點）
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const COFFEES = [
  {
    no: '01',
    name: '尼加拉瓜 · 秘境莊園 尖身波旁 蜜處理',
    en: 'Nicaragua Mierisch · Finca Escondida · Laurina / Bourbon Pointu · Pulp Natural',
    origin: '尼加拉瓜 希諾特加',
    altitude: '1,000–1,250 m',
    variety: '尖身波旁 Laurina（天然半低因品種）',
    process: '蜜處理 Pulp Natural',
    flavor: '柑橘、莓果、榛果、焦糖；葡萄柚 × 李子 × 橘汁，尾韻榛果威化餅',
    story: 'Mierisch 家族屢獲 Cup of Excellence 殊榮，咖啡因僅一般咖啡的一半，極稀有品種。',
    badge: '🌑 半低因',
  },
  {
    no: '02',
    name: '衣索比亞 · 卡法頂級 Wush Wush 水洗',
    en: 'Ethiopia Keffa Top · Wush Wush · Washed',
    origin: '衣索比亞 卡法 Keffa',
    altitude: '1,600–1,760 m',
    variety: 'Wush Wush（稀有原生種）',
    process: '水洗 Washed',
    flavor: '檸檬糖、黑醋栗、深色水果、紅茶、橘子；果香花香強烈，甜度極高',
    story: '源自 Wush Wush 森林的原生種，風味近藝妓，產量稀少，近年精品圈明星豆。',
    badge: '🌸 近藝妓',
  },
  {
    no: '03',
    name: '衣索比亞 · 夏娃 · 格林藝妓森林 日曬',
    en: 'Ethiopia Eva · Gori Gesha Forest · Natural',
    origin: '衣索比亞 Gori Gesha Forest',
    altitude: '1,900–2,100 m',
    variety: '100% Gori Gesha Forest 原生種',
    process: '非洲床日曬 Natural',
    flavor: '野薑花、檸檬柑橘、百花蜜甜感、香草迷迭香、伯爵茶、佛手柑，尾韻甘甜',
    story: '藝妓品種發源地之一，完全野生未馴化，由周邊小農進森林手採，夢幻逸品。',
    badge: '🦋 藝妓源頭',
  },
]

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('*').eq('id', params.id).single()
  if (!event) return <main className="p-12">找不到此活動</main>

  const { count: registeredCount } = await admin.from('registrations')
    .select('*', { count: 'exact', head: true }).eq('event_id', params.id)
  const { count: onsiteCount } = await admin.from('registrations')
    .select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('ticket_type', 'onsite')

  let myReg: any = null
  if (user) {
    const { data } = await admin.from('registrations')
      .select('*').eq('event_id', params.id).eq('user_id', user.id).maybeSingle()
    myReg = data
  }

  const isFull = event.max_attendees && (registeredCount || 0) >= event.max_attendees
  const remaining = event.max_attendees ? Math.max(0, event.max_attendees - (registeredCount || 0)) : null
  const startDate = new Date(event.start_at)

  const onsiteN = onsiteCount || 0
  const onsitePriceNow = onsiteN === 0 ? 1000 : Math.max(500, Math.min(1000, Math.round(20000 / Math.max(onsiteN, 1))))
  const onlinePrice = 600

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← 回首頁</Link>

      <header className="mt-4">
        <p className="text-xs font-medium text-amber-600">群眾智慧 × AI 共創座談會 · Pilot 場</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">{event.title}</h1>
        <p className="mt-3 leading-relaxed text-zinc-700">{event.description}</p>
      </header>

      {/* 玩法 3 步說明 */}
      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-bold text-amber-900">活動現場您只要做 3 件事</h2>
        <div className="mt-3 space-y-2 text-sm text-amber-900">
          <div className="flex gap-2"><span className="font-bold">1️⃣</span><p>看您手機上的直播</p></div>
          <div className="flex gap-2"><span className="font-bold">2️⃣</span><p>把您「覺得可能會跌的觀察」打字送出（一句話就好）</p></div>
          <div className="flex gap-2"><span className="font-bold">3️⃣</span><p>看 AI 把全場 N 個人的觀察整合成排行榜</p></div>
        </div>
        <p className="mt-3 text-xs text-amber-800">
          完全不懂 AI、不懂股票分析都沒關係——後端 15 個 AI 機器人會做所有困難的工作。
        </p>
      </section>

      <section className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-xs font-medium text-zinc-500">日期時間</p>
            <p className="text-lg font-semibold">
              {startDate.toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
            </p>
            <p className="text-sm text-zinc-600">活動全長約 3.5 小時</p>
          </div>
        </div>
        {event.location && (
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-xs font-medium text-zinc-500">地點</p>
              <p className="leading-relaxed">{event.location}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <span className="text-xl">👥</span>
          <div>
            <p className="text-xs font-medium text-zinc-500">名額</p>
            <p>
              已報名 <strong className="text-amber-700">{registeredCount || 0}</strong> /{' '}
              {event.max_attendees || '不限'} 人
              {remaining !== null && remaining > 0 && <span className="ml-1 text-sm text-zinc-600">（剩餘 {remaining} 席）</span>}
              {isFull && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">已額滿</span>}
            </p>
          </div>
        </div>
      </section>

      {/* 票價說明卡 */}
      <section className="mt-6 rounded-xl border-2 border-amber-300 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-900">💰 票種與費用</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">🎫 現場票</p>
            <p className="mt-1 text-3xl font-bold text-amber-900">NT$ {onsitePriceNow}</p>
            <p className="mt-1 text-xs text-amber-700">當天現場參與 · 視人數分攤 NT$ 500–1,000</p>
            <ul className="mt-3 space-y-1 text-xs text-zinc-700">
              <li>✅ 現場互動體驗</li>
              <li>☕ 含精品咖啡品鑑（3 支稀有莊園豆）</li>
              <li>🍰 含藍帶精選甜點</li>
              <li>📺 含 7 天線上回放</li>
            </ul>
          </div>
          <div className="rounded-lg border-2 border-zinc-300 bg-zinc-50 p-4">
            <p className="text-xs font-medium text-zinc-600">💻 線上直播票</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900">NT$ {onlinePrice}</p>
            <p className="mt-1 text-xs text-zinc-600">遠端參與 · 固定費用</p>
            <ul className="mt-3 space-y-1 text-xs text-zinc-700">
              <li>📱 手機 / 電腦觀看直播</li>
              <li>💬 同步打字送出觀察</li>
              <li>📺 含 7 天線上回放</li>
              <li>📊 含 AI 個人化報告</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          現場票價依當天實際出席人數結算（總成本 NT$ 20,000 由現場人均分攤，上限 NT$ 1,000 / 下限 NT$ 500）。當天現場以現金或 LINE Pay 收取，線上票請於報名後 3 日內完成轉帳。
        </p>
      </section>

      {/* ☕ 精品咖啡品鑑會 */}
      <section className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☕</span>
          <div>
            <h2 className="text-lg font-bold text-amber-900">精品咖啡品鑑會 · 限現場票</h2>
            <p className="text-xs text-amber-700">Specialty Coffee Tasting · 三支稀有莊園豆</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          三種處理法 × 三支稀有品種 × 三種海拔層次。從圓潤甜潤的堅果焦糖，到明亮爆發的果香花香，再到細緻優雅的花茶尾韻——每一支豆子都有它的故事。
        </p>

        <div className="mt-4 space-y-3">
          {COFFEES.map(c => (
            <div key={c.no} className="rounded-lg border border-amber-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-amber-600">{c.no} · {c.badge}</p>
                  <h3 className="mt-1 text-sm font-bold text-zinc-900">{c.name}</h3>
                  <p className="mt-0.5 text-xs italic text-zinc-500">{c.en}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><dt className="inline font-medium text-zinc-500">產區：</dt><dd className="inline text-zinc-800">{c.origin}</dd></div>
                <div><dt className="inline font-medium text-zinc-500">海拔：</dt><dd className="inline text-zinc-800">{c.altitude}</dd></div>
                <div className="col-span-2"><dt className="inline font-medium text-zinc-500">品種：</dt><dd className="inline text-zinc-800">{c.variety}</dd></div>
                <div className="col-span-2"><dt className="inline font-medium text-zinc-500">處理法：</dt><dd className="inline text-zinc-800">{c.process}</dd></div>
              </dl>
              <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-900">
                <strong>♪ 風味：</strong>{c.flavor}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                <strong>❦ 故事：</strong>{c.story}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          ── 三支豆同場品鑑，由 1,000m 漸進至 2,100m，體驗不同海拔孕育的風味個性 ──
        </p>
      </section>

      {/* 🍰 藍帶甜點（資料待補） */}
      <section className="mt-6 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍰</span>
          <div>
            <h2 className="text-lg font-bold text-pink-900">藍帶精選甜點 · 限現場票</h2>
            <p className="text-xs text-pink-700">Le Cordon Bleu Selected Pastries</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-pink-900">
          當日搭配三支精品咖啡的藍帶廚藝學院級甜點精選——詳細品項與風味說明將於活動前公布，敬請期待。
        </p>
        <p className="mt-2 text-xs italic text-pink-600">（甜點資料近日補上）</p>
      </section>

      {myReg ? (
        <section className="mt-6 rounded-xl border-2 border-green-400 bg-green-50 p-5">
          <p className="text-lg font-bold text-green-800">✅ 報名成功</p>
          <p className="mt-2 text-base text-green-900">
            您是第 <strong className="text-3xl">{registeredCount}</strong> 位報名者
          </p>
          <p className="mt-2 text-sm text-green-900">
            票種：<strong>{myReg.ticket_type === 'online' ? `💻 線上直播票 NT$ ${onlinePrice}` : `🎫 現場票 NT$ ${onsitePriceNow}（當天結算）`}</strong>
          </p>
          <p className="mt-2 text-sm text-green-700">
            活動前 3 日會 Email 通知您詳細地點 / 線上連結與付款方式。當天 13:30 準時開始。
          </p>
          {myReg.referrer_name && (
            <p className="mt-3 rounded bg-white px-2 py-1 text-xs text-green-700">
              推薦人：{myReg.referrer_name}
              {myReg.referrer_relation && ` · ${myReg.referrer_relation}`}
            </p>
          )}
        </section>
      ) : isFull ? (
        <section className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-center">
          <p className="font-medium text-red-700">很抱歉，本場已額滿</p>
          <p className="mt-1 text-sm text-red-600">下一場將於 6 月中旬開放，請關注後續通知</p>
        </section>
      ) : !user ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-center">
          <p className="mb-3 text-zinc-700">先登入再報名 · 用 Google 一鍵登入最快</p>
          <Link href={`/auth/login?next=/events/${params.id}`}
            className="inline-block rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800">
            登入 / 註冊
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">立即報名</h2>
          <p className="mt-1 text-sm text-amber-700">Pilot 場限熟人推薦——確保現場品質、避免廣告帳號混入</p>

          <form action={`/events/${params.id}/register`} method="POST" className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                選擇票種 <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border-2 border-zinc-200 bg-white p-3 hover:border-amber-400">
                  <input type="radio" name="ticket_type" value="onsite" required defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-zinc-900">🎫 現場票</p>
                    <p className="text-sm text-amber-700">NT$ {onsitePriceNow}（當天結算）</p>
                    <p className="text-xs text-zinc-500">含咖啡品鑑 + 藍帶甜點</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border-2 border-zinc-200 bg-white p-3 hover:border-amber-400">
                  <input type="radio" name="ticket_type" value="online" required className="mt-1" />
                  <div>
                    <p className="font-semibold text-zinc-900">💻 線上票</p>
                    <p className="text-sm text-zinc-700">NT$ {onlinePrice}</p>
                    <p className="text-xs text-zinc-500">含 7 天回放</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                推薦人姓名 <span className="text-red-500">*</span>
              </label>
              <input
                name="referrer_name"
                required
                placeholder="誰介紹您來的？例：王小明"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-500">沒有推薦人？請在備註欄留言</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">您與推薦人的關係</label>
              <select name="referrer_relation"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                <option value="">請選擇</option>
                <option>同事</option>
                <option>朋友</option>
                <option>家人</option>
                <option>客戶 / 合作夥伴</option>
                <option>投資 / 學習社團</option>
                <option>其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">您的聯絡電話</label>
              <input
                name="attendee_phone"
                type="tel"
                placeholder="0912-345-678"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-500">活動當天臨時聯繫用，僅工作人員可見</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">想跟我們說的話（可空）</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="飲食偏好、特殊需求、咖啡偏好（淺/中/深焙）..."
                className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
            </div>

            <button className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700">
              ✅ 確認報名
            </button>
            <p className="text-center text-xs text-zinc-500">
              本平台為教學交流性質，所有內容不構成任何投資建議。
            </p>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl bg-zinc-50 p-5">
        <h2 className="text-lg font-bold">這場活動為什麼跟別人不一樣</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>🔮 <strong>不是報明牌、不是選股課</strong>——主持人不告訴您要買什麼</li>
          <li>👥 <strong>每個人都是貢獻者</strong>——您腦中的觀察就是現場的原料</li>
          <li>🤖 <strong>背後 15 個 AI 機器人輔助</strong>——把零碎觀察整合成排行榜，您不用懂 AI</li>
          <li>☕ <strong>現場限定的精品咖啡品鑑</strong>——三支稀有莊園豆，配藍帶甜點</li>
          <li>🎯 <strong>共同發現轉弱訊號</strong>——不是預測，是群體智慧的即時呈現</li>
        </ul>
      </section>
    </main>
  )
}

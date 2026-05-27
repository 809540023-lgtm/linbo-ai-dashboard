// 活動詳情頁（分頁式 + 大字體 · 老人家友善）
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import EventTabs from '@/components/event-tabs'

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
  if (!event) return <main className="p-12 text-2xl">找不到此活動</main>

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

  const isFull = !!(event.max_attendees && (registeredCount || 0) >= event.max_attendees)
  const remaining = event.max_attendees ? Math.max(0, event.max_attendees - (registeredCount || 0)) : null
  const startDate = new Date(event.start_at)
  const startDateStr = startDate.toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Taipei' })

  const onsiteN = onsiteCount || 0
  const onsitePriceNow = onsiteN === 0 ? 1000 : Math.max(500, Math.min(1000, Math.round(20000 / Math.max(onsiteN, 1))))
  const onlinePrice = 600

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link href="/" className="inline-block text-base text-zinc-500 hover:text-zinc-900">← 回首頁</Link>

      <EventTabs
        event={event}
        registeredCount={registeredCount || 0}
        remaining={remaining}
        isFull={isFull}
        myReg={myReg}
        user={user}
        onsitePriceNow={onsitePriceNow}
        onlinePrice={onlinePrice}
        coffees={COFFEES}
        startDateStr={startDateStr}
        eventId={params.id}
      />
    </main>
  )
}

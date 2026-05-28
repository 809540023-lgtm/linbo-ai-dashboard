'use client'
import { useEffect, useState } from 'react'

export default function IntroModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem('linbo_intro_v3_seen')
    if (!seen) {
      setTimeout(() => setOpen(true), 400)
    }
  }, [])

  function close() {
    setOpen(false)
    localStorage.setItem('linbo_intro_v3_seen', '1')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <button
          onClick={close}
          aria-label="關閉"
          className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-600 hover:bg-zinc-200"
        >
          ✕
        </button>

        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 px-6 py-8 sm:px-10 sm:py-10">
          <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 text-base font-bold text-amber-800">
            🤖 AI 理財新時代
          </div>
          <h2 className="mt-4 text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
            用 AI 理財
          </h2>
          <h2 className="mt-1 text-4xl font-bold leading-tight text-amber-600 sm:text-5xl">
            不是課程 · 是一場對談
          </h2>
          <p className="mt-5 text-xl leading-relaxed text-zinc-700">
            沒有老師唸 PPT、沒有公式要背、沒有買賣訊號要記。
          </p>
          <p className="mt-3 text-xl leading-relaxed text-zinc-700">
            林博帶您體驗 <strong className="text-amber-700">15 個 AI 機器人</strong>怎麼幫您看市場、找轉弱訊號、整理出全場的「集體共識」。
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <p className="text-xl font-bold text-zinc-900">🙋 適合哪些人？</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-5">
              <span className="text-4xl">🌱</span>
              <div>
                <p className="text-xl font-bold text-zinc-900">還沒進股市的人</p>
                <p className="mt-1 text-base leading-relaxed text-zinc-700">
                  從 AI 怎麼看市場開始學——不用懂線圖、不用看財報，直接學會用 AI 工具理解世界。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-5">
              <span className="text-4xl">📈</span>
              <div>
                <p className="text-xl font-bold text-zinc-900">已經在股市的高手</p>
                <p className="mt-1 text-base leading-relaxed text-zinc-700">
                  您的眼光只能看到熟悉的角度——這裡 15 個 AI 機器人 + 50 雙眼睛幫您掃描盲點。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-5">
              <span className="text-4xl">🚀</span>
              <div>
                <p className="text-xl font-bold text-zinc-900">想抓住前所未有機會的人</p>
                <p className="mt-1 text-base leading-relaxed text-zinc-700">
                  AI 正在改寫所有產業的規則——理財方式也正在被重新定義，提早上車。
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={close}
            className="mt-7 w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700"
          >
            開始體驗 AI 理財 →
          </button>
          <p className="mt-3 text-center text-sm text-zinc-500">
            （此提示僅顯示一次，下次直接看內容）
          </p>
        </div>
      </div>
    </div>
  )
}

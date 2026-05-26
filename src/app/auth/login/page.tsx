'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'google' | 'phone'>('google')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function loginWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/dashboard` },
    })
  }

  async function sendCode() {
    setLoading(true); setMsg('')
    // 用 Supabase 內建 Phone OTP（也可改呼叫 /api/phone-verify 走 Twilio）
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setStep('code'); setMsg('驗證碼已寄出')
  }

  async function verifyCode() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    location.href = '/dashboard'
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-8 text-2xl font-bold">登入 / 註冊</h1>

      <div className="mb-6 flex gap-2 rounded-lg bg-zinc-100 p-1">
        <button
          onClick={() => setTab('google')}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === 'google' ? 'bg-white shadow-sm' : ''}`}
        >Google 登入</button>
        <button
          onClick={() => setTab('phone')}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === 'phone' ? 'bg-white shadow-sm' : ''}`}
        >手機簡訊</button>
      </div>

      {tab === 'google' && (
        <button
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 font-medium hover:bg-zinc-50 disabled:opacity-50"
        >
          使用 Google 繼續
        </button>
      )}

      {tab === 'phone' && (
        <div className="space-y-3">
          {step === 'phone' ? (
            <>
              <input
                type="tel"
                placeholder="+886912345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3"
              />
              <button
                onClick={sendCode}
                disabled={loading || !phone}
                className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >寄送驗證碼</button>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                placeholder="6 位數驗證碼"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-2xl tracking-widest"
              />
              <button
                onClick={verifyCode}
                disabled={loading || code.length < 6}
                className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >驗證並登入</button>
              <button
                onClick={() => setStep('phone')}
                className="w-full text-sm text-zinc-500 hover:text-zinc-900"
              >← 改用其他號碼</button>
            </>
          )}
        </div>
      )}

      {msg && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{msg}</p>}

      <p className="mt-8 text-xs text-zinc-500">
        點擊繼續即代表您同意我們的服務條款與隱私權政策。本平台所有內容僅供教學交流參考，不構成任何投資建議。
      </p>
    </main>
  )
}

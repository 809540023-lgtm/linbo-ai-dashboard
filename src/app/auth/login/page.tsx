'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'google' | 'phone'>('google')
  const [phone, setPhone] = useState('+886')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // 自動把台灣本地號 09xxxxxxxx 轉成 +8869xxxxxxxx
  function normalizePhone(input: string): string {
    let v = input.trim().replace(/[\s-()]/g, '')
    if (!v) return ''
    if (v.startsWith('0')) v = '+886' + v.slice(1)
    else if (v.startsWith('886')) v = '+' + v
    else if (!v.startsWith('+')) v = '+886' + v
    return v
  }

  async function loginWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/dashboard` },
    })
  }

  async function sendCode() {
    setLoading(true); setMsg('')
    const normalized = normalizePhone(phone)
    if (!/^\+886\d{9}$/.test(normalized)) {
      setMsg('手機格式錯誤，請用 09xx-xxx-xxx 或 +886-9xx-xxx-xxx')
      setLoading(false); return
    }
    setPhone(normalized)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setStep('code'); setMsg('驗證碼已寄出到 ' + normalized)
  }

  async function verifyCode() {
    setLoading(true); setMsg('')
    const { error } = await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: code, type: 'sms' })
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
              <div className="flex w-full rounded-lg border border-zinc-300 overflow-hidden">
                <span className="bg-zinc-100 px-3 py-3 text-sm text-zinc-600 select-none">🇹🇼 +886</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="912345678 或 0912345678"
                  value={phone.replace(/^\+886/, '')}
                  onChange={e => setPhone('+886' + e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-3 outline-none"
                />
              </div>
              <p className="text-xs text-zinc-500">輸入您的手機號碼（不含開頭的 0 也可以）</p>
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
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6 位數驗證碼"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

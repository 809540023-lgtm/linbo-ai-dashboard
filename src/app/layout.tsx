import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '林博 AI 台股智慧座談會',
  description: '尋找最快掉落的那顆星星',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-zinc-50 text-zinc-900 antialiased">
        {children}
        <footer className="mt-16 border-t border-zinc-200 px-6 py-8 text-center text-xs text-zinc-500">
          本平台所有內容僅供教學交流參考，不構成任何投資建議。投資人應審慎評估自身風險，盈虧自負。
        </footer>
      </body>
    </html>
  )
}

# 林博 AI 台股座談會 — 互動平台啟動專案

> Next.js 14 + Supabase + Mux + Claude API
> 從 0 到上線的可執行範本

## 快速開始

### 1. 系統需求
- Node.js 20+
- pnpm（建議）或 npm
- 一個 Supabase 帳號
- 一個 Vercel 帳號
- 一個 Anthropic API 金鑰
- 一個 Mux 帳號（直播）
- 一個 Twilio 帳號（SMS，可選）

### 2. 安裝
```bash
# clone 或解壓到本地後
cd linbo-platform
pnpm install

# 複製環境變數範本
cp .env.example .env.local
# 編輯 .env.local 填入您的金鑰
```

### 3. 設定 Supabase
1. 到 https://supabase.com 建立新專案
2. 在 SQL Editor 貼上 `supabase/migrations/00001_initial.sql` 並執行
3. 到 Authentication → Providers 開啟 Google 與 Phone
4. 把 Project URL 與 anon key 填入 `.env.local`

### 4. 設定 Google OAuth
1. 到 https://console.cloud.google.com
2. 建立 OAuth 2.0 Client ID
3. Redirect URI 填：`https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. 把 Client ID 與 Secret 填回 Supabase Auth 設定

### 5. 設定 Mux 直播
1. 到 https://dashboard.mux.com 建立 Live Stream
2. 拿 RTMP URL 與 Stream Key（給 OBS 用）
3. 拿 Playback ID 填入 `.env.local`

### 6. 本地啟動
```bash
pnpm dev
# 開 http://localhost:3000
```

### 7. 部署到 Vercel
```bash
# 把專案推 GitHub 後
# 到 https://vercel.com/new 連 GitHub repo
# Environment Variables 把 .env.local 內容貼進去
# Deploy
```

## 專案結構

```
linbo-platform/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # 首頁
│   │   ├── layout.tsx                     # 根布局
│   │   ├── auth/login/page.tsx            # 登入頁
│   │   ├── events/[id]/live/page.tsx      # 直播 + 互動頁
│   │   ├── host/[eventId]/control/page.tsx # 林博主控台
│   │   ├── big-screen/[eventId]/page.tsx  # 大螢幕排行榜
│   │   └── api/
│   │       ├── agent-a/route.ts           # AI 匯流者（Cron）
│   │       ├── agent-b/route.ts           # AI 分析者（Cron）
│   │       └── phone-verify/route.ts      # SMS 驗證
│   ├── lib/supabase/
│   │   ├── client.ts                      # 瀏覽器端 client
│   │   └── server.ts                      # 伺服器端 client
│   └── middleware.ts                      # 路由保護
├── supabase/migrations/
│   └── 00001_initial.sql                  # 資料庫 schema
├── .env.example                           # 環境變數範本
├── package.json
└── README.md
```

## 8 天衝刺對應檔案

| Day | 任務 | 該修改的檔案 |
|---|---|---|
| 1 | 部署 hello world | `src/app/page.tsx` |
| 2 | 驗證系統 | `src/app/auth/login/page.tsx`、`src/middleware.ts` |
| 3 | 會員與活動 | `src/app/events/` |
| 4 | 直播嵌入 | `src/app/events/[id]/live/page.tsx` |
| 5 | 互動留言 | `src/app/events/[id]/live/page.tsx`（加 MessageForm） |
| 6 | AI Agents | `src/app/api/agent-a/route.ts`、`agent-b/route.ts` |
| 7 | 後台與彩排 | `src/app/admin/` |
| 8 | 上線 | Vercel 部署 |

## 開發小撇步

- 寫前端時開 Supabase Realtime 訂閱要記得 unsubscribe，否則會 memory leak
- AI Agent 用 Vercel Cron Job 觸發（vercel.json 設定 `crons` 區段）
- 直播延遲想壓低用 Mux 的 LL-HLS 模式（low latency）
- 卡關時去 Supabase Discord 問，回應比 StackOverflow 快

## 法律注意事項

⚠️ **本平台涉及股票討論，必須在首頁與註冊頁顯著聲明：**
> 本平台所有內容僅供教學交流參考，不構成任何投資建議。投資人應審慎評估自身風險，盈虧自負。

## 授權
MIT - 您可以自由使用、修改。

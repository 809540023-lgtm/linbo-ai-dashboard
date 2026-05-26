#!/bin/bash
# 林博平台一鍵設定腳本
# 用法：bash setup.sh

set -e

echo "🚀 林博 AI 台股座談會平台 — 一鍵設定"
echo "========================================"
echo ""

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 找不到 Node.js"
    echo "請先到 https://nodejs.org 下載安裝 Node 20+"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本太舊（目前 v$(node -v)），請升級到 v18+"
    exit 1
fi
echo "✅ Node.js $(node -v) OK"

# 安裝依賴
echo ""
echo "📦 安裝依賴中（約 1-3 分鐘）..."
npm install --no-audit --no-fund

# 建立 .env.local
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 建立 .env.local 範本..."
    cp .env.example .env.local
    echo "✅ .env.local 已建立，請編輯填入您的金鑰"
else
    echo "✅ .env.local 已存在"
fi

# 嘗試 build
echo ""
echo "🔨 跑一次 build 驗證..."
if npm run build 2>&1 | tail -5; then
    echo "✅ Build 成功！"
else
    echo "⚠️  Build 失敗，請看上方錯誤訊息"
fi

echo ""
echo "========================================"
echo "🎉 設定完成！下一步："
echo ""
echo "1. 編輯 .env.local 填入金鑰"
echo "   - Supabase URL 與 anon key（必要）"
echo "   - Anthropic API key（AI Agent 需要）"
echo "   - Mux Playback ID（直播需要）"
echo ""
echo "2. 在 Supabase SQL Editor 跑："
echo "   supabase/migrations/00001_initial.sql"
echo ""
echo "3. 啟動本地伺服器："
echo "   npm run dev"
echo ""
echo "4. 開瀏覽器看："
echo "   http://localhost:3000          ← 首頁"
echo "   http://localhost:3000/demo     ← 離線示範（不用設定任何金鑰）"
echo ""
echo "詳細步驟看 README.md 與 02_快速上手指南.md"

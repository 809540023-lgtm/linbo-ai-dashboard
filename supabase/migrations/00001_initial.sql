-- ============================================================
-- 林博 AI 台股座談會平台 — 初始 Schema
-- 在 Supabase SQL Editor 整段貼上執行
-- ============================================================

-- 會員擴充資料
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  phone_verified boolean default false,
  google_id text,
  member_tier text default 'free',
  created_at timestamptz default now()
);

-- 活動場次
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  livestream_url text,
  watchlist_stocks jsonb default '[]'::jsonb,
  status text default 'upcoming',
  created_at timestamptz default now()
);

-- 報名
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

-- 現場訊息
create table public.messages (
  id bigserial primary key,
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  stock_code text,
  category text check (category in ('chip','news','tech','industry','other')),
  sentiment text check (sentiment in ('bearish','neutral','bullish')) default 'bearish',
  content text not null,
  ai_processed boolean default false,
  created_at timestamptz default now()
);
create index idx_messages_event on messages(event_id, created_at desc);
create index idx_messages_unprocessed on messages(event_id, ai_processed) where ai_processed = false;

-- AI 匯流摘要
create table public.ai_summaries (
  id bigserial primary key,
  event_id uuid references events(id) on delete cascade,
  window_start timestamptz,
  window_end timestamptz,
  highlights jsonb,
  created_at timestamptz default now()
);

-- AI 下跌機率排行
create table public.bearish_rankings (
  id bigserial primary key,
  event_id uuid references events(id) on delete cascade,
  stock_code text,
  stock_name text,
  bearish_score numeric,
  reasons jsonb,
  message_count int default 0,
  updated_at timestamptz default now(),
  unique(event_id, stock_code)
);

-- ============================================================
-- RLS 政策
-- ============================================================

alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table messages enable row level security;
alter table ai_summaries enable row level security;
alter table bearish_rankings enable row level security;

-- profiles
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- events 公開可讀
create policy "Anyone reads events" on events for select using (true);

-- registrations
create policy "Users see own registrations" on registrations
  for select using (auth.uid() = user_id);
create policy "Users insert own registration" on registrations
  for insert with check (auth.uid() = user_id);

-- messages：只有報名者可讀同活動訊息；自己的訊息一定看得到
create policy "Read messages of registered events" on messages
  for select using (
    auth.uid() = user_id or
    exists (
      select 1 from registrations r
      where r.event_id = messages.event_id
        and r.user_id = auth.uid()
    )
  );
create policy "Insert own message" on messages
  for insert with check (auth.uid() = user_id);

-- AI 摘要與排行：報名者可看
create policy "Registered users read summaries" on ai_summaries
  for select using (
    exists (
      select 1 from registrations r
      where r.event_id = ai_summaries.event_id
        and r.user_id = auth.uid()
    )
  );

create policy "Registered users read rankings" on bearish_rankings
  for select using (
    exists (
      select 1 from registrations r
      where r.event_id = bearish_rankings.event_id
        and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- 自動建立 profile 的 trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 範例資料：6/3 座談會
-- ============================================================
insert into events (title, description, start_at, end_at, watchlist_stocks, status) values (
  '林博的獨立思維：尋找最快掉落的那顆星星',
  '當市場越熱，越多人只想問哪一檔會漲；林博的獨立思維，看的是那顆最可能、最快掉落的星星。',
  '2026-06-03 13:00:00+08',
  '2026-06-03 17:00:00+08',
  '[
    {"code":"2330","name":"台積電"},
    {"code":"2454","name":"聯發科"},
    {"code":"3008","name":"大立光"},
    {"code":"2308","name":"台達電"},
    {"code":"2382","name":"廣達"},
    {"code":"3231","name":"緯創"},
    {"code":"2317","name":"鴻海"},
    {"code":"6505","name":"台塑化"},
    {"code":"2603","name":"長榮"},
    {"code":"2603","name":"陽明"}
  ]'::jsonb,
  'upcoming'
);

-- 開啟 Realtime（在 Supabase Dashboard 也可手動開）
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table ai_summaries;
alter publication supabase_realtime add table bearish_rankings;

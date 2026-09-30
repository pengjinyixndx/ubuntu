-- ============================================================
-- 青桃 · 请愿页数据表（奶茶券请求 / 亲亲 / 心愿 / 矛盾记录）
--
-- 用法：Supabase 控制台 → SQL Editor → 整段粘贴执行
-- 说明：两人私密空间，登录即可读写；审批、兑现、和好需要改对方的记录，
--       所以这几张表允许登录用户 update。
-- ============================================================

-- ============ 1. 奶茶券请求（她发起 → 他审批）============
create table if not exists public.milktea_requests (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolver uuid references auth.users (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists milktea_requests_created_idx on public.milktea_requests (created_at desc);


-- ============ 2. 亲亲（每天免费 10 次，超出要对方同意）============
create table if not exists public.kisses (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade,
  count int not null default 1 check (count > 0),
  status text not null default 'free' check (status in ('free', 'pending', 'approved', 'rejected')),
  redeemed boolean not null default false,
  resolver uuid references auth.users (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists kisses_created_idx on public.kisses (created_at desc);


-- ============ 3. 心愿 ============
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  want_at date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists wishes_created_idx on public.wishes (created_at desc);


-- ============ 4. 矛盾记录 ============
create table if not exists public.conflicts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'collecting'
    check (status in ('collecting', 'active', 'calm', 'resolved')),
  started_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conflict_notes (
  id uuid primary key default gen_random_uuid(),
  conflict_id uuid not null references public.conflicts (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  happened_on text,
  matter text not null default '',
  demand text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists conflict_notes_conflict_idx on public.conflict_notes (conflict_id);


-- ============ 行级安全 ============
alter table public.milktea_requests enable row level security;
alter table public.kisses enable row level security;
alter table public.wishes enable row level security;
alter table public.conflicts enable row level security;
alter table public.conflict_notes enable row level security;

-- 读
drop policy if exists "milktea_requests_select" on public.milktea_requests;
create policy "milktea_requests_select" on public.milktea_requests for select to authenticated using (true);
drop policy if exists "kisses_select" on public.kisses;
create policy "kisses_select" on public.kisses for select to authenticated using (true);
drop policy if exists "wishes_select" on public.wishes;
create policy "wishes_select" on public.wishes for select to authenticated using (true);
drop policy if exists "conflicts_select" on public.conflicts;
create policy "conflicts_select" on public.conflicts for select to authenticated using (true);
drop policy if exists "conflict_notes_select" on public.conflict_notes;
create policy "conflict_notes_select" on public.conflict_notes for select to authenticated using (true);

-- 写（自己发起）
drop policy if exists "milktea_requests_insert" on public.milktea_requests;
create policy "milktea_requests_insert" on public.milktea_requests for insert to authenticated with check (auth.uid() = requester);
drop policy if exists "kisses_insert" on public.kisses;
create policy "kisses_insert" on public.kisses for insert to authenticated with check (auth.uid() = requester);
drop policy if exists "wishes_insert" on public.wishes;
create policy "wishes_insert" on public.wishes for insert to authenticated with check (auth.uid() = owner);
drop policy if exists "conflicts_insert" on public.conflicts;
create policy "conflicts_insert" on public.conflicts for insert to authenticated with check (auth.uid() = started_by);
drop policy if exists "conflict_notes_insert" on public.conflict_notes;
create policy "conflict_notes_insert" on public.conflict_notes for insert to authenticated with check (auth.uid() = author);

-- 改（审批 / 兑现 / 标记完成 / 和好，都需要对方也能改）
drop policy if exists "milktea_requests_update" on public.milktea_requests;
create policy "milktea_requests_update" on public.milktea_requests for update to authenticated using (true);
drop policy if exists "kisses_update" on public.kisses;
create policy "kisses_update" on public.kisses for update to authenticated using (true);
drop policy if exists "wishes_update" on public.wishes;
create policy "wishes_update" on public.wishes for update to authenticated using (true);
drop policy if exists "conflicts_update" on public.conflicts;
create policy "conflicts_update" on public.conflicts for update to authenticated using (true);

-- ============ 表级权限 ============
grant select, insert, update, delete on public.milktea_requests to authenticated;
grant select, insert, update, delete on public.kisses to authenticated;
grant select, insert, update, delete on public.wishes to authenticated;
grant select, insert, update, delete on public.conflicts to authenticated;
grant select, insert, update, delete on public.conflict_notes to authenticated;


-- 检查结果：应能看到 5 张表
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('milktea_requests', 'kisses', 'wishes', 'conflicts', 'conflict_notes')
order by table_name;

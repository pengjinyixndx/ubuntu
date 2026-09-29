-- ============================================================
-- 青桃 · 核心 schema：profiles（账号档案）+ events（统一动态）
-- 用法：在 Supabase 控制台 -> SQL Editor 中整段执行
-- ============================================================

-- ============ 账号档案 ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  gender text check (gender is null or gender in ('male', 'female')),
  display_name text,
  created_at timestamptz not null default now()
);

-- 新账号创建后自动写入 profiles（gender 先留空，随后手动设置）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 统一动态 ============
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'note', 'diary', 'photo', 'milktea_issue', 'milktea_redeem', 'wish'
  )),
  content text,
  photo_urls text[],
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx
  on public.events (created_at desc);

-- ============ 行级安全（RLS）============
-- 本项目仅两个账号：登录即可读；只能写 / 改 / 删自己产生的数据
alter table public.profiles enable row level security;
alter table public.events enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update to authenticated using (auth.uid() = id);

drop policy if exists "events_select" on public.events;
create policy "events_select"
  on public.events for select to authenticated using (true);

drop policy if exists "events_insert_self" on public.events;
create policy "events_insert_self"
  on public.events for insert to authenticated
  with check (auth.uid() = actor_id);

drop policy if exists "events_update_self" on public.events;
create policy "events_update_self"
  on public.events for update to authenticated using (auth.uid() = actor_id);

drop policy if exists "events_delete_self" on public.events;
create policy "events_delete_self"
  on public.events for delete to authenticated using (auth.uid() = actor_id);

-- ============================================================
-- 初始化两个已有账号的性别（请把下面两个邮箱替换成你们的真实邮箱后执行）
-- ============================================================
update public.profiles
  set gender = 'male', display_name = '我'
  where email = 'male@example.com';

update public.profiles
  set gender = 'female', display_name = '她'
  where email = 'female@example.com';

-- 检查结果：应能看到两行，gender 分别为 male / female
select id, email, gender, display_name from public.profiles;

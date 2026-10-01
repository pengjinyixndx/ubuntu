-- ============================================================
-- 青桃 · 管理后台（独立账号，独立登录）
--
-- 用法：Supabase 控制台 → SQL Editor → 整段执行（可重复执行）
--
-- 思路：
--   「撤销」不是删行，而是给记录打一个 revoked_at 时间戳。
--   - 两个普通账号：数据库层面就只能查到 revoked_at 为空的记录，
--     所以被撤销的内容对他们来说「从来没出现过」；
--   - 后台账号：能看到全部（含已撤销的），并且可以恢复。
--   判断「是不是后台账号」写在数据库里（is_admin()），不靠前端藏页面。
-- ============================================================

-- ============ 1. 后台账号标记 ============
alter table public.profiles add column if not exists is_admin boolean not null default false;


-- ============ 2. 每张业务表加「撤销时间」 ============
alter table public.events           add column if not exists revoked_at timestamptz;
alter table public.milktea_requests add column if not exists revoked_at timestamptz;
alter table public.kisses           add column if not exists revoked_at timestamptz;
alter table public.wishes           add column if not exists revoked_at timestamptz;
alter table public.conflicts        add column if not exists revoked_at timestamptz;
alter table public.conflict_notes   add column if not exists revoked_at timestamptz;

create index if not exists events_revoked_idx on public.events (revoked_at);


-- ============ 3. 判定函数：当前登录者是不是后台账号 ============
-- security definer：函数内部读 profiles 时绕过 RLS，避免策略递归
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;


-- ============ 4. 读：后台看全部，普通账号只看没被撤销的 ============
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select to authenticated
  using (public.is_admin() or revoked_at is null);

drop policy if exists "milktea_requests_select" on public.milktea_requests;
create policy "milktea_requests_select" on public.milktea_requests for select to authenticated
  using (public.is_admin() or revoked_at is null);

drop policy if exists "kisses_select" on public.kisses;
create policy "kisses_select" on public.kisses for select to authenticated
  using (public.is_admin() or revoked_at is null);

drop policy if exists "wishes_select" on public.wishes;
create policy "wishes_select" on public.wishes for select to authenticated
  using (public.is_admin() or revoked_at is null);

drop policy if exists "conflicts_select" on public.conflicts;
create policy "conflicts_select" on public.conflicts for select to authenticated
  using (public.is_admin() or revoked_at is null);

drop policy if exists "conflict_notes_select" on public.conflict_notes;
create policy "conflict_notes_select" on public.conflict_notes for select to authenticated
  using (public.is_admin() or revoked_at is null);


-- ============ 5. 改：后台可以撤销 / 恢复任何一条 ============
-- events 原本只能改自己的，这里给后台开一条
drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update" on public.events for update to authenticated
  using (public.is_admin());

-- conflict_notes 原本没有 update 策略，后台需要改 revoked_at
drop policy if exists "conflict_notes_admin_update" on public.conflict_notes;
create policy "conflict_notes_admin_update" on public.conflict_notes for update to authenticated
  using (public.is_admin());

-- 其余几张表（milktea_requests / kisses / wishes / conflicts）本来就有
-- for update using (true) 的策略，后台已经能改，不用重复加。


-- ============ 6. 检查结果 ============
select 'profiles.is_admin' as 检查项, count(*)::text as 结果
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
union all
select '带 revoked_at 的表', string_agg(table_name, ', ' order by table_name)
  from information_schema.columns
 where table_schema = 'public' and column_name = 'revoked_at';

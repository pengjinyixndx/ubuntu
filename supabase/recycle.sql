-- ============================================================
-- 青桃 · 自己删除 / 回收站 / 90 天永久删除 / 实时
--
-- 规则（按你说的）：
--   1. 自己删 = 软删（写 revoked_at）：**双方都看不到**，
--      但在「我的 → 恢复」里本人可以自己恢复；后台始终看得见。
--   2. 后台删 = 直接删行，双方都不知情，不可恢复（已有 admin-delete.sql）。
--   3. 只有**文字类（随笔/日记）和照片类**能自己删；
--      请求类（奶茶请愿等）和亲亲**不能**自己删。
--      —— 这几类都在 events 表里，靠 type 区分，所以只动 events 的策略。
--   4. 撤销满 90 天后，由定时任务真删（连存储里的图片一起清）。
--
-- 用法：Supabase 控制台 → SQL Editor → 整段执行（可重复执行）
-- 前提：先跑过 schema.sql 和 admin.sql（要用到 public.is_admin()）
-- ============================================================


-- ============ 1. 看得见自己的"已删除"，别人的看不到 ============
-- 原来只允许 is_admin() 或 revoked_at is null：
-- 那样普通账号连自己删掉的东西都看不见，回收站就是空的。
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select to authenticated
  using (
    public.is_admin()                       -- 后台：全部可见
    or revoked_at is null                   -- 正常内容：两人都可见
    or actor_id = auth.uid()                -- 自己删掉的：只有本人可见（用于恢复）
  );

-- 自己能软删自己的（写/清 revoked_at）。
-- 注意 RLS 管不到"只改哪一列"，所以理论上也能改自己的正文——
-- 这个项目里只有你们两个人，不做列级限制。
drop policy if exists "events_update_self" on public.events;
create policy "events_update_self" on public.events for update to authenticated
  using (auth.uid() = actor_id)
  with check (auth.uid() = actor_id);


-- ============ 2. 实时：六张表加进 realtime 发布 ============
-- 订阅之后，对方一发东西这边立刻就能收到（不用刷新）
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.milktea_requests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.kisses;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.wishes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conflicts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conflict_notes;
  exception when duplicate_object then null;
  end;
end $$;


-- ============ 3. 满 90 天，真删 ============
create extension if not exists pg_cron;

-- 每天凌晨 3:30 扫一次
select cron.unschedule('qingtao-purge-90d')
 where exists (select 1 from cron.job where jobname = 'qingtao-purge-90d');

select cron.schedule(
  'qingtao-purge-90d',
  '30 3 * * *',
  $$
    -- 图片文件：photo_urls 存的是完整公开地址，
    -- storage.objects.name 存的是桶内相对路径，所以要把前缀切掉再比
    -- （删掉这行记录，公开地址就再也取不到这张图了；文件本身之后由 Supabase 回收）
    delete from storage.objects
     where bucket_id = 'photos'
       and name in (
         select regexp_replace(u, '^.*/object/public/photos/', '')
           from public.events e, unnest(e.photo_urls) as u
          where e.revoked_at is not null
            and e.revoked_at < now() - interval '90 days'
         union
         select regexp_replace(k.photo_url, '^.*/object/public/photos/', '')
           from public.kisses k
          where k.photo_url is not null
            and k.revoked_at is not null
            and k.revoked_at < now() - interval '90 days'
       );

    -- 六张表都要清：只清 events 的话，别处被撤销的行永远留着
    delete from public.events
     where revoked_at is not null and revoked_at < now() - interval '90 days';
    delete from public.milktea_requests
     where revoked_at is not null and revoked_at < now() - interval '90 days';
    delete from public.kisses
     where revoked_at is not null and revoked_at < now() - interval '90 days';
    delete from public.wishes
     where revoked_at is not null and revoked_at < now() - interval '90 days';
    delete from public.conflicts
     where revoked_at is not null and revoked_at < now() - interval '90 days';
    delete from public.conflict_notes
     where revoked_at is not null and revoked_at < now() - interval '90 days';
  $$
);


-- ============ 4. 检查结果 ============
select 'events 的 select 策略' as 检查项, qual as 内容
  from pg_policies
 where schemaname = 'public' and tablename = 'events' and policyname = 'events_select'
union all
select '定时任务', jobname || ' ／ ' || schedule
  from cron.job
 where jobname = 'qingtao-purge-90d'
union all
select '实时发布里的表', string_agg(tablename, ', ' order by tablename)
  from pg_publication_tables
 where pubname = 'supabase_realtime';

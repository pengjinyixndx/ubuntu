-- ============================================================
-- 青桃 · 后台补充：撤销 / 彻底删除 要能作用在**每一张**表上
--
-- 背景（第一个版本的漏洞）：
--   admin.sql 只给了 events 和 conflict_notes 的 update 策略，
--   而且**一张表都没有 delete 策略**。
--   于是「彻底删除」在数据库层面被拒绝——但 PostgREST 不报错、只是一行都不删，
--   界面上却把记录划掉了，刷新之后数据又回来（还保留着之前的撤销状态）。
--
-- 用法：Supabase 控制台 → SQL Editor → 整段执行（可重复执行）
-- 前提：先跑过 admin.sql（要用到 public.is_admin()）
-- ============================================================

-- ============ 1. 表级权限：后台账号也是 authenticated，得有 update / delete ============
grant select, insert, update, delete on public.events           to authenticated;
grant select, insert, update, delete on public.milktea_requests to authenticated;
grant select, insert, update, delete on public.kisses           to authenticated;
grant select, insert, update, delete on public.wishes           to authenticated;
grant select, insert, update, delete on public.conflicts        to authenticated;
grant select, insert, update, delete on public.conflict_notes   to authenticated;


-- ============ 2. 六张表：后台可改（撤销/恢复）、可删（彻底删除） ============
do $$
declare
  t text;
begin
  foreach t in array array[
    'events', 'milktea_requests', 'kisses', 'wishes', 'conflicts', 'conflict_notes'
  ]
  loop
    -- 改 revoked_at：撤销 / 恢复
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_update', t
    );

    -- 真删行：彻底删除
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || '_admin_delete', t
    );
  end loop;
end $$;


-- ============ 3. 检查结果：六张表都该有 _admin_update 和 _admin_delete ============
select tablename as 表, policyname as 策略, cmd as 动作
  from pg_policies
 where schemaname = 'public'
   and policyname like '%\_admin\_%'
 order by tablename, policyname;

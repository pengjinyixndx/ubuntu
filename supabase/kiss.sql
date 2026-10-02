-- ============================================================
-- 青桃 · 亲亲系统（她的「想亲」，和请愿亲亲）
--
-- 用法：Supabase 控制台 → SQL Editor → 整段执行（可重复执行）
-- ============================================================

-- ============ 1. 亲亲要能存理由和照片 ============
alter table public.kisses add column if not exists reason text;
alter table public.kisses add column if not exists photo_url text;


-- ============ 2. 动态表放开两种新类型 ============
-- milktea_request：她递过来的奶茶券请愿（不算券，所以不能混进 milktea_issue）
-- kiss           ：想亲、请愿亲亲、答应亲亲
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type in (
    'note', 'diary', 'photo',
    'milktea_issue', 'milktea_redeem', 'milktea_request',
    'wish', 'kiss'
  ));


-- ============ 3. 检查结果 ============
select 'kisses 新字段' as 检查项,
       string_agg(column_name, ', ' order by column_name) as 结果
  from information_schema.columns
 where table_schema = 'public' and table_name = 'kisses'
   and column_name in ('reason', 'photo_url')
union all
select 'events 允许的类型', pg_get_constraintdef(oid)
  from pg_constraint
 where conname = 'events_type_check';

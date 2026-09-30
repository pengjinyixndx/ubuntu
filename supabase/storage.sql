-- ============================================================
-- 青桃 · 增量脚本（在已建好 schema 的项目上执行一次即可）
--
-- 内容：
--   1) events 表新增动态类型 'milktea'（喝奶茶 · 随手记一杯）
--   2) 新建图片存储桶 photos + 访问策略（随笔单图 / 照片多图用）
--
-- 用法：Supabase 控制台 → SQL Editor → 整段粘贴执行
-- ============================================================


-- ============ 1. events 类型新增 milktea ============
alter table public.events drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check check (type in (
    'note', 'diary', 'photo', 'milktea', 'milktea_issue', 'milktea_redeem', 'wish'
  ));


-- ============ 2. 图片存储桶 ============
-- 公开可读（拿到 URL 就能显示），登录用户可上传
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 读：登录用户都能看
drop policy if exists "photos_read" on storage.objects;
create policy "photos_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos');

-- 传：登录用户都能传
drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');

-- 改 / 删：只能动自己传的
drop policy if exists "photos_update" on storage.objects;
create policy "photos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());

drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());


-- 检查结果：应能看到 photos 桶
select id, name, public from storage.buckets where id = 'photos';

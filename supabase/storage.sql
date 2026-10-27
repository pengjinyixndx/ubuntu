-- ============================================================
-- 青桃 · 图片存储桶（在已建好 schema 的项目上执行一次即可）
--
-- 用途：随笔的单张随手拍、照片页的一整组照片，都要传到这里。
-- 前提：先跑过 supabase/admin.sql（删除策略要用到 public.is_admin()）
-- 用法：Supabase 控制台 → SQL Editor → 整段粘贴执行
-- ============================================================

-- 建桶：公开可读（拿到 URL 就能显示），登录用户可上传
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

-- 删：自己的文件；后台账号（is_admin）可以删任何一条记录对应的图，
-- 否则「彻底删除」删掉了数据库行，图片文件却永远留在桶里。
drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (owner = auth.uid() or public.is_admin()));


-- 检查结果：应能看到 photos 桶
select id, name, public from storage.buckets where id = 'photos';

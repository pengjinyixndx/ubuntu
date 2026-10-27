# 青桃 · Supabase 数据库脚本

> 所有脚本都在 Supabase 控制台 → **SQL Editor** 里整段粘贴执行。
> 除了 `schema.sql` 首次建表，其余脚本都写成可重复执行（`if exists` / `if not exists` / 先 drop 再 create）。

## 一、按这个顺序跑

| 顺序 | 文件 | 干什么 | 前提 |
| --- | --- | --- | --- |
| 1 | `schema.sql` | 建 `profiles`（账号档案）+ `events`（统一动态）两张核心表；建注册触发器；开 RLS、给 GRANT。最后有两段按邮箱初始化性别/昵称的 SQL，**要替换成你们真实的邮箱再执行**。 | 空库 / 已有 auth 用户 |
| 2 | `petition.sql` | 建请愿相关的 5 张表：`milktea_requests`、`kisses`、`wishes`、`conflicts`、`conflict_notes`；开 RLS、给 GRANT。 | 先跑过 schema.sql |
| 3 | `admin.sql` | 后台账号：`profiles.is_admin`；六张业务表加 `revoked_at`（撤销时间）；建 `public.is_admin()`；把六张表的 select 策略改成「后台看全部 / 普通账号只看没撤销的」；补 events、conflict_notes 的后台 update 策略。 | 先跑过 petition.sql |
| 4 | `admin-delete.sql` | 给六张表补 GRANT，并逐表建「后台可撤销/恢复（update）」+「后台可彻底删除（delete）」策略。**没有它，后台点删除会「看起来成功了但一行没删」。** | 先跑过 admin.sql（要用 `is_admin()`） |
| 5 | `recycle.sql` | 自己删除 / 恢复：改 `events_select` 让本人能看到自己删掉的；改 `events_update_self`；把六张表加进 realtime；建 `pg_cron` 任务，每天 03:30 真删撤销满 90 天的行和图片。 | 先跑过 admin.sql |
| 6 | `kiss.sql` | 给 `kisses` 加 `reason` / `photo_url`；**重建 `events_type_check`，把 `kiss` 和 `milktea_request` 放进去**。 | 先跑过 schema.sql、petition.sql |
| 7 | `storage.sql` | 建 `photos` 公开桶；读 / 传 / 改 / 删四条策略。删除策略现在是「自己的文件 **或** 后台账号」。 | 先跑过 admin.sql（要用 `is_admin()`） |

### 为什么 storage.sql 要排在 admin.sql 后面

`photos_delete` 策略里用了 `public.is_admin()`。函数是 `admin.sql` 建的；
如果先跑 storage.sql，会直接报 `function public.is_admin() does not exist`。

### 只改过 storage.sql 的话

如果之前已经跑过整套、这次只是更新了 `storage.sql`，**只需要把 `storage.sql` 重新整段跑一遍**。
它 `drop policy if exists` 之后重建，重复执行是安全的。旧的 `photos_delete`
只允许 `owner = auth.uid()`，后台账号删别人的图会被 RLS 静默挡住，表现为：
数据库行删掉了，存储桶里的图还在（后台「彻底删除」看起来成功、文件却永远留着）。

## 二、`events.type` 的坑（必须知道）

`schema.sql` 里 `events` 的类型约束只允许这 6 种：

```
note, diary, photo, milktea_issue, milktea_redeem, wish
```

**它不含 `kiss` 和 `milktea_request`。** 这两个类型是后来加的功能，只在 `kiss.sql`
里通过「先 drop 掉旧约束、再 add 新约束」补进去。

症状：发亲亲 / 递奶茶请愿时报

```
new row for relation "events" violates check constraint "events_type_check"
```

处理：把 `kiss.sql` 整段重跑一遍。**不要**只改前端类型或跳过这条——数据库会把写入直接拒掉。

另一个注意点：`schema.sql` 用的是 `create table if not exists`。
库里已经有 `events` 时，重跑 `schema.sql` **不会**把约束改回旧的，也不会自动补上新类型；
新类型只认 `kiss.sql`。所以「重建库 / 换 Supabase 项目」时，顺序必须是 schema → ... → kiss。

## 三、怎么自检

在 SQL Editor 里逐段跑，结果和「应该看到」对一下。

### 1. 六张业务表与关键列

```sql
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name in (
     'profiles','events','milktea_requests','kisses','wishes','conflicts','conflict_notes'
   )
   and column_name in ('is_admin','revoked_at','reason','photo_url')
 order by table_name, column_name;
```

应该看到：`profiles.is_admin`；六张业务表都有 `revoked_at`；`kisses` 有 `reason`、`photo_url`。

### 2. `events` 到底允许哪些类型

```sql
select pg_get_constraintdef(oid) as events_type_check
  from pg_constraint
 where conname = 'events_type_check';
```

结果里必须同时出现 `kiss` 和 `milktea_request`。没有 → 重跑 `kiss.sql`。

### 3. 后台的撤销 / 删除策略是不是每张表都有

```sql
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and policyname like '%\_admin\_%'
 order by tablename, policyname;
```

应该看到六张表 × 两条策略（`_admin_update`、`_admin_delete`）。
少了 delete → 重跑 `admin-delete.sql`。

### 4. 普通账号的访问策略

```sql
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('events','milktea_requests','kisses','wishes','conflicts','conflict_notes')
 order by tablename, policyname;
```

重点看 `events_select` 的最后定义（`recycle.sql` 会覆盖前面的）：
应包含 `is_admin()`、`revoked_at is null`、`actor_id = auth.uid()` 三个分支。

### 5. 存储桶与删除策略

```sql
select id, name, public from storage.buckets where id = 'photos';

select polname, pg_get_expr(polqual, polrelid) as using_expr
  from pg_policy
 where polrelid = 'storage.objects'::regclass
   and polname in ('photos_read','photos_insert','photos_update','photos_delete');
```

`photos_delete` 的 `using_expr` 里应出现 `is_admin()`；只有 `owner = auth.uid()` 说明还是旧版，重跑 `storage.sql`。

### 6. 实时发布里有没有六张表

```sql
select tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
 order by tablename;
```

### 7. 90 天清理任务在不在

```sql
select jobname, schedule, active from cron.job where jobname = 'qingtao-purge-90d';
```

### 8. 后台账号标记（记得改成后台账号的邮箱）

```sql
update public.profiles set is_admin = true where email = 'admin@example.com';
select id, email, is_admin from public.profiles order by created_at;
```

只有一行是 `true`；两个正常账号必须都是 `false`。

## 四、各脚本会删 / 改什么（备份时看这张表）

- `schema.sql`：只 `create ... if not exists`；会 `drop trigger if exists` 后重建触发器；
  会改/补 `profiles` 的行（最后两段 `update ... where email = '...'`，还有补建 profiles 的 insert）。
- `petition.sql`：只建表 / 索引 / 策略，不删数据；策略是 `drop policy if exists` 后重建。
- `admin.sql`：加列（不删列）；`drop policy if exists` 后重建六张表的 select 策略。
- `admin-delete.sql`：给 GRANT；`drop policy if exists` 后重建六张表的 `_admin_update` / `_admin_delete`。
- `recycle.sql`：覆盖 `events_select`、`events_update_self`；改 realtime 发布；建 `pg_cron` 任务
  （任务会真删撤销满 90 天的行与图片，日常执行不需要手动跑）。
- `kiss.sql`：加列；**drop 并重建 `events_type_check`**。
- `storage.sql`：建桶；重建四条 storage 策略。

没有任何脚本会 `drop table` 或 `truncate`。真正会删数据的是 `recycle.sql` 里的定时任务，
以及后台页面上的「彻底删除 / 清空已撤销 / 按时间清空」。

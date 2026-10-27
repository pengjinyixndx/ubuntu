/* ============================================================
   青桃 · Supabase 数据源（线上真实读写）
   ============================================================ */

import { supabase } from './supabase'
import type {
  AdminRecord,
  Conflict,
  ConflictNote,
  ConflictStatus,
  CoupleEvent,
  Kiss,
  MilkteaRequest,
  Profile,
  RequestStatus,
  Wish
} from '../types/domain'
import type { FeedSource, LoadResult, PublishInput, PublishResult, Result, UploadResult } from './feedSource'
import { ADMIN_TABLES, buildAdminRecords } from './adminRecords'
import { imageExt, makeThumb, thumbPathOf } from './image'

/** 图片存储桶名（需在 Supabase 建好，见 supabase/storage.sql） */
const BUCKET = 'photos'

/** 当前登录者 id */
async function myId(): Promise<string | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function fail(scope: string, error: unknown) {
  console.error(`[青桃] ${scope}：`, error)
}

/**
 * 改一行并确认**真的改到了**。
 * PostgREST 在 RLS 没放行时不会报错、却一行也不改；不把 id 取回来数，
 * 前端就会显示「成功」而数据库什么都没变（她点「好呀」没反应）。
 */
async function updateOrFail(
  table: string,
  patch: Record<string, unknown>,
  id: string,
  scope: string
): Promise<{ error: unknown }> {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('id')
  if (error) {
    fail(scope, error)
    return { error }
  }
  if (!data || data.length === 0) {
    const message = `${scope}：数据库一行都没改到（检查这一张表的更新策略）`
    fail(scope, message)
    return { error: message }
  }
  return { error: null }
}

/**
 * 从「除我以外的档案」里挑出对象。
 * - 优先排除后台账号（is_admin === true）；这一列可能不存在，所以只做过滤条件、不写进查询；
 * - 剩下的如果不止一个（is_admin 列还没跑），取**注册时间离我最近**的那个：
 *   两个人前后脚注册，后台账号通常隔得更远，比「列表里第一个」稳得多；
 * - 绝不因为挑不出来就退回我自己。
 */
export function pickPartner(profiles: Profile[], uid: string): Profile | null {
  let me: Profile | null = null
  const others: Profile[] = []
  for (const p of profiles) {
    if (p.id === uid) me = p
    else others.push(p)
  }
  if (!others.length) return null

  const normal = others.filter((p) => p.is_admin !== true)
  const pool = normal.length ? normal : others

  if (pool.length === 1) return pool[0] ?? null

  if (pool.length > 1) {
    console.warn(`[青桃] 除你之外有 ${pool.length} 个档案，按注册时间取最近的一个当对象`)
  }
  const meAt = me?.created_at ? Date.parse(me.created_at) : NaN
  const distance = (p: Profile): number => {
    const t = p.created_at ? Date.parse(p.created_at) : NaN
    return Number.isFinite(meAt) && Number.isFinite(t) ? Math.abs(t - meAt) : Number.POSITIVE_INFINITY
  }
  return (
    pool
      .slice()
      .sort((a, b) => {
        const da = distance(a)
        const db = distance(b)
        if (da !== db) return da - db
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })[0] ?? null
  )
}

export const supabaseSource: FeedSource = {
  async getMe(): Promise<Profile | null> {
    const uid = await myId()
    if (!uid) return null

    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()

    if (error) {
      fail('读取档案失败', error)
      return null
    }
    if (!data) {
      console.warn('[青桃] profiles 里没有你的档案行（注册触发器可能没跑）')
      return null
    }
    return data as Profile
  },

  async getPartner(): Promise<Profile | null> {
    const uid = await myId()
    if (!uid) return null

    /* 注意：**不要**把 is_admin 写进查询条件。
       万一 admin.sql 还没跑，这一列根本不存在，整个查询会直接报错，
       对方档案就永远拿不到——表现就是「两个账号都指向同一个人」。
       所以先把档案全部取回来，再在本地挑掉后台账号。 */
    const { data, error } = await supabase.from('profiles').select('*')

    if (error) {
      fail('读取对方档案失败', error)
      return null
    }

    const list = (data ?? []) as Profile[]
    const partner = pickPartner(list, uid)
    if (!partner) {
      console.warn('[青桃] 除自己以外没有别的档案，拿不到对象')
      return null
    }
    return partner
  },

  async updateProfile(patch): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    return updateOrFail('profiles', patch, uid, '保存档案失败')
  },

  async setOwnRevoked(id: string, revoked: boolean): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }

    // 同样要数影响的行：策略没放行时不会报错，但一行也没改
    const { data, error } = await supabase
      .from('events')
      .update({ revoked_at: revoked ? new Date().toISOString() : null })
      .eq('id', id)
      .eq('actor_id', uid)
      .select('id')

    if (error) {
      fail('删除/恢复失败', error)
      return { error }
    }
    if (!data || data.length === 0) {
      return { error: '数据库一行都没改到（检查 recycle.sql 里的策略跑没跑）' }
    }
    return { error: null }
  },

  async listMyRevoked(): Promise<Result<CoupleEvent[]>> {
    const uid = await myId()
    if (!uid) return { data: [], error: null }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('actor_id', uid)
      .not('revoked_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) fail('读取回收站失败', error)
    return { data: (data ?? []) as CoupleEvent[], error }
  },

  async listEvents(limit: number): Promise<LoadResult> {
    /* 必须显式排除已撤销的。
       recycle.sql 把 select 策略放成了「自己的已撤销也可见」（回收站要用），
       不筛的话——**自己删掉的东西会重新出现在自己的展示流里**。
       以前是靠策略顺带挡住的，策略一改就露出来了。 */
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) fail('读取动态失败', error)
    return { data: (data ?? []) as CoupleEvent[], error }
  },

  async addEvent(input: PublishInput): Promise<PublishResult> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }

    // select 把插入后的整行带回来：调用方可以直接插进流里，不用再全量拉一遍
    const { data, error } = await supabase
      .from('events')
      .insert({
        actor_id: uid,
        type: input.type,
        content: input.content ?? null,
        photo_urls: input.photo_urls ?? null,
        meta: input.meta ?? null
      })
      .select('*')
      .single()

    if (error) {
      fail('写入动态失败', error)
      return { error }
    }
    return { error: null, data: data as CoupleEvent }
  },

  async uploadPhoto(file: File): Promise<UploadResult> {
    const uid = await myId()
    if (!uid) return { url: null, error: '未登录' }

    /* 扩展名不能只从文件名来：相机 / 剪贴板的 File 可能没有名字或没有点。
       没有扩展名时 Supabase 会按 octet-stream 返回，<img> 直接加载失败。 */
    const ext = imageExt(file)
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const thumbPath = thumbPathOf(path)
    const isThumbable = /\.(jpe?g|png|webp)$/i.test(path)

    /* 缓存给一年：文件名带时间戳、永不重复，所以不会看到旧图。
       原来是 1 小时，等于每次打开都重新下载。 */
    const uploadOriginal = supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || undefined
    })

    /* 缩略图：以前是完全撒手不管的后台补传，列表可能先拿到一个 404，
       显示端（首页卡片）会直接显示占位图。现在等它传完再返回 URL，
       但生成和上传与原图并行，不会把两次串行。
       缩略图只是加速；万一压不出来，就把原图字节再传一份到 -t.jpg，
       保证「有原图就一定有缩略图」这个约定成立。 */
    const uploadThumb = (async () => {
      if (!isThumbable) return
      try {
        const thumb = await makeThumb(file)
        const { error } = await supabase.storage.from(BUCKET).upload(thumbPath, thumb, {
          cacheControl: '31536000',
          upsert: true,
          contentType: 'image/jpeg'
        })
        if (error) throw error
      } catch (e) {
        // 退而求其次：原图复制成缩略图，至少地址不会 404
        const { error } = await supabase.storage.from(BUCKET).upload(thumbPath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || undefined
        })
        if (error) fail('补传缩略图失败（列表里可能显示占位图）', error)
        else console.warn('[青桃] 缩略图没生成出来，先用原图顶上：', e)
      }
    })()

    const [original] = await Promise.all([uploadOriginal, uploadThumb])
    if (original.error) {
      fail('上传照片失败', original.error)
      return { url: null, error: original.error }
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  },

  /* —— 奶茶券请求 —— */
  async listMilkteaRequests(): Promise<Result<MilkteaRequest[]>> {
    const { data, error } = await supabase
      .from('milktea_requests')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) fail('读取奶茶券请求失败', error)
    return { data: (data ?? []) as MilkteaRequest[], error }
  },

  async addMilkteaRequest(input): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase
      .from('milktea_requests')
      .insert({ requester: uid, reason: input.reason ?? null })
    if (error) fail('发起奶茶券请求失败', error)
    return { error }
  },

  async resolveMilkteaRequest(id, status: Exclude<RequestStatus, 'pending'>) {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    return updateOrFail(
      'milktea_requests',
      { status, resolver: uid, resolved_at: new Date().toISOString() },
      id,
      '审批奶茶券请求失败'
    )
  },

  /* —— 亲亲 —— */
  async listKisses(): Promise<Result<Kiss[]>> {
    const { data, error } = await supabase
      .from('kisses')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) fail('读取亲亲记录失败', error)
    return { data: (data ?? []) as Kiss[], error }
  },

  async addKiss(input): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase.from('kisses').insert({
      requester: uid,
      count: input.count ?? 1,
      status: input.free ? 'free' : 'pending',
      reason: input.reason ?? null,
      photo_url: input.photoUrl ?? null
    })
    if (error) fail('请求亲亲失败', error)
    return { error }
  },

  async resolveKiss(id, status: 'approved' | 'rejected') {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    return updateOrFail(
      'kisses',
      { status, resolver: uid, resolved_at: new Date().toISOString() },
      id,
      '处理亲亲请求失败'
    )
  },

  async redeemKiss(id): Promise<{ error: unknown }> {
    return updateOrFail('kisses', { redeemed: true }, id, '兑现亲亲失败')
  },

  /* —— 心愿 —— */
  async listWishes(): Promise<Result<Wish[]>> {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) fail('读取心愿失败', error)
    return { data: (data ?? []) as Wish[], error }
  },

  async addWish(input): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase
      .from('wishes')
      .insert({ owner: uid, content: input.content, want_at: input.want_at || null })
    if (error) fail('添加心愿失败', error)
    return { error }
  },

  async setWishDone(id, done: boolean): Promise<{ error: unknown }> {
    return updateOrFail(
      'wishes',
      { done, done_at: done ? new Date().toISOString() : null },
      id,
      '更新心愿失败'
    )
  },

  /* —— 矛盾记录 —— */
  async listConflicts(): Promise<Result<Conflict[]>> {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) fail('读取矛盾失败', error)
    return { data: (data ?? []) as Conflict[], error }
  },

  async startConflict(): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase.from('conflicts').insert({ started_by: uid })
    if (error) fail('发起矛盾记录失败', error)
    return { error }
  },

  async listConflictNotes(): Promise<Result<ConflictNote[]>> {
    const { data, error } = await supabase
      .from('conflict_notes')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) fail('读取矛盾记录失败', error)
    return { data: (data ?? []) as ConflictNote[], error }
  },

  async addConflictNote(input): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase.from('conflict_notes').insert({
      conflict_id: input.conflict_id,
      author: uid,
      happened_on: input.happened_on ?? null,
      matter: input.matter,
      demand: input.demand
    })
    if (error) fail('写入矛盾记录失败', error)
    return { error }
  },

  async setConflictStatus(id, status: ConflictStatus): Promise<{ error: unknown }> {
    return updateOrFail(
      'conflicts',
      { status, updated_at: new Date().toISOString() },
      id,
      '更新矛盾状态失败'
    )
  },

  /* ============================================================
     管理后台：独立账号 + 独立登录，和两人那套不共用
     ============================================================ */
  async adminSignIn(email: string, password: string): Promise<{ error: unknown }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) fail('后台登录失败', error)
    return { error }
  },

  async adminSignOut(): Promise<void> {
    await supabase.auth.signOut()
  },

  async adminCheck(): Promise<boolean> {
    const uid = await myId()
    if (!uid) return false
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      fail('后台身份校验失败（是否还没跑 supabase/admin.sql？）', error)
      return false
    }
    return !!(data as { is_admin?: boolean } | null)?.is_admin
  },

  async adminListAll(): Promise<Result<AdminRecord[]>> {
    const [events, reqs, kisses, wishes, conflicts, notes] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('milktea_requests').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('kisses').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('wishes').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('conflicts').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('conflict_notes').select('*').order('created_at', { ascending: false }).limit(500)
    ])

    const firstError =
      events.error || reqs.error || kisses.error || wishes.error || conflicts.error || notes.error
    if (firstError) fail('后台读取记录失败', firstError)

    // 后台账号能看到全部（含已撤销），这一点由数据库里的 is_admin() 策略保证
    const data = buildAdminRecords({
      events: (events.data ?? []) as CoupleEvent[],
      requests: (reqs.data ?? []) as MilkteaRequest[],
      kisses: (kisses.data ?? []) as Kiss[],
      wishes: (wishes.data ?? []) as Wish[],
      conflicts: (conflicts.data ?? []) as Conflict[],
      notes: (notes.data ?? []) as ConflictNote[]
    })
    return { data, error: firstError }
  },

  async adminSetRevoked(table: string, id: string, revoked: boolean): Promise<{ error: unknown }> {
    if (!(ADMIN_TABLES as readonly string[]).includes(table)) return { error: '不允许的表' }

    // 同样要把改到的行取回来数：策略没放行时不会报错，但一行也没改
    const { data, error } = await supabase
      .from(table)
      .update({ revoked_at: revoked ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')

    if (error) {
      fail(`撤销/恢复失败（${table}）`, error)
      return { error }
    }
    if (!data || data.length === 0) {
      return { error: '数据库一行都没改到——后台的更新策略可能还没生效' }
    }
    return { error: null }
  },

  async adminListProfiles(): Promise<Result<Profile[]>> {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) fail('后台读取档案失败', error)
    return { data: (data ?? []) as Profile[], error }
  },

  /* —— 清理工具：彻底删除（连照片一起）、清空已撤销、按时间清空 —— */
  async adminPurge(table: string, id: string): Promise<{ error: unknown }> {
    if (!(ADMIN_TABLES as readonly string[]).includes(table)) return { error: '不允许的表' }

    // 先把图片地址取出来；**删完行再删文件**，否则删除被策略挡住时，
    // 数据还在、图已经没了（看起来像「删了但没删干净」）。
    let photoUrls: string[] = []
    if (table === 'events') {
      const { data } = await supabase.from('events').select('photo_urls').eq('id', id).maybeSingle()
      photoUrls = ((data as { photo_urls?: string[] } | null)?.photo_urls ?? []) as string[]
    } else if (table === 'kisses') {
      const { data } = await supabase.from('kisses').select('photo_url').eq('id', id).maybeSingle()
      const url = (data as { photo_url?: string | null } | null)?.photo_url
      if (url) photoUrls = [url]
    }

    /* 关键：把删掉的行取回来数一数。
       RLS 没放行时 PostgREST **不报错、却一行都没删**——
       不自己查的话，界面会显示「已彻底删除」，一刷新数据又回来了。 */
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id')
    if (error) {
      fail(`彻底删除失败（${table}）`, error)
      return { error }
    }
    if (!data || data.length === 0) {
      return { error: '数据库一行都没删掉——后台的删除策略可能还没生效' }
    }
    if (photoUrls.length) await removePhotos(photoUrls)
    return { error: null }
  },

  async adminPurgeRevoked(): Promise<{ count: number; error: unknown }> {
    // 先记下 id → 图片地址；只删「真的删掉了」的那些行的文件，
    // 免得策略挡住删除时数据还在、图先没了。
    const photoByKey = new Map<string, string[]>()
    const { data: evs, error: readErr } = await supabase
      .from('events')
      .select('id, photo_urls')
      .not('revoked_at', 'is', null)
    if (readErr) fail('读取已撤销照片失败', readErr)
    for (const e of (evs ?? []) as { id: string; photo_urls?: string[] }[]) {
      if (e.photo_urls?.length) photoByKey.set(`events:${e.id}`, e.photo_urls)
    }

    const { data: ks } = await supabase
      .from('kisses')
      .select('id, photo_url')
      .not('revoked_at', 'is', null)
    for (const k of (ks ?? []) as { id: string; photo_url?: string | null }[]) {
      if (k.photo_url) photoByKey.set(`kisses:${k.id}`, [k.photo_url])
    }

    let count = 0
    let firstError: unknown = null
    const deletedKeys: string[] = []
    for (const t of ADMIN_TABLES) {
      const { data, error } = await supabase
        .from(t)
        .delete()
        .not('revoked_at', 'is', null)
        .select('id')
      if (error) {
        fail(`清空已撤销失败（${t}）`, error)
        if (!firstError) firstError = error
      }
      for (const row of (data ?? []) as { id: string }[]) {
        deletedKeys.push(`${t}:${row.id}`)
        count += 1
      }
    }
    await removePhotos(deletedKeys.flatMap((k) => photoByKey.get(k) ?? []))
    return { count, error: firstError }
  },

  async adminPurgeBefore(before: string): Promise<{ count: number; error: unknown }> {
    // 传进来的是本地那天的 00:00，转成 ISO 再比
    const iso = new Date(`${before}T00:00:00`).toISOString()

    const photoByKey = new Map<string, string[]>()
    const { data: evs, error: readErr } = await supabase
      .from('events')
      .select('id, photo_urls')
      .lt('created_at', iso)
    if (readErr) fail('读取待删照片失败', readErr)
    for (const e of (evs ?? []) as { id: string; photo_urls?: string[] }[]) {
      if (e.photo_urls?.length) photoByKey.set(`events:${e.id}`, e.photo_urls)
    }
    const { data: ks } = await supabase
      .from('kisses')
      .select('id, photo_url')
      .lt('created_at', iso)
    for (const k of (ks ?? []) as { id: string; photo_url?: string | null }[]) {
      if (k.photo_url) photoByKey.set(`kisses:${k.id}`, [k.photo_url])
    }

    let count = 0
    let firstError: unknown = null
    const deletedKeys: string[] = []
    for (const t of ADMIN_TABLES) {
      const { data, error } = await supabase.from(t).delete().lt('created_at', iso).select('id')
      if (error) {
        fail(`按时间清空失败（${t}）`, error)
        if (!firstError) firstError = error
      }
      for (const row of (data ?? []) as { id: string }[]) {
        deletedKeys.push(`${t}:${row.id}`)
        count += 1
      }
    }
    await removePhotos(deletedKeys.flatMap((k) => photoByKey.get(k) ?? []))
    return { count, error: firstError }
  }
}

/** 从公开地址里取出它在存储桶里的相对路径 */
function storagePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i < 0) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '')
}

/** 把一批图片文件从存储桶里删掉（一次最多 100 个） */
async function removePhotos(urls: string[]): Promise<void> {
  const paths = urls.map(storagePath).filter((p): p is string => !!p)
  if (!paths.length) return
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) fail('删除图片文件失败', error)
  }
}

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
import type { FeedSource, LoadResult, PublishInput, Result, UploadResult } from './feedSource'
import { ADMIN_TABLES, buildAdminRecords } from './adminRecords'

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

export const supabaseSource: FeedSource = {
  async getMe(): Promise<Profile | null> {
    const uid = await myId()
    if (!uid) return null

    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()

    if (error) {
      fail('读取档案失败', error)
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
       所以先把除自己以外的全部取回来，再在本地挑掉后台账号。 */
    const { data, error } = await supabase.from('profiles').select('*').neq('id', uid)

    if (error) {
      fail('读取对方档案失败', error)
      return null
    }

    const list = (data ?? []) as Profile[]
    const partner = list.find((p) => p.is_admin !== true) ?? list[0] ?? null
    return partner
  },

  async updateProfile(patch): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
    if (error) fail('保存档案失败', error)
    return { error }
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) fail('读取动态失败', error)
    return { data: (data ?? []) as CoupleEvent[], error }
  },

  async addEvent(input: PublishInput): Promise<{ error: unknown }> {
    const uid = await myId()
    if (!uid) return { error: '未登录' }

    const { error } = await supabase.from('events').insert({
      actor_id: uid,
      type: input.type,
      content: input.content ?? null,
      photo_urls: input.photo_urls ?? null,
      meta: input.meta ?? null
    })

    if (error) fail('写入动态失败', error)
    return { error }
  },

  async uploadPhoto(file: File): Promise<UploadResult> {
    const uid = await myId()
    if (!uid) return { url: null, error: '未登录' }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

    if (error) {
      fail('上传照片失败', error)
      return { url: null, error }
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  },

  /* —— 奶茶券请求 —— */
  async listMilkteaRequests(): Promise<Result<MilkteaRequest[]>> {
    const { data, error } = await supabase
      .from('milktea_requests')
      .select('*')
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
    const { error } = await supabase
      .from('milktea_requests')
      .update({ status, resolver: uid, resolved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fail('审批奶茶券请求失败', error)
    return { error }
  },

  /* —— 亲亲 —— */
  async listKisses(): Promise<Result<Kiss[]>> {
    const { data, error } = await supabase
      .from('kisses')
      .select('*')
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
    const { error } = await supabase
      .from('kisses')
      .update({ status, resolver: uid, resolved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fail('处理亲亲请求失败', error)
    return { error }
  },

  async redeemKiss(id): Promise<{ error: unknown }> {
    const { error } = await supabase.from('kisses').update({ redeemed: true }).eq('id', id)
    if (error) fail('兑现亲亲失败', error)
    return { error }
  },

  /* —— 心愿 —— */
  async listWishes(): Promise<Result<Wish[]>> {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
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
    const { error } = await supabase
      .from('wishes')
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) fail('更新心愿失败', error)
    return { error }
  },

  /* —— 矛盾记录 —— */
  async listConflicts(): Promise<Result<Conflict[]>> {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
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
    const { error } = await supabase
      .from('conflicts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fail('更新矛盾状态失败', error)
    return { error }
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

    // events 和 亲亲请愿 都可能带图片文件，一起删，不然桶里会留垃圾
    if (table === 'events') {
      const { data } = await supabase.from('events').select('photo_urls').eq('id', id).maybeSingle()
      await removePhotos(((data as { photo_urls?: string[] } | null)?.photo_urls ?? []) as string[])
    } else if (table === 'kisses') {
      const { data } = await supabase.from('kisses').select('photo_url').eq('id', id).maybeSingle()
      const url = (data as { photo_url?: string | null } | null)?.photo_url
      if (url) await removePhotos([url])
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
    return { error: null }
  },

  async adminPurgeRevoked(): Promise<{ count: number; error: unknown }> {
    const { data: evs, error: readErr } = await supabase
      .from('events')
      .select('photo_urls')
      .not('revoked_at', 'is', null)
    if (readErr) fail('读取已撤销照片失败', readErr)

    const { data: ks } = await supabase
      .from('kisses')
      .select('photo_url')
      .not('revoked_at', 'is', null)
    await removePhotos([
      ...((evs ?? []) as { photo_urls?: string[] }[]).flatMap((e) => e.photo_urls ?? []),
      ...((ks ?? []) as { photo_url?: string | null }[])
        .map((k) => k.photo_url)
        .filter((u): u is string => !!u)
    ])

    let count = 0
    for (const t of ADMIN_TABLES) {
      const { data, error } = await supabase
        .from(t)
        .delete()
        .not('revoked_at', 'is', null)
        .select('id')
      if (error) fail(`清空已撤销失败（${t}）`, error)
      count += (data ?? []).length
    }
    return { count, error: null }
  },

  async adminPurgeBefore(before: string): Promise<{ count: number; error: unknown }> {
    // 传进来的是本地那天的 00:00，转成 ISO 再比
    const iso = new Date(`${before}T00:00:00`).toISOString()

    const { data: evs, error: readErr } = await supabase
      .from('events')
      .select('photo_urls')
      .lt('created_at', iso)
    if (readErr) fail('读取待删照片失败', readErr)

    const { data: ks } = await supabase.from('kisses').select('photo_url').lt('created_at', iso)
    await removePhotos([
      ...((evs ?? []) as { photo_urls?: string[] }[]).flatMap((e) => e.photo_urls ?? []),
      ...((ks ?? []) as { photo_url?: string | null }[])
        .map((k) => k.photo_url)
        .filter((u): u is string => !!u)
    ])

    let count = 0
    for (const t of ADMIN_TABLES) {
      const { data, error } = await supabase.from(t).delete().lt('created_at', iso).select('id')
      if (error) fail(`按时间清空失败（${t}）`, error)
      count += (data ?? []).length
    }
    return { count, error: null }
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

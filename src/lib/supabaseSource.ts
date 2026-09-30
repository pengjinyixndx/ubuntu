/* ============================================================
   青桃 · Supabase 数据源（线上真实读写）
   ============================================================ */

import { supabase } from './supabase'
import type {
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .limit(1)
      .maybeSingle()

    if (error) {
      fail('读取对方档案失败', error)
      return null
    }
    return (data as Profile) ?? null
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
      status: input.free ? 'free' : 'pending'
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
  }
}

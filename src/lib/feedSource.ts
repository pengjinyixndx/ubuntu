/* ============================================================
   青桃 · 数据源接口

   全站的数据都从这里进出，抽象成接口的好处：
   1) 断网或没连上 Supabase 时，整体换成内存实现，照常调 UI；
   2) 首页动态、奶茶券、亲亲、心愿、矛盾都复用同一套读写方式。
   ============================================================ */

import type {
  Conflict,
  ConflictNote,
  ConflictStatus,
  CoupleEvent,
  Gender,
  Kiss,
  MilkteaRequest,
  Profile,
  RequestStatus,
  Wish
} from '../types/domain'

/** 发布动态时的入参：actor_id 由实现方补上，调用方不用管 */
export interface PublishInput {
  type: CoupleEvent['type']
  content?: string
  photo_urls?: string[]
  meta?: Record<string, unknown>
}

/** 通用返回：失败时 error 有值，data 仍可能是缓存 */
export interface Result<T> {
  data: T
  error: unknown
}

export type LoadResult = Result<CoupleEvent[]>

/** 上传图片的结果 */
export interface UploadResult {
  /** 可访问的图片地址；失败为 null */
  url: string | null
  error: unknown
}

export interface FeedSource {
  /** 读取当前登录者档案；未登录返回 null */
  getMe(): Promise<Profile | null>
  /** 读取对方档案（两人空间，取另一个账号） */
  getPartner(): Promise<Profile | null>
  /** 拉取动态流，最新在前 */
  listEvents(limit: number): Promise<LoadResult>
  /** 发布一条动态 */
  addEvent(input: PublishInput): Promise<{ error: unknown }>
  /** 上传一张图片，返回可访问地址 */
  uploadPhoto(file: File): Promise<UploadResult>

  /* —— 请愿 · 奶茶券请求 —— */
  listMilkteaRequests(): Promise<Result<MilkteaRequest[]>>
  addMilkteaRequest(input: { reason?: string }): Promise<{ error: unknown }>
  resolveMilkteaRequest(id: string, status: Exclude<RequestStatus, 'pending'>): Promise<{ error: unknown }>

  /* —— 请愿 · 亲亲 —— */
  listKisses(): Promise<Result<Kiss[]>>
  addKiss(input: { count?: number; free: boolean }): Promise<{ error: unknown }>
  resolveKiss(id: string, status: 'approved' | 'rejected'): Promise<{ error: unknown }>
  redeemKiss(id: string): Promise<{ error: unknown }>

  /* —— 请愿 · 心愿 —— */
  listWishes(): Promise<Result<Wish[]>>
  addWish(input: { content: string; want_at?: string | null }): Promise<{ error: unknown }>
  setWishDone(id: string, done: boolean): Promise<{ error: unknown }>

  /* —— 请愿 · 矛盾记录 —— */
  listConflicts(): Promise<Result<Conflict[]>>
  startConflict(): Promise<{ error: unknown }>
  listConflictNotes(): Promise<Result<ConflictNote[]>>
  addConflictNote(input: {
    conflict_id: string
    happened_on?: string
    matter: string
    demand: string
  }): Promise<{ error: unknown }>
  setConflictStatus(id: string, status: ConflictStatus): Promise<{ error: unknown }>

  /* —— 设置 —— */
  /** 改自己的档案（性别 / 昵称） */
  updateProfile(input: { gender?: Gender; display_name?: string }): Promise<{ error: unknown }>
}

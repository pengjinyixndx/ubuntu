/* ============================================================
   青桃 · 数据源接口

   全站的数据都从这里进出，抽象成接口的好处：
   1) 断网或没连上 Supabase 时，整体换成内存实现，照常调 UI；
   2) 首页动态、奶茶券、亲亲、心愿、矛盾都复用同一套读写方式。
   ============================================================ */

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
  /** 改自己的档案：主要是「我是谁」（gender + 昵称），决定看到的是哪一边 */
  updateProfile(patch: { gender?: string; display_name?: string }): Promise<{ error: unknown }>
  /**
   * 自己删 / 自己恢复：只写 revoked_at，不动正文。
   * 删完双方都看不到，本人可以在「我的 → 恢复」里恢复；后台始终看得见。
   */
  setOwnRevoked(id: string, revoked: boolean): Promise<{ error: unknown }>
  /** 回收站：列出自己删掉的 */
  listMyRevoked(): Promise<Result<CoupleEvent[]>>
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
  addKiss(input: {
    count?: number
    free: boolean
    /** 请愿亲亲才写理由和照片 */
    reason?: string
    photoUrl?: string
  }): Promise<{ error: unknown }>
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

  /* ============================================================
     管理后台（第三个账号，独立登录，和上面那套完全隔离）
     ============================================================ */
  /** 后台登录：邮箱 + 密码（账号你自己在 Supabase 里建） */
  adminSignIn(email: string, password: string): Promise<{ error: unknown }>
  /** 后台退出登录 */
  adminSignOut(): Promise<void>
  /** 当前登录者是不是后台账号 */
  adminCheck(): Promise<boolean>
  /** 拉全部记录（含已被撤销的） */
  adminListAll(): Promise<Result<AdminRecord[]>>
  /** 拉所有账号档案（后台把 user id 显示成人名用） */
  adminListProfiles(): Promise<Result<Profile[]>>
  /** 撤销 / 恢复一条记录（打标记，不删行） */
  adminSetRevoked(table: string, id: string, revoked: boolean): Promise<{ error: unknown }>
  /** 彻底删除一条（数据库行 + 照片文件），不可恢复 */
  adminPurge(table: string, id: string): Promise<{ error: unknown }>
  /** 清空所有「已撤销」的记录，返回删掉的条数 */
  adminPurgeRevoked(): Promise<{ count: number; error: unknown }>
  /** 删除某个时间点之前的全部记录，返回删掉的条数 */
  adminPurgeBefore(before: string): Promise<{ count: number; error: unknown }>
}

/* ============================================================
   青桃 · 领域模型类型（首页统一动态的地基）
   ============================================================ */

// 性别：决定首页称呼（自己=「我」，对方=「他 / 她」）
export type Gender = 'male' | 'female'

// 首页统一动态的类型；记录页与请愿页产生的一切，最终都是一条 CoupleEvent
export type EventType =
  | 'note' // 随笔
  | 'diary' // 日记
  | 'photo' // 照片
  | 'milktea_issue' // 颁发奶茶券（他给她）
  | 'milktea_redeem' // 核销奶茶券 / 喝奶茶
  | 'wish' // 添加心愿

// 账号档案：auth.users 的扩展，补充性别
export interface Profile {
  id: string
  email: string
  gender: Gender
  display_name: string | null
  created_at: string
  /** 是否是管理后台账号（第三个账号）。两人 App 必须把这种账号排除在「对象」之外 */
  is_admin?: boolean
}

// 统一动态
export interface CoupleEvent {
  id: string
  actor_id: string // 发布者 user id
  type: EventType
  content: string | null // 文本：随笔 / 日记 / 心愿 / 券说明
  photo_urls: string[] | null // 照片地址（照片动态可多张）
  meta: Record<string, unknown> | null // 随类型变化的附加结构化数据
  created_at: string
  /** 被后台撤销的时间；非空则两个普通账号在数据库层面就查不到这条 */
  revoked_at?: string | null
}

/* ============================================================
   管理后台：把六张表拉平成同一种「记录」
   ============================================================ */

export interface AdminRecord {
  /** 来源表名 */
  table: string
  id: string
  /** 中文类型名，例如「随笔」「奶茶券请求」 */
  kind: string
  /** 产生这条记录的人（user id） */
  actor: string
  /** 主要文字内容（各表拼出来的可读摘要） */
  content: string
  /** 关联图片（目前只有 events 有） */
  photos: string[]
  created_at: string
  /** null = 正常；有值 = 已被撤销（只有后台看得到） */
  revoked_at: string | null
  /** 便于后台在列表里区分主次（例如同一份矛盾的几份记录） */
  extra?: string
}

/* ============================================================
   请愿：奶茶券 / 亲亲 / 心愿 / 矛盾记录

   每张表都可能有 revoked_at：由后台填写。
   非空 = 已被后台撤销，两个普通账号在数据库层面就查不到这条。
   ============================================================ */

/** 奶茶券请求：她发起，他审批（他也可主动发券） */
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export interface MilkteaRequest {
  id: string
  requester: string
  reason: string | null
  status: RequestStatus
  resolver: string | null
  created_at: string
  resolved_at: string | null
  revoked_at?: string | null
}

/** 亲亲：每天免费请求 10 次，超出要对方同意；累积成「欠亲亲」 */
export interface Kiss {
  id: string
  requester: string
  count: number
  /** free=当天免费额度内；pending=超额度待对方同意 */
  status: 'free' | 'pending' | 'approved' | 'rejected'
  /** 是否已经兑现过（兑现后不再计入欠账） */
  redeemed: boolean
  resolver: string | null
  created_at: string
  resolved_at: string | null
  revoked_at?: string | null
}

/** 心愿：独立表，方便标记完成 */
export interface Wish {
  id: string
  owner: string
  content: string
  want_at: string | null
  done: boolean
  created_at: string
  done_at: string | null
  revoked_at?: string | null
}

/** 矛盾：双方各填一份才能进入；吵架期间每次打开弹窗，选冷静 / 和好 */
export type ConflictStatus = 'collecting' | 'active' | 'calm' | 'resolved'
export interface Conflict {
  id: string
  status: ConflictStatus
  started_by: string
  created_at: string
  updated_at: string
  revoked_at?: string | null
}

export interface ConflictNote {
  id: string
  conflict_id: string
  author: string
  /** 什么时候 */
  happened_on: string | null
  /** 因为什么 */
  matter: string
  /** 诉求是什么 */
  demand: string
  created_at: string
  revoked_at?: string | null
}

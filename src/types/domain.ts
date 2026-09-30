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
}

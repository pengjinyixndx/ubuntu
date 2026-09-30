/* ============================================================
   青桃 · 数据源接口

   首页的一切内容都来自 events 这张表。这里把「读/写动态」和
   「读档案」抽象成接口，好处有两个：
   1) 断网或没连上 Supabase 时，可以整体换成内存实现，照常调 UI；
   2) 后续奶茶券、亲亲、矛盾记录都复用同一套读写方式，不会散落各处。
   ============================================================ */

import type { CoupleEvent, Profile } from '../types/domain'

/** 发布动态时的入参：actor_id 由实现方补上，调用方不用管 */
export interface PublishInput {
  type: CoupleEvent['type']
  content?: string
  photo_urls?: string[]
  meta?: Record<string, unknown>
}

/** 一次读取动态的结果：失败时 error 有值，data 仍可能是缓存 */
export interface LoadResult {
  data: CoupleEvent[]
  error: unknown
}

export interface FeedSource {
  /** 读取当前登录者档案；未登录返回 null */
  getMe(): Promise<Profile | null>
  /** 拉取动态流，最新在前 */
  listEvents(limit: number): Promise<LoadResult>
  /** 发布一条动态 */
  addEvent(input: PublishInput): Promise<{ error: unknown }>
}

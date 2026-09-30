/* ============================================================
   青桃 · 内存数据源（本地演示 / 断网调样式）

   行为刻意和 Supabase 版保持一致：最新在前、发完立刻可读、
   写入的数据只存在内存里，刷新页面即回到预置样例。
   ============================================================ */

import type { CoupleEvent } from '../types/domain'
import type { FeedSource, LoadResult, PublishInput } from './feedSource'
import { MOCK_EVENTS, MOCK_ME } from './mockFeed'

// 复制一份，避免直接改动 mockFeed 里的预置数组
const store: CoupleEvent[] = [...MOCK_EVENTS]

let seq = 0

export const mockSource: FeedSource = {
  async getMe() {
    return MOCK_ME
  },

  async listEvents(limit: number): Promise<LoadResult> {
    const sorted = [...store].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { data: sorted.slice(0, limit), error: null }
  },

  async addEvent(input: PublishInput): Promise<{ error: unknown }> {
    seq += 1
    store.push({
      id: `local-${seq}`,
      actor_id: MOCK_ME.id,
      type: input.type,
      content: input.content ?? null,
      photo_urls: input.photo_urls ?? null,
      meta: input.meta ?? null,
      created_at: new Date().toISOString()
    })
    return { error: null }
  }
}

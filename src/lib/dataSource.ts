/* ============================================================
   青桃 · 数据源选择

   默认走 Supabase（线上真实数据）。只有在 .env.local 里显式写下
   VITE_USE_MOCK=1 时才切到内存演示数据，所以线上构建与真机使用
   的行为完全不受影响。
   ============================================================ */

import type { FeedSource } from './feedSource'

/** 是否使用本地演示数据 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1'

let cached: FeedSource | null = null

/** 取得数据源实例（首次调用时按需加载对应实现） */
export async function getFeedSource(): Promise<FeedSource> {
  if (cached) return cached

  if (USE_MOCK) {
    const { mockSource } = await import('./mockSource')
    cached = mockSource
  } else {
    const { supabaseSource } = await import('./supabaseSource')
    cached = supabaseSource
  }
  return cached
}

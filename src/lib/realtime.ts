/* ============================================================
   青桃 · 实时

   订阅六张表的变化：对方一发东西，这边立刻就能收到回调，
   不用等他刷新，也顺带解决「两台设备看到的内容不一样」。

   前提：supabase/recycle.sql 里把六张表加进了 supabase_realtime 发布。
   ============================================================ */

import { supabase } from './supabase'
import { USE_MOCK } from './dataSource'

/** 表名要和 recycle.sql 里加进发布的一致 */
const TABLES = [
  'events',
  'milktea_requests',
  'kisses',
  'wishes',
  'conflicts',
  'conflict_notes'
] as const

type Channel = ReturnType<typeof supabase.channel>

let channel: Channel | null = null

/**
 * 订阅变化。返回一个取消订阅的函数。
 * 本地演示模式（VITE_USE_MOCK=1）没有服务端，直接返回空实现。
 */
export function subscribeChanges(onChange: () => void): () => void {
  if (USE_MOCK) return () => {}
  if (channel) return () => {}

  let ch = supabase.channel('qingtao-changes')
  for (const table of TABLES) {
    ch = ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => onChange()
    )
  }
  ch.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[青桃] 实时订阅没连上，先退化成刷新才更新')
    }
  })
  channel = ch

  return () => {
    if (channel) {
      void supabase.removeChannel(channel)
      channel = null
    }
  }
}

/* ============================================================
   青桃 · 实时

   订阅六张表的变化：对方一发东西，这边立刻就能收到回调，
   不用等他刷新，也顺带解决「两台设备看到的内容不一样」。

   前提：supabase/recycle.sql 里把六张表加进了 supabase_realtime 发布。

   两个关键约束（以前都踩过）：
   1) 一次发帖会同时写 events / milktea_requests 等好几张表，
      实时回调会连着来好几次。不合并的话每次都是 loadEvents + loadPetition
      → 整页重渲染，手机上会卡。这里统一 400ms 合并成一次。
   2) 这个模块是单例：第二个订阅者以前既收不到回调、也拿不到取消函数。
      现在改成多监听器 + 引用计数，谁取消谁摘掉，最后一个走的时候才断开。
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

/** 400ms 内的多次变化只刷新一次 */
export const CHANGE_DEBOUNCE_MS = 400
/** 兜底轮询间隔 */
export const FALLBACK_POLL_MS = 30000

export type ChangeKind = 'change' | 'poll'
type Deliver = (kind: ChangeKind) => void

/**
 * 可单独测试的合并器：
 * - schedule('change') / schedule('poll') 在 delay 内多次调用，只执行一次；
 * - 只要期间出现过 'change'，就按 'change' 交付（有提示的那一种）。
 */
export function createChangeBatcher(
  deliver: Deliver,
  delay = CHANGE_DEBOUNCE_MS
): { schedule: (kind: ChangeKind) => void; cancel: () => void } {
  let timer = 0
  let pendingChange = false
  let disposed = false

  const flush = () => {
    timer = 0
    if (disposed) return
    const kind: ChangeKind = pendingChange ? 'change' : 'poll'
    pendingChange = false
    deliver(kind)
  }

  return {
    schedule(kind) {
      if (disposed) return
      if (kind === 'change') pendingChange = true
      if (timer) return
      timer = window.setTimeout(flush, delay)
    },
    cancel() {
      disposed = true
      if (timer) window.clearTimeout(timer)
      timer = 0
      pendingChange = false
    }
  }
}

interface Subscriber {
  /** 真的有人动了数据 */
  onChange: () => void
  /** 兜底轮询 / 回到前台。只是怕实时断了，**不要给提示** */
  onPoll?: () => void
}

type Channel = ReturnType<typeof supabase.channel>

let channel: Channel | null = null
let realtimeStarted = false
let scheduler: ReturnType<typeof createChangeBatcher> | null = null
let fallbackTimer = 0
let visibilityHandler: (() => void) | null = null
const subscribers = new Set<Subscriber>()

function deliver(kind: ChangeKind): void {
  for (const sub of [...subscribers]) {
    try {
      if (kind === 'change') sub.onChange()
      else (sub.onPoll ?? sub.onChange)()
    } catch (e) {
      console.error('[青桃] 实时刷新回调出错：', e)
    }
  }
}

function isVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

function ensureChannel(): void {
  if (realtimeStarted) return
  realtimeStarted = true

  scheduler = createChangeBatcher(deliver)
  try {
    let ch = supabase.channel('qingtao-changes')
    for (const table of TABLES) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        scheduler?.schedule('change')
      })
    }
    ch.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[青桃] 实时订阅没连上，先退化成 30 秒兜底刷新')
      }
    })
    channel = ch
  } catch (e) {
    // 建不了频道也别让整个 App 挂掉：只用兜底轮询
    console.warn('[青桃] 实时订阅创建失败，先用 30 秒兜底刷新：', e)
    channel = null
  }

  // 兜底：订阅万一手握不上或中途断了，也不要一直不更新。
  // 页面在后台时不拉，省流量；回到前台立刻补一次（不提示）。
  fallbackTimer = window.setInterval(() => {
    if (isVisible()) scheduler?.schedule('poll')
  }, FALLBACK_POLL_MS)

  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      if (isVisible()) scheduler?.schedule('poll')
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }
}

function teardown(): void {
  realtimeStarted = false
  scheduler?.cancel()
  scheduler = null

  if (fallbackTimer) {
    window.clearInterval(fallbackTimer)
    fallbackTimer = 0
  }
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

/**
 * 订阅变化。返回一个取消订阅的函数。
 * 可以同时有多个订阅者；最后一个取消时才真正断开。
 * 本地演示模式（VITE_USE_MOCK=1）没有服务端，直接返回空实现。
 */
export function subscribeChanges(opts: {
  onChange: () => void
  onPoll?: () => void
}): () => void {
  if (USE_MOCK) return () => {}

  const sub: Subscriber = { onChange: opts.onChange, onPoll: opts.onPoll }
  subscribers.add(sub)
  ensureChannel()

  let active = true
  return () => {
    if (!active) return
    active = false
    subscribers.delete(sub)
    if (!subscribers.size) teardown()
  }
}

/* ============================================================
   青桃 · 动态流：记录页、首页共用同一份数据
   ============================================================ */

import { ref } from 'vue'
import type { CoupleEvent, Profile } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'

// 模块级单例，避免各页面各拉一份
const events = ref<CoupleEvent[]>([])
const myProfile = ref<Profile | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

// 一次读多少条。首页是「流」，多给一些，往回滑才有内容
const FEED_LIMIT = 60
const CACHE_KEY = 'qingtao_feed_v1'

/** 确保拿到当前登录用户的档案（id + gender） */
async function ensureMe(): Promise<Profile | null> {
  if (myProfile.value) return myProfile.value
  const source = await getFeedSource()
  myProfile.value = await source.getMe()
  return myProfile.value
}

/** 拉取动态流（最新在前）；先读本地缓存立即渲染，再后台更新，避免刷新白屏 */
async function loadEvents(): Promise<void> {
  loading.value = true
  loadError.value = null

  // 1) 先放缓存（stale-while-revalidate）
  await ensureMe()
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached && !events.value.length) events.value = JSON.parse(cached) as CoupleEvent[]
  } catch {
    /* 缓存不可用就忽略 */
  }

  // 2) 再拉最新数据
  const source = await getFeedSource()
  const { data, error } = await source.listEvents(FEED_LIMIT)

  if (error) {
    // 拉取失败时保留已有内容（缓存或上一次的结果），只把错误抛给界面提示
    loadError.value = '没能连上服务器，正在显示上次的记录'
  } else {
    events.value = data
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      /* 写满就忽略 */
    }
  }

  loading.value = false
}

/** 发布一条动态（actor_id 由数据源补全，RLS 也会校验） */
async function publishEvent(input: {
  type: CoupleEvent['type']
  content?: string
  photo_urls?: string[]
  meta?: Record<string, unknown>
}): Promise<{ error: unknown }> {
  const source = await getFeedSource()
  const { error } = await source.addEvent(input)
  if (error) return { error }

  // 立即刷新，保证当前页数据最新
  await loadEvents()
  return { error: null }
}

export function useFeed() {
  return { events, myProfile, loading, loadError, ensureMe, loadEvents, publishEvent }
}

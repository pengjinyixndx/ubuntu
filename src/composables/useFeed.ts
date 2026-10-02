/* ============================================================
   青桃 · 动态流：记录页、首页共用同一份数据
   ============================================================ */

import { ref } from 'vue'
import type { CoupleEvent, Profile } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'

// 模块级单例，避免各页面各拉一份
const events = ref<CoupleEvent[]>([])
const myProfile = ref<Profile | null>(null)
const partnerProfile = ref<Profile | null>(null)
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

/** 确保拿到对方档案（奶茶额度要按「她」算，所以必须要） */
async function ensurePartner(): Promise<Profile | null> {
  if (partnerProfile.value) return partnerProfile.value
  const source = await getFeedSource()
  partnerProfile.value = await source.getPartner()
  return partnerProfile.value
}

/**
 * 谁是谁，是**固定**的，不劳人手动配：
 * 两个人里先注册的那个是「他」（小螃蟹），另一个是「她」（银杏叶）。
 * 数据库里 gender 空着也照样分得清（这两个人本来就是定死的）。
 * 顺带把没起过的昵称补上，省得界面上出现「我的账号」。
 */
function resolveRoles(): void {
  const me = myProfile.value
  const pa = partnerProfile.value
  if (!me || !pa) return

  if (!me.gender || !pa.gender) {
    const meFirst = String(me.created_at ?? '') <= String(pa.created_at ?? '')
    if (!me.gender) me.gender = meFirst ? 'male' : 'female'
    if (!pa.gender) pa.gender = meFirst ? 'female' : 'male'
  }

  if (!me.display_name) me.display_name = me.gender === 'male' ? '小螃蟹' : '银杏叶'
  if (!pa.display_name) pa.display_name = pa.gender === 'male' ? '小螃蟹' : '银杏叶'
}

/** 拉取动态流（最新在前）；先读本地缓存立即渲染，再后台更新，避免刷新白屏 */
async function loadEvents(): Promise<void> {
  loading.value = true
  loadError.value = null

  // 1) 先放缓存（stale-while-revalidate）
  await Promise.all([ensureMe(), ensurePartner()])
  resolveRoles()
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

/** 上传一张图片（用于随笔的单图、照片的多图） */
async function uploadPhoto(file: File): Promise<{ url: string | null; error: unknown }> {
  const source = await getFeedSource()
  return source.uploadPhoto(file)
}

/**
 * 保存自己的档案。
 * 主要是选「我是谁」——决定看到的是哪一边（她的页面 / 他的页面）。
 */
async function saveProfile(patch: {
  gender?: string
  display_name?: string
}): Promise<{ error: unknown }> {
  const source = await getFeedSource()
  const { error } = await source.updateProfile(patch)
  if (error) return { error }
  myProfile.value = await source.getMe()
  resolveRoles()
  return { error: null }
}

/**
 * 退出登录 / 换账号时**必须**调一次。
 * 这个 composable 是模块级单例，登录信息会一直留着，
 * 不清掉的话换账号进来还是上一个人的档案和动态（两个人会指向同一个账号）。
 */
function resetFeed(): void {
  events.value = []
  myProfile.value = null
  partnerProfile.value = null
  loadError.value = null
  loading.value = false
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* 忽略 */
  }
}

export function useFeed() {
  return {
    events,
    myProfile,
    partnerProfile,
    loading,
    loadError,
    ensureMe,
    ensurePartner,
    resolveRoles,
    loadEvents,
    publishEvent,
    uploadPhoto,
    saveProfile,
    resetFeed
  }
}

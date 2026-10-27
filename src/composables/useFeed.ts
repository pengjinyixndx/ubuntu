/* ============================================================
   青桃 · 动态流：记录页、首页共用同一份数据
   ============================================================ */

import { computed, ref } from 'vue'
import type { CoupleEvent, Profile } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'

// 模块级单例，避免各页面各拉一份
const events = ref<CoupleEvent[]>([])
const myProfile = ref<Profile | null>(null)
const partnerProfile = ref<Profile | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
/** 档案层面的问题单独放：拿不到对方档案时，角色是「未确定」，不是「同一个人」 */
const profileError = ref<string | null>(null)

/** 这个空间里只有两个角色：先注册的是他（螃蟹），后注册的是她（银杏叶） */
export type Role = 'him' | 'her'
const myRole = ref<Role | null>(null)
const partnerRole = ref<Role | null>(null)
/** 两边都拿到、角色都定下来，才算确定 */
const rolesReady = computed(() => !!myRole.value && !!partnerRole.value)

// 一次读多少条。首页是「流」，多给一些，往回滑才有内容
const FEED_LIMIT = 60
const CACHE_KEY = 'qingtao_feed_v1'
const MY_REVOKED_KEY = 'qingtao_my_revoked'
/** 缓存带上归属人；没有归属的旧缓存一律不认（否则会串号） */
const CACHE_VERSION = 2

interface FeedCachePayload {
  v: number
  owner: string
  events: CoupleEvent[]
}
interface RevokedPayload {
  v: number
  owner: string
  ids: string[]
}

/** 我上一次自己动手写数据的时间。实时事件里也包含我自己写的，
    所以短时间内收到的事件不算「对方的动静」，不弹提示。 */
let lastLocalWrite = 0
export function lastLocalWriteAt(): number {
  return lastLocalWrite
}
function markLocalWrite(): void {
  lastLocalWrite = Date.now()
}

/**
 * 账号切换的代数。退出 / 换账号时 +1：
 * 旧账号那边还在飞的请求回来时，发现代数变了就直接丢掉，
 * 不会把上一个账号的档案或动态写回单例里。
 */
let epoch = 0
/** 同一代里也要防止「旧请求后到」覆盖新结果 */
let loadSeq = 0
let meTask: Promise<Profile | null> | null = null
let partnerTask: Promise<Profile | null> | null = null
/** 同一个 File 只传一次：发布失败重试时不会重复上传同一张 */
let uploadCache = new WeakMap<File, Promise<{ url: string | null; error: unknown }>>()

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readCache(owner: string): CoupleEvent[] | null {
  if (!owner) return null
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    // 旧版是裸数组，没有归属人：一律不认，宁可多拉一次也不串号
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null
    const p = parsed as Partial<FeedCachePayload>
    if (p.v !== CACHE_VERSION || p.owner !== owner || !Array.isArray(p.events)) return null
    return p.events
  } catch {
    return null
  }
}

function writeCache(owner: string, data: CoupleEvent[]): void {
  if (!owner) return
  const store = storage()
  if (!store) return
  try {
    const payload: FeedCachePayload = { v: CACHE_VERSION, owner, events: data }
    store.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* 写满就忽略 */
  }
}

/** 本机记下我删了哪些：冷启动先渲染缓存时，就不会把它又闪出来 */
function loadMyRevokedIds(): string[] {
  const owner = myProfile.value?.id ?? ''
  const store = storage()
  if (!owner || !store) return []
  try {
    const raw = store.getItem(MY_REVOKED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return []
    const p = parsed as Partial<RevokedPayload>
    if (p.v !== CACHE_VERSION || p.owner !== owner || !Array.isArray(p.ids)) return []
    return p.ids.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function markRevokedId(id: string, revoked: boolean): void {
  const owner = myProfile.value?.id ?? ''
  const ids = loadMyRevokedIds().filter((x) => x !== id)
  if (revoked) ids.push(id)

  const store = storage()
  if (owner && store) {
    try {
      const payload: RevokedPayload = { v: CACHE_VERSION, owner, ids }
      store.setItem(MY_REVOKED_KEY, JSON.stringify(payload))
    } catch {
      /* 忽略 */
    }
  }

  if (!revoked) return
  // 删掉的那一刻就从展示流里拿掉：即使紧接着的 loadEvents 失败，也不会继续显示；
  // 同时作废还在飞的旧拉取，免得它回来又把这条塞回来。
  loadSeq += 1
  loading.value = false
  events.value = events.value.filter((e) => e.id !== id)
  const cached = readCache(owner)
  if (cached) writeCache(owner, cached.filter((e) => e.id !== id))
}

function timeOf(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/**
 * 谁先注册：只做判断，不直接写 profile。
 * 两个 created_at 都拿不到时才退化：先看性别是否恰好一男一女，最后才比 id。
 */
function decideMeFirst(
  me: Profile,
  partner: Profile
): { meFirst: boolean; basis: 'created_at' | 'gender' | 'id' } {
  const a = timeOf(me.created_at)
  const b = timeOf(partner.created_at)
  if (a !== null && b !== null && a !== b) return { meFirst: a < b, basis: 'created_at' }
  if (me.gender && partner.gender && me.gender !== partner.gender) {
    return { meFirst: me.gender === 'male', basis: 'gender' }
  }
  return { meFirst: me.id < partner.id, basis: 'id' }
}

let lastRoleLog = ''

/**
 * 谁是谁，是**固定**的，不劳人手动配：
 * 两个人里先注册的那个是「他」（小螃蟹），另一个是「她」（银杏叶）。
 * 数据库里 gender 空着、甚至两个都写成了同一个值，也照样按注册先后定死。
 *
 * 注意：这里**返回新对象**，不就地改写传进来的 profile。
 * 一是 mock 数据源拿到的是模块常量，就地改会把演示数据永久污染；
 * 二是 profile 可能来自缓存，改它等于改了「事实」。
 */
function resolveRoles(): void {
  const me = myProfile.value
  const partner = partnerProfile.value

  if (!me) {
    myRole.value = null
    partnerRole.value = null
    return
  }

  if (!partner) {
    // 拿不到对方档案就分不清谁先谁后 —— 明确标成「未确定」，
    // 绝不退化成「两个人都当成他」。
    myRole.value = null
    partnerRole.value = null
    console.warn('[青桃] 拿不到对方的档案，角色暂未确定（不会拿性别去猜谁是谁）')
    return
  }

  const { meFirst, basis } = decideMeFirst(me, partner)
  const nextMe: Profile = { ...me }
  const nextPartner: Profile = { ...partner }
  let changedMe = false
  let changedPartner = false

  const wantMe: Role = meFirst ? 'him' : 'her'
  const wantPartner: Role = meFirst ? 'her' : 'him'
  const wantMeGender = wantMe === 'him' ? 'male' : 'female'
  const wantPartnerGender = wantPartner === 'him' ? 'male' : 'female'

  if (nextMe.gender !== wantMeGender) {
    if (nextMe.gender) {
      console.warn(
        `[青桃] 数据库里我的 gender=${nextMe.gender}，与注册先后冲突；按先后判成 ${wantMeGender}`
      )
    }
    nextMe.gender = wantMeGender
    changedMe = true
  }
  if (nextPartner.gender !== wantPartnerGender) {
    if (nextPartner.gender) {
      console.warn(
        `[青桃] 数据库里对方的 gender=${nextPartner.gender}，与注册先后冲突；按先后判成 ${wantPartnerGender}`
      )
    }
    nextPartner.gender = wantPartnerGender
    changedPartner = true
  }

  if (!nextMe.display_name) {
    nextMe.display_name = wantMe === 'him' ? '小螃蟹' : '银杏叶'
    changedMe = true
  }
  if (!nextPartner.display_name) {
    nextPartner.display_name = wantPartner === 'him' ? '小螃蟹' : '银杏叶'
    changedPartner = true
  }

  if (changedMe) myProfile.value = nextMe
  if (changedPartner) partnerProfile.value = nextPartner

  myRole.value = wantMe
  partnerRole.value = wantPartner

  const logKey = `${nextMe.id}:${wantMe}:${nextPartner.id}:${wantPartner}`
  if (logKey !== lastRoleLog) {
    lastRoleLog = logKey
    console.info(
      `[青桃] 身份判定：我=${wantMe === 'him' ? '小螃蟹' : '银杏叶'}，对方=${
        wantPartner === 'him' ? '小螃蟹' : '银杏叶'
      }（依据：${
        basis === 'created_at' ? '注册先后' : basis === 'gender' ? '性别互为相反' : 'id 兜底'
      }）`
    )
  }
  profileError.value = null
}

/** 确保拿到当前登录用户的档案（id + gender） */
async function ensureMe(): Promise<Profile | null> {
  if (myProfile.value) return myProfile.value
  if (meTask) return meTask

  const myEpoch = epoch
  const task = (async () => {
    try {
      const source = await getFeedSource()
      const me = await source.getMe()
      if (myEpoch !== epoch) return null
      if (!me) {
        profileError.value = '拿不到你的档案，请重新登录后再试'
        console.warn('[青桃] getMe() 没返回档案（profiles 行或 RLS 可能有问题）')
        return null
      }
      myProfile.value = me
      resolveRoles()
      return me
    } catch (e) {
      if (myEpoch === epoch) {
        profileError.value = '拿不到你的档案，请重新登录后再试'
        console.error('[青桃] 读取我的档案失败：', e)
      }
      return null
    }
  })()
  meTask = task
  const clear = () => {
    if (meTask === task) meTask = null
  }
  task.then(clear, clear)
  return task
}

/** 确保拿到对方档案（奶茶额度要按「她」算，所以必须要） */
async function ensurePartner(): Promise<Profile | null> {
  if (partnerProfile.value) return partnerProfile.value
  if (partnerTask) return partnerTask

  const myEpoch = epoch
  const task = (async () => {
    try {
      const source = await getFeedSource()
      const partner = await source.getPartner()
      if (myEpoch !== epoch) return null
      if (!partner) {
        if (myEpoch === epoch) {
          profileError.value = '没能拿到对方的档案，角色还没确定'
          console.warn('[青桃] getPartner() 没返回档案：先不判断角色，也不记额度')
        }
        return null
      }
      partnerProfile.value = partner
      resolveRoles()
      return partner
    } catch (e) {
      if (myEpoch === epoch) {
        profileError.value = '没能拿到对方的档案，角色还没确定'
        console.error('[青桃] 读取对方档案失败：', e)
      }
      return null
    }
  })()
  partnerTask = task
  const clear = () => {
    if (partnerTask === task) partnerTask = null
  }
  task.then(clear, clear)
  return task
}

/** 拉取动态流（最新在前）；先读本地缓存立即渲染，再后台更新，避免刷新白屏 */
async function loadEvents(): Promise<void> {
  const myEpoch = epoch
  const seq = ++loadSeq
  loading.value = true
  loadError.value = null

  try {
    // 1) 先放缓存（stale-while-revalidate）
    await Promise.all([ensureMe(), ensurePartner()])
    if (myEpoch !== epoch) return
    resolveRoles()

    const owner = myProfile.value?.id ?? ''
    try {
      const cached = readCache(owner)
      if (cached && !events.value.length) {
        const killed = loadMyRevokedIds()
        events.value = cached.filter((e) => !killed.includes(e.id) && !e.revoked_at)
      }
    } catch {
      /* 缓存不可用就忽略 */
    }
    if (myEpoch !== epoch || seq !== loadSeq) return

    // 2) 再拉最新数据
    const source = await getFeedSource()
    let data: CoupleEvent[] = []
    let error: unknown = null
    try {
      const res = await source.listEvents(FEED_LIMIT)
      data = res.data
      error = res.error
    } catch (e) {
      error = e
    }

    // 旧代数 / 旧请求的结果一律丢掉，避免把上一个人的数据写回来
    if (myEpoch !== epoch || seq !== loadSeq) return

    if (error) {
      // 拉取失败时保留已有内容（缓存或上一次的结果），只把错误抛给界面提示
      loadError.value = '没能连上服务器，正在显示上次的记录'
      console.error('[青桃] 读取动态失败：', error)
    } else {
      events.value = data
      writeCache(owner, data)
    }
  } catch (e) {
    if (myEpoch === epoch) {
      loadError.value = '没能连上服务器，正在显示上次的记录'
      console.error('[青桃] 读取动态失败：', e)
    }
  } finally {
    if (myEpoch === epoch && seq === loadSeq) loading.value = false
  }
}

/** 发布一条动态（actor_id 由数据源补全，RLS 也会校验） */
async function publishEvent(input: {
  type: CoupleEvent['type']
  content?: string
  photo_urls?: string[]
  meta?: Record<string, unknown>
}): Promise<{ error: unknown }> {
  markLocalWrite()
  const myEpoch = epoch
  try {
    const source = await getFeedSource()
    const { error, data } = await source.addEvent(input)
    if (myEpoch !== epoch) return { error: '账号已切换，这条没有写进当前账号' }
    if (error) return { error }

    // 写成功就把新记录直接插到流里（不再整页重拉，少一次全量刷新）。
    // 数据源没把插入行带回来时才退回全量拉取。
    if (data && typeof data.id === 'string') {
      const hadFeed = events.value.length > 0
      // 作废「发帖之前发出、还没回来」的整页拉取：
      // 否则它回来时会把刚插进去的这条覆盖掉（看起来像发失败了）。
      loadSeq += 1
      loading.value = false
      if (!events.value.some((e) => e.id === data.id)) {
        events.value = [data, ...events.value].slice(0, FEED_LIMIT)
      }
      const owner = myProfile.value?.id ?? ''
      if (owner) writeCache(owner, events.value)
      // 如果本来就没有 Feed（首次加载还没回来就被打断了），
      // 悄悄补一次，拿到更早的记录；有 Feed 时就不再全量重拉。
      if (!hadFeed) void loadEvents()
    } else {
      await loadEvents()
    }
    return { error: null }
  } catch (e) {
    console.error('[青桃] 写入动态失败：', e)
    return { error: e }
  }
}

/** 上传一张图片（用于随笔的单图、照片的多图） */
async function uploadPhoto(file: File): Promise<{ url: string | null; error: unknown }> {
  const cached = uploadCache.get(file)
  if (cached) return cached

  const task = (async () => {
    try {
      const source = await getFeedSource()
      return await source.uploadPhoto(file)
    } catch (e) {
      console.error('[青桃] 上传照片失败：', e)
      return { url: null, error: e }
    }
  })()
  uploadCache.set(file, task)

  const res = await task
  // 失败的不缓存，用户点重试时还能再传一次
  if (res.error || !res.url) uploadCache.delete(file)
  return res
}

/**
 * 退出登录 / 换账号时**必须**调一次。
 * 这个 composable 是模块级单例，登录信息会一直留着，
 * 不清掉的话换账号进来还是上一个人的档案和动态（两个人会指向同一个账号）。
 */
function resetFeed(): void {
  // 让所有还在飞的请求作废
  epoch += 1
  loadSeq += 1
  meTask = null
  partnerTask = null
  uploadCache = new WeakMap()
  lastLocalWrite = 0
  lastRoleLog = ''

  events.value = []
  myProfile.value = null
  partnerProfile.value = null
  myRole.value = null
  partnerRole.value = null
  loadError.value = null
  profileError.value = null
  loading.value = false

  const store = storage()
  if (store) {
    try {
      store.removeItem(CACHE_KEY)
      store.removeItem(MY_REVOKED_KEY)
    } catch {
      /* 忽略 */
    }
  }
}

export function useFeed() {
  return {
    events,
    myProfile,
    partnerProfile,
    loading,
    loadError,
    profileError,
    myRole,
    partnerRole,
    rolesReady,
    ensureMe,
    ensurePartner,
    resolveRoles,
    loadEvents,
    publishEvent,
    uploadPhoto,
    markRevokedId,
    markLocalWrite,
    lastLocalWriteAt,
    resetFeed
  }
}

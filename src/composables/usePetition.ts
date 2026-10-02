/* ============================================================
   青桃 · 请愿（奶茶券请求 / 亲亲 / 心愿 / 矛盾记录）

   规则：
   - 奶茶券：她请求 → 他同意（会真的发一张券）/ 驳回；他也可主动发。
   - 亲亲：每人每天免费 10 次；超出要对方同意才算；累计成「欠亲亲」。
   - 心愿：想做的事 + 想什么时候完成，可标记完成。
   - 矛盾：发起后双方各填一份（什么时候 / 因为什么 / 诉求），
           两份都填完进入「吵架期间」；期间每次打开弹窗展示两份记录，
           选择「冷静」或「和好」。
   ============================================================ */

import { computed, ref } from 'vue'
import type {
  Conflict,
  ConflictNote,
  ConflictStatus,
  Kiss,
  MilkteaRequest,
  RequestStatus,
  Wish
} from '../types/domain'
import { getFeedSource } from '../lib/dataSource'
import { useFeed } from './useFeed'

/** 每天免费请求亲亲的次数 */
export const KISS_FREE_PER_DAY = 10

const requests = ref<MilkteaRequest[]>([])
const kisses = ref<Kiss[]>([])
const wishes = ref<Wish[]>([])
const conflicts = ref<Conflict[]>([])
const conflictNotes = ref<ConflictNote[]>([])
const loading = ref(false)

/** 是否同一天（本地时区） */
function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

/**
 * 退出登录 / 换账号时必须调一次：
 * 这些也是模块级单例，不清掉的话换个人进来还是上一个人的请愿数据。
 */
function resetPetition(): void {
  requests.value = []
  kisses.value = []
  wishes.value = []
  conflicts.value = []
  conflictNotes.value = []
  loading.value = false
}

export function usePetition() {
  const { myProfile, ensureMe, publishEvent } = useFeed()

  const myId = computed(() => myProfile.value?.id ?? '')
  /** 对方称呼 */
  const partnerName = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))

  /** 一次性把请愿相关的数据都拉回来 */
  async function loadPetition(): Promise<void> {
    loading.value = true
    await ensureMe()
    const src = await getFeedSource()
    const [r, k, w, c, n] = await Promise.all([
      src.listMilkteaRequests(),
      src.listKisses(),
      src.listWishes(),
      src.listConflicts(),
      src.listConflictNotes()
    ])
    requests.value = r.data
    kisses.value = k.data
    wishes.value = w.data
    conflicts.value = c.data
    conflictNotes.value = n.data
    loading.value = false
  }

  /* ============ 奶茶券 ============ */
  const pendingRequests = computed(() => requests.value.filter((x) => x.status === 'pending'))
  const myRequests = computed(() => requests.value.filter((x) => x.requester === myId.value))

  async function requestMilktea(reason: string) {
    const src = await getFeedSource()
    const { error } = await src.addMilkteaRequest({ reason })
    if (error) return { error }
    // 请愿本身也进时光记录；它不算券，所以用 milktea_request
    await publishEvent({ type: 'milktea_request', content: reason, meta: { reason } })
    await loadPetition()
    return { error: null }
  }

  /** 审批：同意时会真的发一张券（写一条 milktea_issue 动态，券余额才算得上） */
  async function resolveRequest(
    id: string,
    status: Exclude<RequestStatus, 'pending'>,
    opts?: { expires_at?: string }
  ) {
    const src = await getFeedSource()
    const target = requests.value.find((x) => x.id === id)
    const { error } = await src.resolveMilkteaRequest(id, status)
    if (error) return { error }

    if (status === 'approved') {
      await publishEvent({
        type: 'milktea_issue',
        content: '奶茶券 · 一张',
        meta: {
          count: 1,
          reason: target?.reason ?? null,
          expires_at: opts?.expires_at ?? null,
          from_request: id
        }
      })
    }
    await loadPetition()
    return { error: null }
  }

  /** 主动发券：必须写因何故 + 到期时间 */
  async function issueVoucher(reason: string, expiresAt: string) {
    const { error } = await publishEvent({
      type: 'milktea_issue',
      content: '奶茶券 · 一张',
      meta: { count: 1, reason: reason || null, expires_at: expiresAt || null }
    })
    if (!error) await loadPetition()
    return { error }
  }

  /* ============ 亲亲 ============ */
  /** 我今天已经用掉的免费次数 */
  const freeUsedToday = computed(() =>
    kisses.value
      .filter((k) => k.requester === myId.value && k.status === 'free' && isToday(k.created_at))
      .reduce((s, k) => s + k.count, 0)
  )
  /** 我今天还剩几次免费 */
  const freeLeftToday = computed(() => Math.max(0, KISS_FREE_PER_DAY - freeUsedToday.value))

  /** 欠亲亲：还没兑现的（免费 + 已同意）总数 */
  const kissDebt = computed(() =>
    kisses.value
      .filter((k) => (k.status === 'free' || k.status === 'approved') && !k.redeemed)
      .reduce((s, k) => s + k.count, 0)
  )
  /** 待我同意的亲亲请求（对方发的） */
  const pendingKisses = computed(() =>
    kisses.value.filter((k) => k.status === 'pending' && k.requester !== myId.value)
  )
  /** 我发出去还没被处理的 */
  const myPendingKisses = computed(() =>
    kisses.value.filter((k) => k.status === 'pending' && k.requester === myId.value)
  )

  /** 「想亲」：免费额度内直接算；短时间点好几下会合并成一条「想亲 ×n」 */
  async function askKiss(count = 1) {
    const src = await getFeedSource()
    const n = Math.min(count, Math.max(0, freeLeftToday.value))
    if (n <= 0) return { error: 'no-quota', free: false }

    const { error } = await src.addKiss({ count: n, free: true })
    if (error) return { error, free: true }

    await publishEvent({ type: 'kiss', content: '', meta: { kind: 'ask', count: n } })
    await loadPetition()
    return { error: null, free: true }
  }

  /** 请愿亲亲：写清楚为什么想亲，可以附一张照片 */
  async function requestKiss(reason: string, photoUrl?: string) {
    const src = await getFeedSource()
    const { error } = await src.addKiss({ count: 1, free: false, reason, photoUrl })
    if (error) return { error }

    await publishEvent({
      type: 'kiss',
      content: reason,
      photo_urls: photoUrl ? [photoUrl] : undefined,
      meta: { kind: 'request', count: 1, reason, photo_url: photoUrl ?? null }
    })
    await loadPetition()
    return { error: null }
  }

  async function resolveKiss(id: string, status: 'approved' | 'rejected') {
    const src = await getFeedSource()
    const target = kisses.value.find((k) => k.id === id)
    const { error } = await src.resolveKiss(id, status)
    if (error) return { error }

    // 答应了也记一条；拒绝不记（拒了就不是好事，不用留在记录里）
    if (status === 'approved') {
      await publishEvent({
        type: 'kiss',
        content: '',
        meta: { kind: 'granted', count: target?.count ?? 1 }
      })
    }
    await loadPetition()
    return { error: null }
  }

  async function redeemKiss(id: string) {
    const src = await getFeedSource()
    const { error } = await src.redeemKiss(id)
    if (!error) await loadPetition()
    return { error }
  }

  /* ============ 心愿 ============ */
  const wishList = computed(() => wishes.value)

  async function addWish(content: string, wantAt?: string | null) {
    const src = await getFeedSource()
    const { error } = await src.addWish({ content, want_at: wantAt || null })
    if (error) return { error }

    // 同时写一条动态，首页能看到「他添加了心愿」
    await publishEvent({
      type: 'wish',
      content,
      meta: { want_at: wantAt || null }
    })
    await loadPetition()
    return { error: null }
  }

  async function toggleWish(id: string, done: boolean) {
    const src = await getFeedSource()
    const { error } = await src.setWishDone(id, done)
    if (!error) await loadPetition()
    return { error }
  }

  /* ============ 矛盾记录 ============ */
  /** 还没结束的那一份矛盾（collecting / active / calm） */
  const openConflict = computed(
    () => conflicts.value.find((c) => c.status !== 'resolved') ?? null
  )

  /** 某份矛盾的全部记录 */
  function notesOf(conflictId: string): ConflictNote[] {
    return conflictNotes.value.filter((n) => n.conflict_id === conflictId)
  }

  /** 我在这份矛盾里填过没有 */
  const iFilledOpenConflict = computed(() => {
    const c = openConflict.value
    if (!c) return false
    return notesOf(c.id).some((n) => n.author === myId.value)
  })

  /** 双方是否都填了 */
  const bothFilled = computed(() => {
    const c = openConflict.value
    if (!c) return false
    const authors = new Set(notesOf(c.id).map((n) => n.author))
    return authors.size >= 2
  })

  /** 需要弹窗（吵架期间：双方都填完且状态是 active） */
  const needConflictPopup = computed(() => openConflict.value?.status === 'active')

  async function startConflict() {
    const src = await getFeedSource()
    const { error } = await src.startConflict()
    if (!error) await loadPetition()
    return { error }
  }

  async function addConflictNote(input: {
    conflict_id: string
    happened_on?: string
    matter: string
    demand: string
  }) {
    const src = await getFeedSource()
    const { error } = await src.addConflictNote(input)
    if (error) return { error }

    // 双方都填完 → 进入吵架期间
    const all = [...conflictNotes.value, { author: myId.value, conflict_id: input.conflict_id }]
    const authors = new Set(
      all.filter((n) => n.conflict_id === input.conflict_id).map((n) => n.author)
    )
    if (authors.size >= 2) {
      await src.setConflictStatus(input.conflict_id, 'active')
    }
    await loadPetition()
    return { error: null }
  }

  async function setConflictStatus(id: string, status: ConflictStatus) {
    const src = await getFeedSource()
    const { error } = await src.setConflictStatus(id, status)
    if (!error) await loadPetition()
    return { error }
  }

  return {
    // 状态
    requests,
    kisses,
    wishes,
    conflicts,
    conflictNotes,
    loading,
    resetPetition,
    partnerName,
    myId,
    loadPetition,

    // 奶茶券
    pendingRequests,
    myRequests,
    requestMilktea,
    resolveRequest,
    issueVoucher,

    // 亲亲
    freeUsedToday,
    freeLeftToday,
    kissDebt,
    pendingKisses,
    myPendingKisses,
    askKiss,
    requestKiss,
    resolveKiss,
    redeemKiss,

    // 心愿
    wishList,
    addWish,
    toggleWish,

    // 矛盾
    openConflict,
    notesOf,
    iFilledOpenConflict,
    bothFilled,
    needConflictPopup,
    startConflict,
    addConflictNote,
    setConflictStatus
  }
}

/* ============================================================
   青桃 · 请愿（奶茶券请求 / 亲亲 / 心愿 / 矛盾记录）

   规则：
   - 奶茶券：她请求 → 他同意（会真的发一张券）/ 驳回；他也可主动发。
   - 亲亲：每人每天免费 10 次；超出要对方同意才算；累计成她想亲的次数
     （只增不减，不销账——见 redeemKiss 的说明）。
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
import { defaultVoucherExpiry } from './useVoucherExpiry'

/** 每天免费请求亲亲的次数 */
export const KISS_FREE_PER_DAY = 10

const requests = ref<MilkteaRequest[]>([])
const kisses = ref<Kiss[]>([])
const wishes = ref<Wish[]>([])
const conflicts = ref<Conflict[]>([])
const conflictNotes = ref<ConflictNote[]>([])
const loading = ref(false)
/** 请愿数据整体没拉下来时的提示（界面通过 MainLayout 的 toast 感知） */
const loadError = ref<string | null>(null)
/** 写了一半失败（业务行写进去了、动态没写）时的明确提示 */
const notice = ref<string | null>(null)

/** 和好入口是否打开。模块级，所以任何页面都能把它叫出来 */
const pauseOpen = ref(false)

/** 账号切换代数：旧请求回来时直接丢掉 */
let epoch = 0
let loadSeq = 0

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

function notify(text: string): void {
  console.warn('[青桃]', text)
  notice.value = text
}

/**
 * 退出登录 / 换账号时必须调一次：
 * 这些也是模块级单例，不清掉的话换个人进来还是上一个人的请愿数据。
 */
function resetPetition(): void {
  epoch += 1
  loadSeq += 1
  requests.value = []
  kisses.value = []
  wishes.value = []
  conflicts.value = []
  conflictNotes.value = []
  loading.value = false
  loadError.value = null
  notice.value = null
  // 和好入口是模块级的：不清的话换个人进来会直接看到上一个人的暂停页
  pauseOpen.value = false
  // 「待会儿」是按记录 id 记在本机的；不清会跨账号吞掉新账号的弹层
  try {
    localStorage.removeItem('qingtao_kiss_later')
  } catch {
    /* 忽略 */
  }
}

export function usePetition() {
  const { myProfile, ensureMe, ensurePartner, publishEvent, events } = useFeed()

  const myId = computed(() => myProfile.value?.id ?? '')
  /** 对方称呼 */
  const partnerName = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))

  /** 一次性把请愿相关的数据都拉回来。单张表失败时保留它上一次的数据。 */
  async function loadPetition(): Promise<void> {
    const myEpoch = epoch
    const seq = ++loadSeq
    loading.value = true
    loadError.value = null

    try {
      // 角色判定需要两个人：只拿自己会让她的 herId 空着，
      // 于是 iAmHer=false、喝奶茶按 self 记账（完全不扣额度）还不报错。
      await Promise.all([ensureMe(), ensurePartner()])
      if (myEpoch !== epoch) return

      const src = await getFeedSource()
      const [r, k, w, c, n] = await Promise.all([
        src.listMilkteaRequests(),
        src.listKisses(),
        src.listWishes(),
        src.listConflicts(),
        src.listConflictNotes()
      ])
      if (myEpoch !== epoch || seq !== loadSeq) return

      const firstError = r.error || k.error || w.error || c.error || n.error
      // 失败的那张表不要用空数组覆盖旧数据，否则一次网络抖动会让整页「清零」
      if (!r.error) requests.value = r.data
      if (!k.error) kisses.value = k.data
      if (!w.error) wishes.value = w.data
      if (!c.error) conflicts.value = c.data
      if (!n.error) conflictNotes.value = n.data

      if (firstError) {
        loadError.value = '请愿数据没拉到，先显示上一次的'
        console.error('[青桃] 读取请愿数据失败：', firstError)
      }
    } catch (e) {
      if (myEpoch === epoch) {
        loadError.value = '请愿数据没拉到，先显示上一次的'
        console.error('[青桃] 读取请愿数据失败：', e)
      }
    } finally {
      if (myEpoch === epoch && seq === loadSeq) loading.value = false
    }
  }

  /* ============ 奶茶券 ============ */
  /* 两个人是定死的：她讨、他发。所以「待处理」分成两个方向：
     - 等我回的（对方递的）
     - 我等回话的（我递的）
     界面按角色各取所需，不必自己再筛人。 */
  const pendingRequestsForMe = computed(() =>
    requests.value.filter(
      (x) => x.status === 'pending' && !!myId.value && x.requester !== myId.value
    )
  )
  const pendingRequestsByMe = computed(() =>
    requests.value.filter(
      (x) => x.status === 'pending' && !!myId.value && x.requester === myId.value
    )
  )
  /** 兼容旧调用点：pendingRequests 一律表示「等我回的」 */
  const pendingRequests = pendingRequestsForMe
  const myRequests = computed(() => requests.value.filter((x) => !!myId.value && x.requester === myId.value))

  async function requestMilktea(reason: string) {
    try {
      const src = await getFeedSource()
      const { error } = await src.addMilkteaRequest({ reason })
      if (error) return { error }
      // 请愿本身也进时光记录；它不算券，所以用 milktea_request
      const pub = await publishEvent({ type: 'milktea_request', content: reason, meta: { reason } })
      if (pub.error) notify('请求已经递上去了，但时光记录没写进去')
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 发起奶茶券请求失败：', e)
      return { error: e }
    }
  }

  /**
   * 审批：同意时会真的发一张券（写一条 milktea_issue 动态，券余额才算得上）。
   * 到期日由调用方给；没给就用全站同一个默认（今天 + 7 天），
   * 保证「面板里批准」和「弹窗里批准」写进去的是同一套日期口径。
   */
  async function resolveRequest(
    id: string,
    status: Exclude<RequestStatus, 'pending'>,
    opts?: { expires_at?: string }
  ) {
    try {
      const src = await getFeedSource()
      const target = requests.value.find((x) => x.id === id)
      const { error } = await src.resolveMilkteaRequest(id, status)
      if (error) return { error }

      if (status === 'approved') {
        /* 两次写：请求状态 + 发券动态。如果第二笔失败（以前 error 被丢掉），
           就会出现「已同意但没有券」。这里：
           1) 先查是不是已经写过了（重试不会重复发券）；
           2) 失败时明确报出来，界面能看到。 */
        const alreadyIssued = events.value.some(
          (e) => e.type === 'milktea_issue' && e.meta?.from_request === id
        )
        if (!alreadyIssued) {
          const pub = await publishEvent({
            type: 'milktea_issue',
            content: '奶茶券 · 一张',
            meta: {
              count: 1,
              reason: target?.reason ?? null,
              expires_at: opts?.expires_at || defaultVoucherExpiry(),
              from_request: id
            }
          })
          if (pub.error) {
            await loadPetition()
            notify('奶茶券请求已同意，但发券记录没写进去：刷新后再看一次，别重复点')
            return { error: pub.error }
          }
        }
      }
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 审批奶茶券请求失败：', e)
      return { error: e }
    }
  }

  /** 主动发券：必须写因何故 + 到期时间 */
  async function issueVoucher(reason: string, expiresAt: string) {
    try {
      const { error } = await publishEvent({
        type: 'milktea_issue',
        content: '奶茶券 · 一张',
        meta: { count: 1, reason: reason || null, expires_at: expiresAt || null }
      })
      if (!error) await loadPetition()
      return { error }
    } catch (e) {
      console.error('[青桃] 发奶茶券失败：', e)
      return { error: e }
    }
  }

  /* ============ 亲亲 ============ */
  /** 我今天已经用掉的免费次数 */
  const freeUsedToday = computed(() =>
    kisses.value
      .filter((k) => !!myId.value && k.requester === myId.value && k.status === 'free' && isToday(k.created_at))
      .reduce((s, k) => s + k.count, 0)
  )
  /** 我今天还剩几次免费 */
  const freeLeftToday = computed(() => Math.max(0, KISS_FREE_PER_DAY - freeUsedToday.value))

  /** 她记着的亲亲：免费 + 已同意、还没在旧版本里兑现过的总数（只增不减） */
  const kissDebt = computed(() =>
    kisses.value
      .filter((k) => (k.status === 'free' || k.status === 'approved') && !k.redeemed)
      .reduce((s, k) => s + k.count, 0)
  )
  /** 待我同意的亲亲请求（对方发的） */
  const pendingKissesForMe = computed(() =>
    kisses.value.filter(
      (k) => k.status === 'pending' && !!myId.value && k.requester !== myId.value
    )
  )
  /** 我发出去还没被处理的 */
  const pendingKissesByMe = computed(() =>
    kisses.value.filter(
      (k) => k.status === 'pending' && !!myId.value && k.requester === myId.value
    )
  )
  /** 兼容旧调用点：pendingKisses 表示「等我回的」 */
  const pendingKisses = pendingKissesForMe
  const myPendingKisses = pendingKissesByMe

  /** 「想亲」：免费额度内直接算；短时间点好几下会合并成一条「想亲 ×n」 */
  async function askKiss(count = 1) {
    try {
      const src = await getFeedSource()
      const n = Math.min(count, Math.max(0, freeLeftToday.value))
      if (n <= 0) return { error: 'no-quota', free: false }

      const { error } = await src.addKiss({ count: n, free: true })
      if (error) return { error, free: true }

      const pub = await publishEvent({ type: 'kiss', content: '', meta: { kind: 'ask', count: n } })
      if (pub.error) notify('亲亲记下了，但时光记录没写进去')
      await loadPetition()
      return { error: null, free: true }
    } catch (e) {
      console.error('[青桃] 请求亲亲失败：', e)
      return { error: e, free: true }
    }
  }

  /** 请愿亲亲：写清楚为什么想亲，可以附一张照片 */
  async function requestKiss(reason: string, photoUrl?: string) {
    try {
      const src = await getFeedSource()
      const { error } = await src.addKiss({ count: 1, free: false, reason, photoUrl })
      if (error) return { error }

      const pub = await publishEvent({
        type: 'kiss',
        content: reason,
        photo_urls: photoUrl ? [photoUrl] : undefined,
        meta: { kind: 'request', count: 1, reason, photo_url: photoUrl ?? null }
      })
      if (pub.error) notify('亲亲请愿已递上，但时光记录没写进去')
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 请求亲亲失败：', e)
      return { error: e }
    }
  }

  async function resolveKiss(id: string, status: 'approved' | 'rejected') {
    try {
      const src = await getFeedSource()
      const target = kisses.value.find((k) => k.id === id)
      const { error } = await src.resolveKiss(id, status)
      if (error) return { error }

      // 答应了也记一条；拒绝不记（拒了就不是好事，不用留在记录里）
      if (status === 'approved') {
        const alreadyRecorded = events.value.some(
          (e) => e.type === 'kiss' && e.meta?.from_kiss === id
        )
        if (!alreadyRecorded) {
          const pub = await publishEvent({
            type: 'kiss',
            content: '',
            meta: { kind: 'granted', count: target?.count ?? 1, from_kiss: id }
          })
          if (pub.error) notify('亲亲已答应，但时光记录没写进去')
        }
      }
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 处理亲亲请求失败：', e)
      return { error: e }
    }
  }

  /**
   * 兑现一条亲亲（把 redeemed 置 true）。
   *
   * 界面上**故意没有入口**：按 PRODUCT.md，这个数字是「她卖一次萌就记一次」
   * 的玩笑，不是欠账——一加「兑现 / 销账」按钮，这个梗就死了。
   * 方法保留给旧数据的口径（kissDebt 仍排除历史上已兑现的行），
   * 新数据只增不减；不要再把它接回 KissPanel。
   */
  async function redeemKiss(id: string) {
    try {
      const src = await getFeedSource()
      const { error } = await src.redeemKiss(id)
      if (!error) await loadPetition()
      return { error }
    } catch (e) {
      console.error('[青桃] 兑现亲亲失败：', e)
      return { error: e }
    }
  }

  /* ============ 心愿 ============ */
  const wishList = computed(() => wishes.value)

  async function addWish(content: string, wantAt?: string | null) {
    try {
      const src = await getFeedSource()
      const { error } = await src.addWish({ content, want_at: wantAt || null })
      if (error) return { error }

      // 同时写一条动态，首页能看到「他添加了心愿」
      const pub = await publishEvent({
        type: 'wish',
        content,
        meta: { want_at: wantAt || null }
      })
      if (pub.error) notify('心愿许下了，但时光记录没写进去')
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 添加心愿失败：', e)
      return { error: e }
    }
  }

  async function toggleWish(id: string, done: boolean) {
    try {
      const src = await getFeedSource()
      const { error } = await src.setWishDone(id, done)
      if (!error) await loadPetition()
      return { error }
    } catch (e) {
      console.error('[青桃] 更新心愿失败：', e)
      return { error: e }
    }
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
  /* 还在吵架、或者上次选了冷静 —— 两种情况都要弹（规则里写了：冷静不算结束） */
  const needConflictPopup = computed(
    () => openConflict.value?.status === 'active' || openConflict.value?.status === 'calm'
  )

  /** 状态写失败时重试一次：这是进「吵架期间」的开关，不能悄悄失败 */
  async function setConflictStatusWithRetry(
    id: string,
    status: ConflictStatus
  ): Promise<{ error: unknown }> {
    const src = await getFeedSource()
    let res = await src.setConflictStatus(id, status)
    if (res.error) {
      res = await src.setConflictStatus(id, status)
    }
    return res
  }

  async function startConflict() {
    try {
      const src = await getFeedSource()
      const { error } = await src.startConflict()
      if (!error) await loadPetition()
      return { error }
    } catch (e) {
      console.error('[青桃] 发起矛盾记录失败：', e)
      return { error: e }
    }
  }

  async function addConflictNote(input: {
    conflict_id: string
    happened_on?: string
    matter: string
    demand: string
  }) {
    try {
      const src = await getFeedSource()
      const { error } = await src.addConflictNote(input)
      if (error) return { error }

      // 双方都填完 → 进入吵架期间
      const authors = new Set(
        conflictNotes.value
          .filter((n) => n.conflict_id === input.conflict_id)
          .map((n) => n.author)
      )
      if (myId.value) authors.add(myId.value)
      if (authors.size >= 2) {
        const res = await setConflictStatusWithRetry(input.conflict_id, 'active')
        if (res.error) {
          notify('你这一份已保存，但「进入吵架期间」的状态没更新：刷新后再试一次')
        }
      }
      await loadPetition()
      return { error: null }
    } catch (e) {
      console.error('[青桃] 保存矛盾记录失败：', e)
      return { error: e }
    }
  }

  async function setConflictStatus(id: string, status: ConflictStatus) {
    try {
      const { error } = await setConflictStatusWithRetry(id, status)
      if (!error) await loadPetition()
      return { error }
    } catch (e) {
      console.error('[青桃] 更新矛盾状态失败：', e)
      return { error: e }
    }
  }

  return {
    // 状态
    requests,
    kisses,
    wishes,
    conflicts,
    conflictNotes,
    loading,
    loadError,
    notice,
    pauseOpen,
    resetPetition,
    partnerName,
    myId,
    loadPetition,

    // 奶茶券
    pendingRequests,
    pendingRequestsForMe,
    pendingRequestsByMe,
    myRequests,
    requestMilktea,
    resolveRequest,
    issueVoucher,

    // 亲亲
    freeUsedToday,
    freeLeftToday,
    kissDebt,
    pendingKisses,
    pendingKissesForMe,
    pendingKissesByMe,
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

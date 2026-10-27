/* ============================================================
   青桃 · 内存数据源（本地演示 / 断网调样式）

   行为刻意和 Supabase 版保持一致：最新在前、发完立刻可读。
   为了让本地演示「刷新后还在」，请愿相关的数据会存一份到
   localStorage；想回到初始演示数据，清掉 qingtao_mock_petition_v1 即可。
   ============================================================ */

import type {
  AdminRecord,
  Conflict,
  ConflictNote,
  ConflictStatus,
  CoupleEvent,
  Kiss,
  MilkteaRequest,
  Profile,
  RequestStatus,
  Wish
} from '../types/domain'
import type { FeedSource, LoadResult, PublishInput, PublishResult, Result, UploadResult } from './feedSource'
import { ADMIN_TABLES, buildAdminRecords } from './adminRecords'
import { MOCK_EVENTS, MOCK_ME, MOCK_PARTNER } from './mockFeed'
import { shrinkImage } from './image'

// 复制一份，避免直接改动 mockFeed 里的预置数组
const store: CoupleEvent[] = [...MOCK_EVENTS]

/* 演示用：可以把「我」切成她，方便看另一边的界面
   在控制台执行 __qtAs('partner') 然后刷新即可；必须是模块最顶部，
   因为下面的初始化代码就会用到 meId()。 */
let actingAs: 'me' | 'partner' = 'me'
try {
  if (
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('qingtao_mock_role') === 'partner'
  ) {
    actingAs = 'partner'
  }
} catch {
  /* 忽略 */
}
function meId(): string {
  return actingAs === 'partner' ? MOCK_PARTNER.id : MOCK_ME.id
}

/**
 * 演示用：本机改过的档案（「我是谁」）也存一份。
 * **按身份分开存**，否则用 me 改一次昵称，切到 partner 也会读到同一个补丁
 * （两个身份串号，甚至会因为两个 gender 相同而判错角色）。
 * 兼容旧版扁平结构：只归给默认的 'me'。
 */
type ProfilePatch = Partial<Profile>
function readProfileRoot(): Record<string, ProfilePatch> {
  try {
    const raw = localStorage.getItem('qingtao_mock_profile')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const obj = parsed as Record<string, unknown>
    if ('me' in obj || 'partner' in obj) {
      return obj as Record<string, ProfilePatch>
    }
    // 旧版：整个对象就是 me 的补丁
    return { me: parsed as ProfilePatch }
  } catch {
    return {}
  }
}
function profilePatch(): ProfilePatch {
  return readProfileRoot()[actingAs] ?? {}
}

/** 本地演示里后台是否已登录（真实环境是 Supabase 会话） */
let adminLoggedIn = false

let seq = 0
const nid = (p: string) => `${p}-${++seq}`

/** 相对现在往前推 n 分钟 */
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString()

const STORAGE_KEY = 'qingtao_mock_petition_v1'

// —— 请愿演示数据（首次进入时的样子）——
const requests: MilkteaRequest[] = [
  {
    id: 'req-1',
    requester: MOCK_PARTNER.id,
    reason: '今天想喝一杯芝士葡萄',
    status: 'pending',
    resolver: null,
    created_at: ago(90),
    resolved_at: null
  },
  {
    id: 'req-2',
    requester: MOCK_PARTNER.id,
    reason: '加班到很晚',
    status: 'approved',
    resolver: MOCK_ME.id,
    created_at: ago(2000),
    resolved_at: ago(1900)
  }
]

const kisses: Kiss[] = [
  {
    id: 'k-1',
    requester: MOCK_PARTNER.id,
    count: 1,
    status: 'free',
    redeemed: false,
    resolver: null,
    created_at: ago(60),
    resolved_at: null
  },
  {
    id: 'k-2',
    requester: MOCK_PARTNER.id,
    count: 3,
    status: 'approved',
    redeemed: false,
    resolver: MOCK_ME.id,
    created_at: ago(500),
    resolved_at: ago(480)
  },
  {
    id: 'k-3',
    requester: MOCK_PARTNER.id,
    count: 1,
    status: 'pending',
    redeemed: false,
    resolver: null,
    created_at: ago(30),
    resolved_at: null
  },
  {
    id: 'k-4',
    requester: MOCK_PARTNER.id,
    count: 1,
    status: 'free',
    redeemed: true,
    resolver: null,
    created_at: ago(1400),
    resolved_at: null
  }
]

const wishes: Wish[] = [
  {
    id: 'w-1',
    owner: MOCK_PARTNER.id,
    content: '想在秋天去看一次银杏，要一起捡一片最完整的夹在书里。',
    want_at: '2026-11-01',
    done: false,
    created_at: ago(1500),
    done_at: null
  },
  {
    id: 'w-2',
    owner: meId(),
    content: '一起把阳台改成小花园。',
    want_at: null,
    done: true,
    created_at: ago(3000),
    done_at: ago(800)
  }
]

const conflicts: Conflict[] = []
const conflictNotes: ConflictNote[] = []

/* —— 刷新后仍在：把请愿数据存到 localStorage —— */
/** 返回是否真的写进去了（localStorage 满 / 隐私模式会失败） */
function persist(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        events: store,
        requests,
        kisses,
        wishes,
        conflicts,
        conflictNotes,
        revokedEvents: store.filter((e) => e.revoked_at).map((e) => e.id)
      })
    )
    return true
  } catch (e) {
    // 不能默默吞掉：否则界面显示成功、刷新后却什么都没了
    console.error('[青桃] 本地演示数据没写进 localStorage（可能超出容量）：', e)
    return false
  }
}

/** 写失败时返回一句可读错误，写成功返回 { error: null } */
function persistResult(): { error: unknown } {
  return { error: persist() ? null : '本地演示数据没存下（localStorage 可能满了），刷新后会丢' }
}

function restore() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Partial<{
      events: CoupleEvent[]
      requests: MilkteaRequest[]
      kisses: Kiss[]
      wishes: Wish[]
      conflicts: Conflict[]
      conflictNotes: ConflictNote[]
      revokedEvents: string[]
    }>
    if (Array.isArray(s.events)) store.splice(0, store.length, ...s.events)
    if (Array.isArray(s.requests)) requests.splice(0, requests.length, ...s.requests)
    if (Array.isArray(s.kisses)) kisses.splice(0, kisses.length, ...s.kisses)
    if (Array.isArray(s.wishes)) wishes.splice(0, wishes.length, ...s.wishes)
    if (Array.isArray(s.conflicts)) conflicts.splice(0, conflicts.length, ...s.conflicts)
    if (Array.isArray(s.conflictNotes)) conflictNotes.splice(0, conflictNotes.length, ...s.conflictNotes)
    if (Array.isArray(s.revokedEvents)) {
      for (const id of s.revokedEvents) {
        const e = store.find((x) => x.id === id)
        if (e) e.revoked_at = new Date().toISOString()
      }
    }
  } catch {
    /* 数据坏了就当没有，用预置的 */
  }
}
restore()

/** 把 File 读成 data: URL：本地演示没有服务端，只有这样才能刷新后还在 */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

/* 演示用：切换身份（见文件顶部说明） */
export const mockSource: FeedSource = {
  async getMe(): Promise<Profile | null> {
    // 返回副本：上层（resolveRoles / actorLabel）不能改到演示常量
    return { ...(actingAs === 'partner' ? MOCK_PARTNER : MOCK_ME), ...profilePatch() }
  },

  async getPartner(): Promise<Profile | null> {
    // 必须返回副本：以前直接返回 MOCK_* 常量，上层就地写 gender 会永久污染演示数据
    return { ...(actingAs === 'partner' ? MOCK_ME : MOCK_PARTNER) }
  },

  async updateProfile(patch): Promise<{ error: unknown }> {
    try {
      const root = readProfileRoot()
      root[actingAs] = { ...(root[actingAs] ?? {}), ...(patch as ProfilePatch) }
      localStorage.setItem('qingtao_mock_profile', JSON.stringify(root))
      return { error: null }
    } catch (e) {
      console.error('[青桃] 本地演示：保存档案失败', e)
      return { error: e }
    }
  },

  async setOwnRevoked(id: string, revoked: boolean) {
    const e = store.find((x) => x.id === id && x.actor_id === meId())
    if (!e) return { error: '没有这条记录' }
    e.revoked_at = revoked ? new Date().toISOString() : undefined
    return persistResult()
  },

  async listMyRevoked() {
    return {
      data: store.filter((e) => !!e.revoked_at && e.actor_id === meId()),
      error: null
    }
  },

  async listEvents(limit: number): Promise<LoadResult> {
    // 和线上一致：已撤销的记录，普通账号查不到
    const sorted = store
      .filter((e) => !e.revoked_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { data: sorted.slice(0, limit), error: null }
  },

  async addEvent(input: PublishInput): Promise<PublishResult> {
    const row: CoupleEvent = {
      id: nid('local'),
      actor_id: meId(),
      type: input.type,
      content: input.content ?? null,
      photo_urls: input.photo_urls ?? null,
      meta: input.meta ?? null,
      created_at: new Date().toISOString()
    }
    store.push(row)
    const { error } = persistResult()
    if (error) {
      // 没存下就别让它留在内存里冒充「已写入」，否则刷新后消失更难查
      store.pop()
      return { error }
    }
    return { error: null, data: row }
  },

  async uploadPhoto(file: File): Promise<UploadResult> {
    /* 本地演示：不能返回 blob: URL —— 它只在当前页面活着，
       存进事件再刷新就变成裂图（以前就是这样把 blob 写进了「数据库」）。
       这里压一道再转成 data: URL，刷新后仍然能显示。 */
    try {
      const small = await shrinkImage(file)
      const url = await readAsDataURL(small)
      return { url, error: null }
    } catch (e) {
      console.error('[青桃] 本地演示：读取照片失败', e)
      return { url: null, error: e }
    }
  },

  /* —— 奶茶券请求 —— */
  async listMilkteaRequests(): Promise<Result<MilkteaRequest[]>> {
    return { data: requests.filter((x) => !x.revoked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addMilkteaRequest(input) {
    requests.push({
      id: nid('req'),
      requester: meId(),
      reason: input.reason ?? null,
      status: 'pending',
      resolver: null,
      created_at: new Date().toISOString(),
      resolved_at: null
    })
    return persistResult()
  },

  async resolveMilkteaRequest(id, status: Exclude<RequestStatus, 'pending'>) {
    const r = requests.find((x) => x.id === id)
    if (!r) return { error: '没有这条奶茶券请求（可能已被处理或删除）' }
    r.status = status
    r.resolver = meId()
    r.resolved_at = new Date().toISOString()
    return persistResult()
  },

  /* —— 亲亲 —— */
  async listKisses(): Promise<Result<Kiss[]>> {
    return { data: kisses.filter((x) => !x.revoked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addKiss(input) {
    kisses.push({
      id: nid('k'),
      requester: meId(),
      count: input.count ?? 1,
      status: input.free ? 'free' : 'pending',
      redeemed: false,
      resolver: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
      reason: input.reason ?? null,
      photo_url: input.photoUrl ?? null
    })
    return persistResult()
  },

  async resolveKiss(id, status: 'approved' | 'rejected') {
    const k = kisses.find((x) => x.id === id)
    if (!k) return { error: '没有这条亲亲记录' }
    k.status = status
    k.resolver = meId()
    k.resolved_at = new Date().toISOString()
    return persistResult()
  },

  async redeemKiss(id) {
    const k = kisses.find((x) => x.id === id)
    if (!k) return { error: '没有这条亲亲记录' }
    k.redeemed = true
    return persistResult()
  },

  /* —— 心愿 —— */
  async listWishes(): Promise<Result<Wish[]>> {
    return { data: wishes.filter((x) => !x.revoked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addWish(input) {
    wishes.push({
      id: nid('w'),
      owner: meId(),
      content: input.content,
      want_at: input.want_at || null,
      done: false,
      created_at: new Date().toISOString(),
      done_at: null
    })
    return persistResult()
  },

  async setWishDone(id, done: boolean) {
    const w = wishes.find((x) => x.id === id)
    if (!w) return { error: '没有这个心愿' }
    w.done = done
    w.done_at = done ? new Date().toISOString() : null
    return persistResult()
  },

  /* —— 矛盾记录 —— */
  async listConflicts(): Promise<Result<Conflict[]>> {
    return { data: conflicts.filter((x) => !x.revoked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async startConflict() {
    if (conflicts.some((c) => c.status !== 'resolved')) return { error: '已有进行中的矛盾记录' }
    conflicts.push({
      id: nid('cf'),
      status: 'collecting',
      started_by: meId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    return persistResult()
  },

  async listConflictNotes(): Promise<Result<ConflictNote[]>> {
    return { data: conflictNotes.filter((x) => !x.revoked_at), error: null }
  },

  async addConflictNote(input) {
    const cf = conflicts.find((c) => c.id === input.conflict_id)
    if (!cf) return { error: '没有这份矛盾记录' }
    conflictNotes.push({
      id: nid('cn'),
      conflict_id: input.conflict_id,
      author: meId(),
      happened_on: input.happened_on ?? null,
      matter: input.matter,
      demand: input.demand,
      created_at: new Date().toISOString()
    })
    // 双方都填了 → 自动进入 active
    const note = conflictNotes.filter((n) => n.conflict_id === input.conflict_id)
    const authors = new Set(note.map((n) => n.author))
    if (cf.status === 'collecting' && authors.size >= 2) cf.status = 'active'
    return persistResult()
  },

  async setConflictStatus(id, status: ConflictStatus) {
    const cf = conflicts.find((c) => c.id === id)
    if (!cf) return { error: '没有这份矛盾记录' }
    cf.status = status
    cf.updated_at = new Date().toISOString()
    return persistResult()
  },

  /* ============================================================
     管理后台（本地演示版）：账号密码随便填，只为把界面跑通
     ============================================================ */
  async adminSignIn(email: string, password: string) {
    if (!email.trim() || !password.trim()) return { error: '请输入账号和密码' }
    adminLoggedIn = true
    return { error: null }
  },

  async adminSignOut() {
    adminLoggedIn = false
  },

  async adminCheck() {
    return adminLoggedIn
  },

  async adminListAll(): Promise<Result<AdminRecord[]>> {
    return {
      data: buildAdminRecords({
        events: store,
        requests,
        kisses,
        wishes,
        conflicts,
        notes: conflictNotes
      }),
      error: null
    }
  },

  async adminSetRevoked(table: string, id: string, revoked: boolean) {
    if (!(ADMIN_TABLES as readonly string[]).includes(table)) return { error: '不允许的表' }
    const at = revoked ? new Date().toISOString() : null
    const lists: Record<string, { id: string; revoked_at?: string | null }[]> = {
      events: store,
      milktea_requests: requests,
      kisses,
      wishes,
      conflicts,
      conflict_notes: conflictNotes
    }
    const hit = lists[table]?.find((x) => x.id === id)
    if (!hit) return { error: '没有这条记录' }
    hit.revoked_at = at

    return persistResult()
  },

  async adminListProfiles(): Promise<Result<Profile[]>> {
    return { data: [MOCK_ME, MOCK_PARTNER], error: null }
  },

  /* —— 清理工具（本地演示版）—— */
  async adminPurge(table: string, id: string) {
    if (!(ADMIN_TABLES as readonly string[]).includes(table)) return { error: '不允许的表' }
    const lists: Record<string, { id: string }[]> = {
      events: store,
      milktea_requests: requests,
      kisses,
      wishes,
      conflicts,
      conflict_notes: conflictNotes
    }
    const arr = lists[table]
    if (!arr) return { error: '不允许的表' }
    const i = arr.findIndex((x) => x.id === id)
    if (i < 0) return { error: '没有这条记录' }
    arr.splice(i, 1)
    return persistResult()
  },

  async adminPurgeRevoked() {
    let count = 0
    const purge = (arr: { revoked_at?: string | null }[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const row = arr[i]
        if (row && row.revoked_at) {
          arr.splice(i, 1)
          count += 1
        }
      }
    }
    purge(store)
    purge(requests)
    purge(kisses)
    purge(wishes)
    purge(conflicts)
    purge(conflictNotes)
    const { error } = persistResult()
    return { count, error }
  },

  async adminPurgeBefore(before: string) {
    const t = new Date(`${before}T00:00:00`).getTime()
    let count = 0
    const purge = (arr: { created_at: string }[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const row = arr[i]
        if (row && new Date(row.created_at).getTime() < t) {
          arr.splice(i, 1)
          count += 1
        }
      }
    }
    purge(store)
    purge(requests)
    purge(kisses)
    purge(wishes)
    purge(conflicts)
    purge(conflictNotes)
    const { error } = persistResult()
    return { count, error }
  }
}

/* ------------------------------------------------------------
   本地演示专用：把一个真实的两人流程补全。
   内存源只有「我」一个账号，没办法真的等对方来填，
   所以留一个钩子把对方的记录补上，方便看完整效果（也用于自动化验证）。
   ------------------------------------------------------------ */
declare global {
  interface Window {
    /** 不传 id 就补到当前那份还没结束的矛盾上 */
    __qtSimulatePartnerNote?: (conflictId?: string) => void
    /** 清掉本地演示数据，回到初始样例 */
    __qtResetMock?: () => void
    /** 演示用：切换「我」是谁（'me' = 他，'partner' = 她），刷新生效 */
    __qtAs?: (role: 'me' | 'partner') => void
  }
}

if (typeof window !== 'undefined') {
  window.__qtSimulatePartnerNote = (conflictId?: string) => {
    const cf = conflictId
      ? conflicts.find((c) => c.id === conflictId)
      : conflicts.find((c) => c.status !== 'resolved')
    if (!cf) return
    if (conflictNotes.some((n) => n.conflict_id === cf.id && n.author === MOCK_PARTNER.id)) return

    conflictNotes.push({
      id: nid('cn'),
      conflict_id: cf.id,
      author: MOCK_PARTNER.id,
      happened_on: '昨天晚上',
      matter: '（对方的说法）我那天确实说话急了，没顾上你的感受。',
      demand: '（对方的诉求）希望下次有情绪的时候，先说一句「我现在有点乱」，别直接不理人。',
      created_at: new Date().toISOString()
    })
    cf.status = 'active'
    cf.updated_at = new Date().toISOString()
    persist()
  }

  window.__qtResetMock = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
  }

  window.__qtAs = (role) => {
    try {
      localStorage.setItem('qingtao_mock_role', role)
    } catch {
      /* 忽略 */
    }
  }
}

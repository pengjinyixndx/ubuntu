/* ============================================================
   青桃 · 内存数据源（本地演示 / 断网调样式）

   行为刻意和 Supabase 版保持一致：最新在前、发完立刻可读。
   为了让本地演示「刷新后还在」，请愿相关的数据会存一份到
   localStorage；想回到初始演示数据，清掉 qingtao_mock_petition_v1 即可。
   ============================================================ */

import type {
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
import type { FeedSource, LoadResult, PublishInput, Result, UploadResult } from './feedSource'
import { MOCK_EVENTS, MOCK_ME, MOCK_PARTNER } from './mockFeed'

// 复制一份，避免直接改动 mockFeed 里的预置数组
const store: CoupleEvent[] = [...MOCK_EVENTS]

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
    owner: MOCK_ME.id,
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
function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ requests, kisses, wishes, conflicts, conflictNotes })
    )
  } catch {
    /* 存不下就算了，不影响使用 */
  }
}

function restore() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Partial<{
      requests: MilkteaRequest[]
      kisses: Kiss[]
      wishes: Wish[]
      conflicts: Conflict[]
      conflictNotes: ConflictNote[]
    }>
    if (Array.isArray(s.requests)) requests.splice(0, requests.length, ...s.requests)
    if (Array.isArray(s.kisses)) kisses.splice(0, kisses.length, ...s.kisses)
    if (Array.isArray(s.wishes)) wishes.splice(0, wishes.length, ...s.wishes)
    if (Array.isArray(s.conflicts)) conflicts.splice(0, conflicts.length, ...s.conflicts)
    if (Array.isArray(s.conflictNotes)) conflictNotes.splice(0, conflictNotes.length, ...s.conflictNotes)
  } catch {
    /* 数据坏了就当没有，用预置的 */
  }
}
restore()

export const mockSource: FeedSource = {
  async getMe(): Promise<Profile | null> {
    return MOCK_ME
  },

  async getPartner(): Promise<Profile | null> {
    return MOCK_PARTNER
  },

  async listEvents(limit: number): Promise<LoadResult> {
    const sorted = [...store].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { data: sorted.slice(0, limit), error: null }
  },

  async addEvent(input: PublishInput): Promise<{ error: unknown }> {
    store.push({
      id: nid('local'),
      actor_id: MOCK_ME.id,
      type: input.type,
      content: input.content ?? null,
      photo_urls: input.photo_urls ?? null,
      meta: input.meta ?? null,
      created_at: new Date().toISOString()
    })
    return { error: null }
  },

  async uploadPhoto(file: File): Promise<UploadResult> {
    // 本地演示：不真的上传，直接用内存里的 object URL（刷新即失效）
    return { url: URL.createObjectURL(file), error: null }
  },

  /* —— 奶茶券请求 —— */
  async listMilkteaRequests(): Promise<Result<MilkteaRequest[]>> {
    return { data: [...requests].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addMilkteaRequest(input) {
    requests.push({
      id: nid('req'),
      requester: MOCK_ME.id,
      reason: input.reason ?? null,
      status: 'pending',
      resolver: null,
      created_at: new Date().toISOString(),
      resolved_at: null
    })
    persist()
    return { error: null }
  },

  async resolveMilkteaRequest(id, status: Exclude<RequestStatus, 'pending'>) {
    const r = requests.find((x) => x.id === id)
    if (r) {
      r.status = status
      r.resolver = MOCK_ME.id
      r.resolved_at = new Date().toISOString()
      persist()
    }
    return { error: null }
  },

  /* —— 亲亲 —— */
  async listKisses(): Promise<Result<Kiss[]>> {
    return { data: [...kisses].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addKiss(input) {
    kisses.push({
      id: nid('k'),
      requester: MOCK_ME.id,
      count: input.count ?? 1,
      status: input.free ? 'free' : 'pending',
      redeemed: false,
      resolver: null,
      created_at: new Date().toISOString(),
      resolved_at: null
    })
    persist()
    return { error: null }
  },

  async resolveKiss(id, status: 'approved' | 'rejected') {
    const k = kisses.find((x) => x.id === id)
    if (k) {
      k.status = status
      k.resolver = MOCK_ME.id
      k.resolved_at = new Date().toISOString()
      persist()
    }
    return { error: null }
  },

  async redeemKiss(id) {
    const k = kisses.find((x) => x.id === id)
    if (k) {
      k.redeemed = true
      persist()
    }
    return { error: null }
  },

  /* —— 心愿 —— */
  async listWishes(): Promise<Result<Wish[]>> {
    return { data: [...wishes].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async addWish(input) {
    wishes.push({
      id: nid('w'),
      owner: MOCK_ME.id,
      content: input.content,
      want_at: input.want_at || null,
      done: false,
      created_at: new Date().toISOString(),
      done_at: null
    })
    persist()
    return { error: null }
  },

  async setWishDone(id, done: boolean) {
    const w = wishes.find((x) => x.id === id)
    if (w) {
      w.done = done
      w.done_at = done ? new Date().toISOString() : null
      persist()
    }
    return { error: null }
  },

  /* —— 矛盾记录 —— */
  async listConflicts(): Promise<Result<Conflict[]>> {
    return { data: [...conflicts].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null }
  },

  async startConflict() {
    if (conflicts.some((c) => c.status !== 'resolved')) return { error: '已有进行中的矛盾记录' }
    conflicts.push({
      id: nid('cf'),
      status: 'collecting',
      started_by: MOCK_ME.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    persist()
    return { error: null }
  },

  async listConflictNotes(): Promise<Result<ConflictNote[]>> {
    return { data: [...conflictNotes], error: null }
  },

  async addConflictNote(input) {
    conflictNotes.push({
      id: nid('cn'),
      conflict_id: input.conflict_id,
      author: MOCK_ME.id,
      happened_on: input.happened_on ?? null,
      matter: input.matter,
      demand: input.demand,
      created_at: new Date().toISOString()
    })
    // 双方都填了 → 自动进入 active
    const note = conflictNotes.filter((n) => n.conflict_id === input.conflict_id)
    const authors = new Set(note.map((n) => n.author))
    const cf = conflicts.find((c) => c.id === input.conflict_id)
    if (cf && cf.status === 'collecting' && authors.size >= 2) cf.status = 'active'
    persist()
    return { error: null }
  },

  async setConflictStatus(id, status: ConflictStatus) {
    const cf = conflicts.find((c) => c.id === id)
    if (cf) {
      cf.status = status
      cf.updated_at = new Date().toISOString()
      persist()
    }
    return { error: null }
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
}

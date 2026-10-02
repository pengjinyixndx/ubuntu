/* ============================================================
   青桃 · 管理后台：把六张表拉平成同一种「记录」

   后台要在一个列表里看全部内容，但数据散在六张表里、字段各不相同。
   这里统一做一次映射，supabase 实现和内存实现共用同一套规则，
   免得两边显示不一致。
   ============================================================ */

import type {
  AdminRecord,
  Conflict,
  ConflictNote,
  CoupleEvent,
  Kiss,
  MilkteaRequest,
  Wish
} from '../types/domain'

const EVENT_KIND: Record<string, string> = {
  note: '随笔',
  diary: '日记',
  photo: '照片',
  milktea_issue: '奶茶券（发出）',
  milktea_redeem: '奶茶券（核销）',
  milktea_request: '奶茶券（请愿）',
  wish: '心愿',
  kiss: '亲亲'
}

/** 允许撤销 / 恢复的表 */
export const ADMIN_TABLES = [
  'events',
  'milktea_requests',
  'kisses',
  'wishes',
  'conflicts',
  'conflict_notes'
] as const

function requestStatus(s: string): string {
  return s === 'approved' ? '已同意' : s === 'rejected' ? '已驳回' : '待审批'
}
function kissStatus(s: string): string {
  if (s === 'approved') return '已同意'
  if (s === 'rejected') return '已驳回'
  if (s === 'pending') return '待同意'
  return '免费额度内'
}
function conflictStatus(s: string): string {
  if (s === 'collecting') return '等双方各写一份'
  if (s === 'active') return '吵架期间（打开会弹窗）'
  if (s === 'calm') return '已选冷静'
  return '已和好'
}
function shortJson(v: unknown): string {
  try {
    const s = JSON.stringify(v)
    return s.length > 120 ? `${s.slice(0, 120)}…` : s
  } catch {
    return ''
  }
}

export interface AdminRawData {
  events: CoupleEvent[]
  requests: MilkteaRequest[]
  kisses: Kiss[]
  wishes: Wish[]
  conflicts: Conflict[]
  notes: ConflictNote[]
}

/** 拉平成后台列表（最新在前） */
export function buildAdminRecords(raw: AdminRawData): AdminRecord[] {
  const rows: AdminRecord[] = []

  for (const e of raw.events) {
    rows.push({
      table: 'events',
      id: e.id,
      kind: EVENT_KIND[e.type] ?? e.type,
      actor: e.actor_id,
      content: e.content ?? '',
      photos: e.photo_urls ?? [],
      created_at: e.created_at,
      revoked_at: e.revoked_at ?? null,
      extra: e.meta ? shortJson(e.meta) : undefined
    })
  }

  for (const r of raw.requests) {
    rows.push({
      table: 'milktea_requests',
      id: r.id,
      kind: '奶茶券请求',
      actor: r.requester,
      content: `${r.reason || '（没写理由）'} · ${requestStatus(r.status)}`,
      photos: [],
      created_at: r.created_at,
      revoked_at: r.revoked_at ?? null
    })
  }

  for (const k of raw.kisses) {
    rows.push({
      table: 'kisses',
      id: k.id,
      kind: '亲亲',
      actor: k.requester,
      content: [
        k.count ? `${k.count} 个` : '1 个',
        kissStatus(k.status),
        k.redeemed ? '已兑现' : '',
        k.reason ? `理由：${k.reason}` : ''
      ]
        .filter(Boolean)
        .join(' · '),
      photos: k.photo_url ? [k.photo_url] : [],
      created_at: k.created_at,
      revoked_at: k.revoked_at ?? null
    })
  }

  for (const w of raw.wishes) {
    rows.push({
      table: 'wishes',
      id: w.id,
      kind: '心愿',
      actor: w.owner,
      content: `${w.content}${w.want_at ? ` · 想在 ${w.want_at} 完成` : ''}${w.done ? ' · 已完成' : ''}`,
      photos: [],
      created_at: w.created_at,
      revoked_at: w.revoked_at ?? null
    })
  }

  for (const c of raw.conflicts) {
    rows.push({
      table: 'conflicts',
      id: c.id,
      kind: '矛盾（一次）',
      actor: c.started_by,
      content: conflictStatus(c.status),
      photos: [],
      created_at: c.created_at,
      revoked_at: c.revoked_at ?? null
    })
  }

  for (const n of raw.notes) {
    rows.push({
      table: 'conflict_notes',
      id: n.id,
      kind: '矛盾（各写的一份）',
      actor: n.author,
      content: `什么时候：${n.happened_on || '—'}｜因为什么：${n.matter}｜诉求：${n.demand}`,
      photos: [],
      created_at: n.created_at,
      revoked_at: n.revoked_at ?? null,
      extra: `所属矛盾 ${n.conflict_id.slice(0, 8)}`
    })
  }

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return rows
}

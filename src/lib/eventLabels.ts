import type { EventType, Gender } from '../types/domain'

/**
 * 卡片抬头里的发布者称呼：自己=「我」；对方按 ta 的性别显示「他 / 她」。
 *
 * 以前是拿「性别是否相同」来判断是不是我，这有两个硬伤：
 * 1) 很多调用点只传了前三参（没有 partnerId），actorGender 取不到，
 *    于是连我自己写的东西也会显示成「他 / 她」；
 * 2) 数据库里 gender 为空、或者两个账号都被写成了同一个值时，
 *    两个人都可能被判成「我」。
 * 所以先按 id 认人，性别只用来决定「他 / 她」。id 认不出来时宁可说
 * 「对方」，也不猜成「我」。
 */
export function actorLabel(
  actorId: string,
  myId: string,
  myGender: Gender | null | undefined,
  partnerId?: string | null,
  partnerGender?: Gender | null
): string {
  if (myId && actorId === myId) return '我'

  if (partnerId && actorId === partnerId) {
    if (partnerGender === 'female') return '她'
    if (partnerGender === 'male') return '他'
    // 对方性别也空着：只能按「和我相反」来推，推不出就老实叫对方
    if (myGender === 'female') return '他'
    if (myGender === 'male') return '她'
    return '对方'
  }

  // 没有 partnerId：这个空间只有两个人，不是我就是对方
  if (!partnerId) {
    if (myGender === 'female') return '他'
    if (myGender === 'male') return '她'
    return '对方'
  }

  // 两个 id 都知道，却都不是 ta —— 旧缓存、后台账号之类的脏数据
  return '对方'
}

/** 各事件类型在抬头里的动作短语 */
export const ACTION_LABELS: Record<EventType, string> = {
  note: '写了随笔',
  diary: '写了日记',
  photo: '发了照片',
  milktea_issue: '颁发了奶茶券',
  milktea_redeem: '核销了奶茶券',
  milktea_request: '想讨一杯奶茶',
  wish: '添加了心愿',
  kiss: '想亲'
}

/** 亲亲这条动态到底在说什么。
 *  抬头只说"这是哪一类"，具体亲谁、几下，交给卡片正文讲，别重复。 */
export function kissAction(meta: Record<string, unknown> | null | undefined): string {
  const kind = meta?.kind
  if (kind === 'request') return '写了一张亲亲请愿'
  if (kind === 'granted') return '答应了亲亲'
  return '想要亲亲'
}

/**
 * 喝奶茶的抬头：
 * - 用券换的 → 核销了奶茶券
 * - 本周免费额度、以及他自己喝的 → 喝了一杯奶茶
 */
export function milkteaAction(source: unknown): string {
  return source === 'voucher' ? '核销了奶茶券' : '喝了一杯奶茶'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 卡片抬头里的短时间：刚刚 / 几分钟前 / 今天 hh:mm / 昨天 hh:mm / 月日 / 年.月.日 */
export function timeLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffSec < 60) return '刚刚'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`

  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`

  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `昨天 ${hm}`

  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

/** 详情弹层用的完整时间：2026年9月30日 14:23 */
export function dateTimeLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

import type { EventType, Gender } from '../types/domain'

/** 卡片抬头里的发布者称呼：自己=「我」；对方按自己性别显示「他 / 她」 */
export function actorLabel(actorId: string, myId: string, myGender: Gender | null | undefined): string {
  if (actorId === myId) return '我'
  if (myGender === 'male') return '她'
  if (myGender === 'female') return '他'
  return '对方'
}

/** 各事件类型在抬头里的动作短语 */
export const ACTION_LABELS: Record<EventType, string> = {
  note: '写了随笔',
  diary: '写了日记',
  photo: '发了照片',
  milktea_issue: '颁发了奶茶券',
  milktea_redeem: '核销了奶茶券',
  wish: '添加了心愿'
}

/** 核销奶茶的抬头：用「本周免费」和「奶茶券」说法不同 */
export function milkteaAction(source: unknown): string {
  return source === 'free' ? '喝了一杯奶茶' : '核销了奶茶券'
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

/* ============================================================
   青桃 · 奶茶规则（她的卡，他管）

   规则（**单向**：限制的是她，不是他）：
   - 每周一 00:00 刷新，她本周有 1 次免费额度；
   - 他颁发的奶茶券是额外的，每张都带「因何故」和「到期时间」；
   - 她核销时先扣本周免费，再按**先发的先用**（FIFO）消耗一张券；
   - 过期或已用掉的券不能再喝；免费用完 + 没有可用券 → 她这周不能再喝；
   - **他自己喝奶茶照记**，但不占她的额度、也不受任何限制。

   实现：不新增表、不需要定时任务，全部从 events 推导。
   ============================================================ */

import { computed, ref } from 'vue'
import { useFeed } from './useFeed'

/** 最近一个周一 00:00（本地时区） */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  // getDay(): 0=周日, 1=周一 … 6=周六 → 换算成「距离本周一几天」
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return d
}

/** 到期日按「当天结束」算 */
function expiresEnd(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const d = new Date(`${expiresAt}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/** 后台列表 / 详情里要用的一张券 */
export interface MilkteaVoucher {
  id: string
  issuedAt: string
  reason: string
  expiresAt: string | null
  usedAt: string | null
  usedFlavor: string | null
  expired: boolean
}

// 过期状态需要一个会走的时钟，否则页面一直开着状态不会变
const nowTick = ref(Date.now())
let tickTimer = 0
function ensureTick() {
  if (tickTimer || typeof window === 'undefined') return
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
}

export function useMilktea() {
  ensureTick()
  const { events, publishEvent, myProfile, partnerProfile } = useFeed()

  /** 「她」= 两个账号里性别为女的那个（额度是她的） */
  const herId = computed(() => {
    const me = myProfile.value
    const pa = partnerProfile.value
    if (me?.gender === 'female') return me.id
    if (pa?.gender === 'female') return pa.id
    return ''
  })

  /** 现在用 App 的这个人，是不是「她」本人 */
  const iAmHer = computed(() => !!herId.value && myProfile.value?.id === herId.value)

  /** 所有核销记录 */
  const redeems = computed(() => events.value.filter((e) => e.type === 'milktea_redeem'))

  /** 只算**她的**核销——他自己的不进额度系统 */
  const herRedeems = computed(() =>
    herId.value ? redeems.value.filter((e) => e.actor_id === herId.value) : []
  )

  /**
   * 统一的模型：**「本周免费」不是另一种东西，它就是每周一凌晨自动发的一张券。**
   * 所以这里把它推出来（不用定时任务），和他发的券放进同一个队列按颁发时间排。
   * 本周那张是周一 00:00 发的，自然排在最前，于是自然"先扣免费、再用券"。
   * 也不按人筛：两个人的角色是定死的（她喝、他发）。
   */
  const isWeekly = (id: string) => id.startsWith('weekly-')

  const weeklyVoucher = computed<MilkteaVoucher>(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`

    const start = weekStart(new Date(nowTick.value))
    const sunday = new Date(start)
    sunday.setDate(start.getDate() + 6)

    return {
      id: `weekly-${fmt(start)}`,
      issuedAt: start.toISOString(),
      reason: '每周免费的一杯',
      expiresAt: fmt(sunday),
      usedAt: null,
      usedFlavor: null,
      expired: false
    }
  })

  const vouchers = computed<MilkteaVoucher[]>(() => {
    const issues = events.value
      .filter((e) => e.type === 'milktea_issue')
      .map((ev) => {
        const meta = (ev.meta ?? {}) as Record<string, unknown>
        return {
          id: ev.id,
          issuedAt: ev.created_at,
          reason: typeof meta.reason === 'string' ? meta.reason : '',
          expiresAt: typeof meta.expires_at === 'string' ? meta.expires_at : null,
          usedAt: null as string | null,
          usedFlavor: null as string | null,
          expired: false
        }
      })

    // 每周那张 + 他发的，一起排队（周一 00:00 那张最早，所以先被用掉）
    const all = [weeklyVoucher.value, ...issues].sort((a, b) =>
      a.issuedAt.localeCompare(b.issuedAt)
    )

    // 用掉的：所有不是"他自己喝的"核销，按时间先后一一对应
    const uses = redeems.value
      .filter((e) => e.meta?.source !== 'self')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))

    const now = nowTick.value
    return all.map((v, i) => {
      const use = uses[i] ?? null
      const end = expiresEnd(v.expiresAt)
      let usedFlavor: string | null = null
      if (use && use.meta && typeof use.meta.flavor === 'string') usedFlavor = use.meta.flavor
      return {
        ...v,
        usedAt: use ? use.created_at : null,
        usedFlavor,
        expired: !use && end !== null && end < now
      }
    })
  })

  /** 集点格用：他发的券共有几张（每周那张单独占一格，不算在内） */
  const issuedCount = computed(() => vouchers.value.filter((v) => !isWeekly(v.id)).length)

  /** 本周那张免费券还在不在 */
  const freeRemaining = computed(() => {
    const w = vouchers.value.find((v) => isWeekly(v.id))
    return w && !w.usedAt && !w.expired ? 1 : 0
  })
  const freeUsedThisWeek = computed(() => freeRemaining.value === 0)

  /** 可用券（他发的、没用掉也没过期） */
  const voucherBalance = computed(
    () => vouchers.value.filter((v) => !isWeekly(v.id) && !v.usedAt && !v.expired).length
  )
  const vouchersUsed = computed(() => vouchers.value.filter((v) => !!v.usedAt).length)
  const vouchersExpired = computed(() => vouchers.value.filter((v) => v.expired).length)

  /** 她本周还能喝几杯 */
  const drinkable = computed(() => freeRemaining.value + voucherBalance.value)

  /** 她下一次该扣哪种；都没了返回 null */
  const nextSource = computed<'free' | 'voucher' | null>(() => {
    if (freeRemaining.value > 0) return 'free'
    if (voucherBalance.value > 0) return 'voucher'
    return null
  })

  /** 当前这个人能不能记一杯：她受额度限制，他自己随便记 */
  const canDrink = computed(() => (iAmHer.value ? drinkable.value > 0 : true))

  /** 核销一杯：她自己 → 按规则扣额度；他自己 → 只记一笔，不占额度 */
  async function redeem(input: {
    flavor?: string
    sweetness?: string
    content?: string
    /** 这一杯的照片（必填，界面上会校验） */
    photoUrl?: string
  }): Promise<{ error: unknown }> {
    const source = iAmHer.value ? nextSource.value : 'self'
    if (!source) return { error: 'no-quota' }

    return publishEvent({
      type: 'milktea_redeem',
      content: input.content ?? '',
      photo_urls: input.photoUrl ? [input.photoUrl] : undefined,
      meta: { source, flavor: input.flavor || null, sweetness: input.sweetness || null }
    })
  }

  return {
    herId,
    iAmHer,
    issuedCount,
    vouchers,
    /** 所有喝奶茶的记录（明细里要讲清"每一次扣的是什么"） */
    redeems,
    voucherBalance,
    vouchersUsed,
    vouchersExpired,
    freeUsedThisWeek,
    freeRemaining,
    drinkable,
    canDrink,
    nextSource,
    redeem
  }
}

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

  /** 本周免费额度用掉了没有 */
  const freeUsedThisWeek = computed(() => {
    const start = weekStart().getTime()
    return herRedeems.value.some(
      (e) => e.meta?.source === 'free' && new Date(e.created_at).getTime() >= start
    )
  })
  const freeRemaining = computed(() => (freeUsedThisWeek.value ? 0 : 1))

  /**
   * 券列表：先发的在前，按 FIFO 和她的「用券核销」一一对应。
   * 第 1 张券对应第 1 次用券核销，第 2 张对应第 2 次……这样每张券都能
   * 说清「有没有用掉、什么时候用掉的」。
   */
  const vouchers = computed<MilkteaVoucher[]>(() => {
    const issues = events.value
      .filter((e) => e.type === 'milktea_issue')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))

    const uses = herRedeems.value
      .filter((e) => e.meta?.source === 'voucher')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))

    const now = nowTick.value

    return issues.map((ev, i) => {
      const meta = (ev.meta ?? {}) as Record<string, unknown>
      const expiresAt = typeof meta.expires_at === 'string' ? meta.expires_at : null
      const use = uses[i] ?? null
      const end = expiresEnd(expiresAt)

      let usedFlavor: string | null = null
      if (use && use.meta && typeof use.meta.flavor === 'string') usedFlavor = use.meta.flavor

      return {
        id: ev.id,
        issuedAt: ev.created_at,
        reason: typeof meta.reason === 'string' ? meta.reason : '',
        expiresAt,
        usedAt: use ? use.created_at : null,
        usedFlavor,
        expired: !use && end !== null && end < now
      }
    })
  })

  const issuedCount = computed(() => vouchers.value.length)
  /** 可用券（没用掉、没过期） */
  const voucherBalance = computed(
    () => vouchers.value.filter((v) => !v.usedAt && !v.expired).length
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

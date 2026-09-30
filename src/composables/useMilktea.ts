/* ============================================================
   青桃 · 奶茶规则（她的卡，他管）

   规则：
   - 每周一 00:00 刷新，她有 1 次免费喝奶茶的机会；
   - 他颁发的奶茶券是额外的机会；
   - 核销时先扣本周免费用，用完了才消耗一张券；
   - 免费用完且没有券 → 不能再喝。

   实现：不新增表、不需要定时任务，全部从 events 推导：
   - 本周免费有没有用过：看本周一之后有没有 source='free' 的核销；
   - 券余额 = 颁发过的券数 − source='voucher' 的核销数。
   周一一到，「本周」的起点自动后移，计数自然归零。
   ============================================================ */

import { computed } from 'vue'
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

export function useMilktea() {
  const { events, publishEvent } = useFeed()

  /** 颁发过的奶茶券总数 */
  const issuedCount = computed(() => events.value.filter((e) => e.type === 'milktea_issue').length)

  /** 所有核销记录 */
  const redeems = computed(() => events.value.filter((e) => e.type === 'milktea_redeem'))

  /** 本周免费是否已用掉 */
  const freeUsedThisWeek = computed(() => {
    const start = weekStart().getTime()
    return redeems.value.some(
      (e) => e.meta?.source === 'free' && new Date(e.created_at).getTime() >= start
    )
  })

  /** 已消耗的券数 */
  const vouchersUsed = computed(
    () => redeems.value.filter((e) => e.meta?.source === 'voucher').length
  )

  const freeRemaining = computed(() => (freeUsedThisWeek.value ? 0 : 1))
  const voucherBalance = computed(() => Math.max(0, issuedCount.value - vouchersUsed.value))
  /** 本周还能喝几杯 */
  const drinkable = computed(() => freeRemaining.value + voucherBalance.value)

  /** 下一次核销该扣哪种；都没额度返回 null */
  const nextSource = computed<'free' | 'voucher' | null>(() => {
    if (freeRemaining.value > 0) return 'free'
    if (voucherBalance.value > 0) return 'voucher'
    return null
  })

  /** 核销一杯：按规则自动扣「本周免费」或「券」 */
  async function redeem(input: {
    flavor?: string
    sweetness?: string
    content?: string
  }): Promise<{ error: unknown }> {
    const source = nextSource.value
    if (!source) return { error: 'no-quota' }
    return publishEvent({
      type: 'milktea_redeem',
      content: input.content ?? '',
      meta: { source, flavor: input.flavor || null, sweetness: input.sweetness || null }
    })
  }

  return {
    issuedCount,
    vouchersUsed,
    freeUsedThisWeek,
    freeRemaining,
    voucherBalance,
    drinkable,
    nextSource,
    redeem
  }
}

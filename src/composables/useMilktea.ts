/* ============================================================
   青桃 · 奶茶规则（她的卡，他管）

   规则（**单向**：限制的是她，不是他）：
   - 每周一 00:00 刷新，她本周有 1 次免费额度；
   - 他颁发的奶茶券是额外的，每张都带「因何故」和「到期时间」；
   - 她核销时先扣本周免费，再按**先发的先用**（FIFO）消耗一张**未过期**的券；
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

/** 到期日按「当天结束」算；也接受完整时间戳（历史数据里可能两种都有） */
function expiresEnd(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    const d = new Date(`${expiresAt}T23:59:59.999`)
    return Number.isNaN(d.getTime()) ? null : d.getTime()
  }
  const t = Date.parse(expiresAt)
  return Number.isNaN(t) ? null : t
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

const pad2 = (n: number) => String(n).padStart(2, '0')
/** 本地时区的 YYYY-MM-DD（不能 toISOString，那是 UTC，跨时区会错一天） */
function fmtDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
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

interface VoucherUse {
  at: string
  flavor: string | null
}

export function useMilktea() {
  ensureTick()
  const { events, publishEvent, myProfile, partnerProfile, myRole, rolesReady, ensureMe, ensurePartner } =
    useFeed()

  /**
   * 「她」= 后注册的那个账号。
   * 不再从 gender 猜：角色是由注册先后定死的（见 useFeed.resolveRoles），
   * 这样数据库里 gender 空着、或两个都被写成同一个值，也不会把额度算错。
   * 角色没确定时返回空字符串，调用方必须当成「未确定」而不是「他不是她」。
   */
  const herId = computed(() => {
    if (myRole.value === 'her') return myProfile.value?.id ?? ''
    if (myRole.value === 'him') return partnerProfile.value?.id ?? ''
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

  const isWeekly = (id: string) => id.startsWith('weekly-')

  /* ============================================================
     每周免费：不是「另一种余额」，而是每周一 00:00 自动发的一张券。
     以前只生成**本周**这一张，然后拿「第 i 次核销 = 第 i 张券」硬套，
     上周用过的免费会被算到本周这张头上（usedAt 早于 issuedAt）；
     历史里的付费券也会和过期状态错位。
     现在：按事件范围把每一周的免费券都推出来，只在内部参与排队，
     对外仍只展示本周那一张。
     ============================================================ */
  function weeklyVoucherOf(monday: Date): MilkteaVoucher {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const expiresAt = fmtDay(sunday)
    const end = expiresEnd(expiresAt)
    return {
      id: `weekly-${fmtDay(monday)}`,
      issuedAt: monday.toISOString(),
      reason: '每周免费的一杯',
      expiresAt,
      usedAt: null,
      usedFlavor: null,
      expired: end !== null && end < nowTick.value
    }
  }

  /** 从最早一笔相关事件所在周，一直推到本周 */
  const weeklyPool = computed<Map<string, MilkteaVoucher>>(() => {
    const pool = new Map<string, MilkteaVoucher>()
    const current = weekStart(new Date(nowTick.value))
    let earliest = current.getTime()

    for (const e of events.value) {
      const relevant =
        e.type === 'milktea_issue' ||
        (e.type === 'milktea_redeem' && e.meta?.source !== 'self')
      if (!relevant) continue
      const t = Date.parse(e.created_at)
      if (!Number.isFinite(t)) continue
      const w = weekStart(new Date(t)).getTime()
      if (w < earliest) earliest = w
    }

    const cursor = new Date(earliest)
    let guard = 0
    while (cursor.getTime() <= current.getTime() && guard < 520) {
      const v = weeklyVoucherOf(new Date(cursor))
      pool.set(v.id, v)
      cursor.setDate(cursor.getDate() + 7)
      guard += 1
    }
    return pool
  })

  /** 他发的券（全部，按颁发时间升序） */
  const issueVouchers = computed<MilkteaVoucher[]>(() =>
    events.value
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
      .sort((a, b) => (Date.parse(a.issuedAt) || 0) - (Date.parse(b.issuedAt) || 0))
  )

  const useFlavor = (meta: Record<string, unknown> | null | undefined): string | null =>
    typeof meta?.flavor === 'string' ? meta.flavor : null

  /**
   * 哪一次核销扣了哪一张券。
   * 1) 新数据带 meta.voucher_id：直接认账（这是唯一不会错位的依据）；
   * 2) 老数据没有 voucher_id：按「source + 当时未过期 + 先发先用」反推；
   * 3) 过期券绝不占用核销：跳过，扣下一张有效的。
   */
  const usedBy = computed<Map<string, VoucherUse>>(() => {
    const used = new Map<string, VoucherUse>()
    const weeklies = weeklyPool.value
    const issues = issueVouchers.value
    const issueIds = new Set(issues.map((v) => v.id))

    const uses = redeems.value
      .filter((e) => e.meta?.source !== 'self')
      .map((e) => ({ e, t: Date.parse(e.created_at) }))
      .filter((u) => Number.isFinite(u.t))
      .sort((a, b) => a.t - b.t)

    const takeWeekly = (weekKey: string, use: { at: string; flavor: string | null }, t: number) => {
      const v = weeklies.get(`weekly-${weekKey}`)
      if (!v || used.has(v.id)) return false
      const end = expiresEnd(v.expiresAt)
      if (end !== null && end < t) return false
      used.set(v.id, use)
      return true
    }
    const takeIssue = (use: { at: string; flavor: string | null }, t: number) => {
      for (const v of issues) {
        if (used.has(v.id)) continue
        const issued = Date.parse(v.issuedAt)
        if (!Number.isFinite(issued) || issued > t) continue
        const end = expiresEnd(v.expiresAt)
        if (end !== null && end < t) continue
        used.set(v.id, use)
        return true
      }
      return false
    }

    // 1) 带 voucher_id 的
    const legacy: typeof uses = []
    for (const u of uses) {
      const meta = (u.e.meta ?? {}) as Record<string, unknown>
      const vid = typeof meta.voucher_id === 'string' ? meta.voucher_id : ''
      if (vid && !used.has(vid) && (weeklies.has(vid) || issueIds.has(vid))) {
        used.set(vid, { at: u.e.created_at, flavor: useFlavor(meta) })
      } else {
        legacy.push(u)
      }
    }

    // 2) 老数据反推
    for (const u of legacy) {
      const meta = (u.e.meta ?? {}) as Record<string, unknown>
      const use = { at: u.e.created_at, flavor: useFlavor(meta) }
      const weekKey = fmtDay(weekStart(new Date(u.t)))
      const source = meta.source
      if (source === 'voucher') {
        if (!takeIssue(use, u.t)) takeWeekly(weekKey, use, u.t)
      } else {
        if (!takeWeekly(weekKey, use, u.t)) takeIssue(use, u.t)
      }
    }

    return used
  })

  /** 券 + 本周免费，按颁发时间排在一起（只对外展示本周那张免费） */
  const vouchers = computed<MilkteaVoucher[]>(() => {
    const now = nowTick.value
    const used = usedBy.value
    const currentWeekKey = fmtDay(weekStart(new Date(now)))
    const currentWeekly = weeklyPool.value.get(`weekly-${currentWeekKey}`)

    const decorate = (v: MilkteaVoucher): MilkteaVoucher => {
      const u = used.get(v.id)
      const end = expiresEnd(v.expiresAt)
      return {
        ...v,
        usedAt: u?.at ?? null,
        usedFlavor: u?.flavor ?? null,
        expired: !u && end !== null && end < now
      }
    }

    const list: MilkteaVoucher[] = []
    if (currentWeekly) list.push(decorate(currentWeekly))
    for (const v of issueVouchers.value) list.push(decorate(v))
    return list.sort((a, b) => (Date.parse(a.issuedAt) || 0) - (Date.parse(b.issuedAt) || 0))
  })

  /** 集点格用：他发的券共有几张（每周那张单独占一格，不算在内） */
  const issuedVouchers = computed(() => vouchers.value.filter((v) => !isWeekly(v.id)))
  const issuedCount = computed(() => issuedVouchers.value.length)

  /** 本周那张免费券还在不在 */
  const freeRemaining = computed(() => {
    const weekly = vouchers.value.find((v) => isWeekly(v.id))
    return weekly && !weekly.usedAt && !weekly.expired ? 1 : 0
  })
  const freeUsedThisWeek = computed(() => freeRemaining.value === 0)

  /** 可用券（他发的、没用掉也没过期） */
  const voucherBalance = computed(
    () => issuedVouchers.value.filter((v) => !v.usedAt && !v.expired).length
  )
  /** 已用掉的**付费券**（本周免费单独由 freeRemaining 表示） */
  const vouchersUsed = computed(() => issuedVouchers.value.filter((v) => !!v.usedAt).length)
  /** 已过期的**付费券** */
  const vouchersExpired = computed(() => issuedVouchers.value.filter((v) => v.expired).length)

  /** 三者应当恰好把「他发的券」分完；对不上就是算错了 */
  const vouchersConsistent = computed(
    () => vouchersUsed.value + voucherBalance.value + vouchersExpired.value === issuedCount.value
  )

  /** 她本周还能喝几杯 */
  const drinkable = computed(() => freeRemaining.value + voucherBalance.value)

  /** 下一次该扣哪一张；都没了返回 null */
  const nextVoucher = computed<MilkteaVoucher | null>(() => {
    if (!iAmHer.value) return null
    const weekly = vouchers.value.find((v) => isWeekly(v.id))
    if (weekly && !weekly.usedAt && !weekly.expired) return weekly
    const first = vouchers.value.find((v) => !isWeekly(v.id) && !v.usedAt && !v.expired)
    return first ?? null
  })
  const nextSource = computed<'free' | 'voucher' | null>(() => {
    const v = nextVoucher.value
    if (!v) return null
    return isWeekly(v.id) ? 'free' : 'voucher'
  })

  /** 当前这个人能不能记一杯：她受额度限制，他自己随便记 */
  const canDrink = computed(() => {
    if (!rolesReady.value) return false
    return iAmHer.value ? drinkable.value > 0 : true
  })

  /** 核销一杯：她自己 → 按规则扣额度；他自己 → 只记一笔，不占额度 */
  async function redeem(input: {
    flavor?: string
    sweetness?: string
    content?: string
    /** 这一杯的照片（必填，界面上会校验） */
    photoUrl?: string
  }): Promise<{ error: unknown }> {
    try {
      // 角色没定下来时先补齐；仍然定不下来就明确报错，
      // 绝不把她的核销记成 source:'self'（那样完全不扣额度，还看起来成功）
      if (!rolesReady.value) {
        await Promise.all([ensureMe(), ensurePartner()])
      }
      if (!rolesReady.value) {
        console.warn('[青桃] 角色未确定，先不记这杯奶茶')
        return { error: 'role-unknown' }
      }

      const source = iAmHer.value ? nextSource.value : 'self'
      if (!source) return { error: 'no-quota' }

      const meta: Record<string, unknown> = {
        source,
        flavor: input.flavor || null,
        sweetness: input.sweetness || null
      }
      // 写清楚扣的是哪一张：以后余额、明细都按这个反查，不再靠下标
      const target = iAmHer.value ? nextVoucher.value : null
      if (target) meta.voucher_id = target.id

      return await publishEvent({
        type: 'milktea_redeem',
        content: input.content ?? '',
        photo_urls: input.photoUrl ? [input.photoUrl] : undefined,
        meta
      })
    } catch (e) {
      console.error('[青桃] 记奶茶失败：', e)
      return { error: e }
    }
  }

  return {
    herId,
    iAmHer,
    rolesReady,
    issuedCount,
    vouchers,
    /** 所有喝奶茶的记录（明细里要讲清"每一次扣的是什么"） */
    redeems,
    voucherBalance,
    vouchersUsed,
    vouchersExpired,
    vouchersConsistent,
    freeUsedThisWeek,
    freeRemaining,
    drinkable,
    canDrink,
    nextVoucher,
    nextSource,
    redeem
  }
}

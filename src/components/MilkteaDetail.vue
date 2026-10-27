<template>
  <PanelShell title="奶茶券和亲亲" @close="emit('close')">
    <!-- 汇总：同一屏里四个数字用同一套口径算出来 -->
    <section class="summary">
      <p class="sum-line">还能喝 <b>{{ drinkable }}</b> 杯</p>
      <p class="sum-line">已经喝掉 <b>{{ drinksUsed }}</b> 杯</p>
      <p class="sum-line">攒着 <b>{{ voucherBalance }}</b> 张没动</p>
      <p class="sum-line" :class="{ quiet: !vouchersExpired }">
        <template v-if="vouchersExpired">有 <b>{{ vouchersExpired }}</b> 张过期了</template>
        <template v-else>一张也没过期</template>
      </p>
    </section>

    <!-- 每周免费的一周一张：单独一块，不参与他发的券编号 -->
    <section class="block">
      <h3 class="block-title">每周免费的一杯</h3>
      <div
        v-if="weeklyVoucher"
        class="weekly"
        :class="{ used: !!weeklyVoucher.usedAt, expired: weeklyVoucher.expired }"
      >
        <p class="w-line">
          {{
            weeklyVoucher.usedAt
              ? '这一周已经喝掉了'
              : weeklyVoucher.expired
                ? '这一周过去了，没喝上'
                : '这一周还没喝'
          }}
        </p>
        <p class="v-line"><em>到</em>{{ day(weeklyVoucher.expiresAt) }} 为止</p>
        <p v-if="weeklyVoucher.usedAt" class="v-line">
          <em>喝掉的时间</em>{{ stamp(weeklyVoucher.usedAt) }}
        </p>
      </div>
      <p v-else class="empty">这一周的免费还没发下来</p>
    </section>

    <!-- 逐张列出来：编号从 1 开始，只给他发的券 -->
    <section class="block">
      <details open><summary><h3 class="block-title">他发过的券</h3></summary>

      <p v-if="!issuedVouchers.length" class="empty">他还没发过券</p>

      <ul v-else class="vouchers">
        <li
          v-for="(v, i) in orderedVouchers"
          :key="v.id"
          class="voucher"
          :class="{ used: !!v.usedAt, expired: v.expired }"
        >
          <header class="v-head">
            <span class="v-no">第 {{ issuedVouchers.length - i }} 张</span>
            <span class="v-state">
              {{ v.usedAt ? '已经喝掉' : v.expired ? '过期了' : '还没用' }}
            </span>
          </header>

          <p class="v-line"><em>颁发时间</em>{{ stamp(v.issuedAt) }}</p>
          <p class="v-line"><em>原因</em>{{ v.reason || '（没写）' }}</p>
          <p class="v-line"><em>过期时间</em>{{ day(v.expiresAt) }}</p>
          <p v-if="v.usedAt" class="v-line">
            <em>使用时间</em>{{ stamp(v.usedAt) }}<span v-if="v.usedFlavor"> · {{ v.usedFlavor }}</span>
          </p>
        </li>
      </ul>
    </details>
    </section>

    <!-- 每一次喝，扣的到底是什么。没有这一块，余额一变根本无从判断 -->
    <section class="block">
      <details open><summary><h3 class="block-title">每一次喝</h3></summary>

      <p v-if="!drinks.length" class="empty">还没有喝过</p>

      <ul v-else class="drinks">
        <li v-for="d in drinks" :key="d.id" class="drink">
          <span class="d-dot" :class="d.source"></span>
          <div class="d-body">
            <p class="d-line">
              {{ d.who }} 喝了一杯
              <span class="d-chips" v-if="d.chips.length">· {{ d.chips.join(' · ') }}</span>
            </p>
            <p class="d-sub">{{ stamp(d.at) }}</p>
          </div>
          <span class="d-how" :class="d.source">{{ d.how }}</span>
        </li>
      </ul>

      <p class="foot-note">券按先发先用。</p>
    </details>
    </section>
    <!-- 亲亲：欠账、额度、以及每一次请求和同意情况 -->
    <section class="block">
      <details open><summary><h3 class="block-title">亲亲</h3></summary>

      <p class="kiss-sum">
        <span v-if="iAmHer">你记着小螃蟹 <b>{{ kissDebt }}</b> 个亲亲</span>
        <span v-else>银杏叶记着你 <b>{{ kissDebt }}</b> 个亲亲</span>
        <span v-if="iAmHer" class="kiss-left">· 今天还能点 {{ freeLeftToday }} 次</span>
      </p>

      <p v-if="!kissRows.length" class="empty">还没有要过亲亲</p>

      <ul v-else class="drinks">
        <li v-for="k in kissRows" :key="k.id" class="drink">
          <span class="d-dot" :class="k.tone"></span>
          <div class="d-body">
            <p class="d-line">
              {{ k.who }} 要了 {{ k.count }} 个亲亲
              <span v-if="k.reason" class="d-chips">· {{ k.reason }}</span>
            </p>
            <p class="d-sub">{{ k.at }}</p>
          </div>
          <span class="d-how" :class="k.tone">{{ k.state }}</span>
        </li>
      </ul>
    </details>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMilktea } from '../composables/useMilktea'
import { useFeed } from '../composables/useFeed'
import { usePetition } from '../composables/usePetition'
import { dateTimeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { loadEvents } = useFeed()
const {
  vouchers,
  issuedVouchers,
  weeklyVoucher,
  redeems,
  herId,
  iAmHer,
  voucherBalance,
  vouchersExpired,
  drinkable,
  drinksUsed
} = useMilktea()
const { kisses, kissDebt, freeLeftToday } = usePetition()

/** 新的在前；编号只给「他发的券」，每周免费那张不在这一列里 */
const orderedVouchers = computed(() => [...issuedVouchers.value].reverse())

/**
 * 每一次喝：谁喝的、扣的是什么。
 * 「他自己喝的」不占额度，标出来免得和用额度搞混。
 */
const drinks = computed(() =>
  [...redeems.value]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => {
      const source = String(e.meta?.source ?? '')
      const isHer = !!herId.value && e.actor_id === herId.value
      const how =
        source === 'free'
          ? '用本周免费'
          : source === 'voucher'
            ? '用掉一张券'
            : isHer
              ? '她自己喝的'
              : '他自己喝的'
      return {
        id: e.id,
        at: e.created_at,
        who: isHer ? '银杏叶' : '小螃蟹',
        how,
        source: source === 'voucher' ? 'voucher' : source === 'free' ? 'free' : 'self',
        chips: [e.meta?.flavor, e.meta?.sweetness].filter(
          (x): x is string => typeof x === 'string' && !!x
        )
      }
    })
)

/**
 * 亲亲的每一次请求，以及同意情况。
 * 两个人的角色是定死的：她请求、他答应，所以"谁"这里也写死。
 */
const kissRows = computed(() =>
  [...kisses.value]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((k) => {
      const state =
        k.status === 'free'
          ? '本周免费'
          : k.status === 'pending'
            ? '等他回'
            : k.status === 'approved'
              ? '已同意'
              : '已驳回'
      return {
        id: k.id,
        who: '银杏叶',
        count: k.count,
        reason: k.reason ?? '',
        at: dateTimeLabel(k.created_at),
        state,
        /** 红色只给"还悬着"的（等回话 / 被驳回），其余用暖色 */
        tone: k.status === 'pending' || k.status === 'rejected' ? 'voucher' : 'free'
      }
    })
)
function stamp(iso: string | null): string {
  return iso ? dateTimeLabel(iso) : '—'
}
function day(v: string | null): string {
  if (!v) return '没设'
  const s = dateTimeLabel(`${v}T00:00:00`)
  const cut = s.indexOf(' ')
  return cut > 0 ? s.slice(0, cut) : s
}

onMounted(() => {
  if (!vouchers.value.length) loadEvents()
})
</script>

<style scoped>
/* —— 每一次喝 —— */
.drinks {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.drink {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  background-color: var(--paper);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.d-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--faint);
}
.d-dot.free {
  background-color: var(--caramel);
}
.d-dot.voucher {
  background-color: var(--brick);
}
.d-body {
  flex: 1;
  min-width: 0;
}
.d-line {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.d-chips {
  color: var(--muted);
}
.d-sub {
  margin: 3px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.d-how {
  flex-shrink: 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.d-how.free {
  color: var(--caramel);
}
.d-how.voucher {
  color: var(--brick);
}
.foot-note {
  margin: 12px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.8;
  color: var(--faint);
}
/* —— 可折叠的三块：数字常显，长列表折起来 —— */
details > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
}
details > summary::-webkit-details-marker {
  display: none;
}
details > summary::after {
  content: "";
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-right: 1.4px solid var(--faint);
  border-bottom: 1.4px solid var(--faint);
  transform: rotate(45deg) translateY(-2px);
}
details[open] > summary::after {
  transform: rotate(-135deg) translateY(-2px);
}
details[open] > summary {
  margin-bottom: 10px;
}
details:not([open]) > summary .block-title {
  margin-bottom: 0;
}
/* —— 亲亲那块 —— */
.kiss-sum {
  margin: 0 0 11px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.kiss-sum b {
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  color: var(--brick);
}
.kiss-left {
  color: var(--muted);
  font-size: var(--fs-xs);
}
.summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.sum-line {
  margin: 0;
  padding: 11px 12px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 0.5px;
  color: var(--ink-soft);
}
.sum-line b {
  margin: 0 2px;
  font-family: var(--font-serif);
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--ink);
  vertical-align: -2px;
}
.sum-line.quiet {
  color: var(--faint);
}

/* —— 每周免费那一张（单独一块）—— */
.weekly {
  padding: 12px;
  background-color: var(--paper);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.weekly.used {
  opacity: 0.75;
}
.weekly.expired {
  opacity: 0.6;
}
.w-line {
  margin: 0 0 6px;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  letter-spacing: 0.5px;
  color: var(--caramel);
}
.weekly.expired .w-line {
  color: var(--brick);
}

.block {
  padding: 14px 15px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.block-title {
  margin: 0 0 10px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--ink);
}

.vouchers {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.voucher {
  padding: 12px;
  background-color: var(--paper);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.voucher.used {
  opacity: 0.75;
}
.voucher.expired {
  opacity: 0.6;
}
.v-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
}
.v-no {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.v-state {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.voucher.used .v-state {
  color: var(--caramel);
}
.voucher.expired .v-state {
  color: var(--brick);
}

.v-line {
  margin: 4px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink);
  word-break: break-word;
}
.v-line em {
  display: inline-block;
  min-width: 62px;
  margin-right: 6px;
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.empty {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}
</style>

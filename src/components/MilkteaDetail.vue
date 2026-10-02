<template>
  <PanelShell title="奶茶券明细" @close="emit('close')">
    <!-- 汇总 -->
    <section class="summary">
      <div class="cell">
        <span class="cell-num">{{ freeRemaining }}</span>
        <span class="cell-label">本周免费还剩</span>
      </div>
      <div class="cell">
        <span class="cell-num">{{ voucherBalance }}</span>
        <span class="cell-label">可用券</span>
      </div>
      <div class="cell">
        <span class="cell-num">{{ vouchersUsed }}</span>
        <span class="cell-label">已用掉</span>
      </div>
      <div class="cell">
        <span class="cell-num">{{ vouchersExpired }}</span>
        <span class="cell-label">已过期</span>
      </div>
    </section>

    <!-- 逐张列出来 -->
    <section class="block">
      <h3 class="block-title">每一张券</h3>

      <p v-if="!vouchers.length" class="empty">还没有发过券</p>

      <ul v-else class="vouchers">
        <li
          v-for="(v, i) in orderedVouchers"
          :key="v.id"
          class="voucher"
          :class="{ used: !!v.usedAt, expired: v.expired }"
        >
          <header class="v-head">
            <span class="v-no">第 {{ vouchers.length - i }} 张</span>
            <span class="v-state">
              {{ v.usedAt ? '已使用' : v.expired ? '已过期' : '可用' }}
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
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMilktea } from '../composables/useMilktea'
import { useFeed } from '../composables/useFeed'
import { dateTimeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { loadEvents } = useFeed()
const { vouchers, voucherBalance, vouchersUsed, vouchersExpired, freeRemaining } = useMilktea()

/** 新的在前 */
const orderedVouchers = computed(() => [...vouchers.value].reverse())

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
.summary {
  display: flex;
  gap: 8px;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 13px 4px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.cell-num {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
}
.cell-label {
  font-family: var(--font-song);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--muted);
  text-align: center;
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

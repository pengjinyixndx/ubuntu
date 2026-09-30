<template>
  <div class="mcard" :class="{ compact }">
    <div class="mcard-top">
      <Critter kind="ginkgo" :size="compact ? 18 : 22" class="mcard-leaf" />
      <span class="mcard-label">奶茶卡</span>
      <span class="mcard-owner">她的</span>
    </div>

    <div class="mcard-count">
      本周还能喝
      <b>{{ drinkable }}</b>
      杯
    </div>

    <div class="mcard-sub">
      <span>免费 {{ freeRemaining }}</span>
      <span class="dot">·</span>
      <span>券 {{ voucherBalance }}</span>
    </div>

    <!-- 集点格：1 个免费格 + 颁发的券格，盖过章的是用掉的 -->
    <div class="slots">
      <span class="slot slot-free" :class="{ done: !freeRemaining }" title="本周免费">
        <CupSoda :size="15" :stroke-width="1.8" />
      </span>
      <span
        v-for="n in issuedCount"
        :key="n"
        class="slot"
        :class="{ done: n <= vouchersUsed }"
        title="奶茶券"
      >
        <CupSoda :size="15" :stroke-width="1.8" />
      </span>
    </div>

    <p v-if="!drinkable" class="mcard-hint">
      这周的免费已经用过啦，让他给你发张券吧
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { CupSoda } from 'lucide-vue-next'
import { useMilktea } from '../composables/useMilktea'
import { useFeed } from '../composables/useFeed'
import Critter from './Critter.vue'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { drinkable, freeRemaining, voucherBalance, issuedCount, vouchersUsed } = useMilktea()

// 奶茶卡是靠 events 推出来的，直接进记录页时 events 可能还没拉，这里兜一下
const { events, loadEvents } = useFeed()
onMounted(() => {
  if (!events.value.length) loadEvents()
})
</script>

<style scoped>
.mcard {
  position: relative;
  padding: 16px 16px 14px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}

.mcard.compact {
  padding: 13px 14px 12px;
}

/* —— 抬头 —— */
.mcard-top {
  display: flex;
  align-items: center;
  gap: 7px;
}
.mcard-leaf {
  color: var(--caramel);
}
.mcard-label {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}
.mcard-owner {
  margin-left: auto;
  padding: 2px 8px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--caramel);
  border: 1px solid var(--line);
  border-radius: 999px;
}

/* —— 数字 —— */
.mcard-count {
  margin-top: 10px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
}
.mcard-count b {
  margin: 0 4px;
  font-family: var(--font-serif);
  font-size: 30px;
  color: var(--ink);
  vertical-align: -3px;
}

.mcard-sub {
  margin-top: 3px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.mcard-sub .dot {
  margin: 0 5px;
}

/* —— 集点格 —— */
.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 13px;
  padding-top: 13px;
  border-top: var(--border-dashed);
}
.slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--line-strong);
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--r-sm);
  background-color: transparent;
}
/* 盖过章（用掉了） */
.slot.done {
  color: var(--photo);
  background-color: var(--brick);
  border: 1.5px solid var(--brick);
  transform: rotate(-6deg);
}
/* 免费格：用实线区分 */
.slot-free {
  border-style: solid;
}

.mcard-hint {
  margin: 12px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--muted);
}

/* 紧凑版（我的页） */
.compact .mcard-count b {
  font-size: 24px;
}
.compact .slot {
  width: 28px;
  height: 28px;
}
.compact .slots {
  margin-top: 10px;
  padding-top: 10px;
}
</style>

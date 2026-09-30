<template>
  <div class="mcard" :class="{ compact }">
    <!-- 她的符号：银杏叶，做个小水印 -->
    <Critter kind="ginkgo" :size="compact ? 16 : 18" class="mcard-leaf" />

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

.mcard-leaf {
  position: absolute;
  top: 12px;
  right: 12px;
  color: var(--caramel);
  opacity: 0.75;
}

/* —— 数字 —— */
.mcard-count {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
}
.mcard-count b {
  margin: 0 5px;
  font-family: var(--font-serif);
  font-size: 34px;
  color: var(--ink);
  vertical-align: -4px;
}

.mcard-sub {
  margin-top: 4px;
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
  margin-top: 14px;
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
  font-size: 26px;
}
.compact .slot {
  width: 28px;
  height: 28px;
}
.compact .slots {
  margin-top: 11px;
  padding-top: 10px;
}
</style>

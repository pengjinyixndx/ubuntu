<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">请愿</h1>
      <p class="page-sub">把想要的，认真说给你听</p>
    </header>

    <div class="entry-list">
      <button
        v-for="item in entries"
        :key="item.name"
        type="button"
        class="entry"
      >
        <span class="entry-icon"><component :is="item.icon" :size="22" :stroke-width="1.5" /></span>
        <span class="entry-body">
          <span class="entry-name">{{ item.name }}</span>
          <span class="entry-desc">{{ item.desc }}</span>
        </span>
        <ChevronRight :size="18" :stroke-width="1.5" class="entry-arrow" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ticket, Sparkles, Heart, HeartHandshake, ChevronRight } from 'lucide-vue-next'

const entries = [
  { name: '奶茶券', desc: '发券、核销，等你审批', icon: Ticket },
  { name: '心愿', desc: '想和你一起完成的事', icon: Sparkles },
  { name: '亲亲', desc: '每天的请求与欠账', icon: Heart },
  { name: '矛盾记录', desc: '把争吵说清楚，再和好', icon: HeartHandshake }
]
</script>

<style scoped>
.page {
  padding: calc(18px + env(safe-area-inset-top)) 20px 24px;
}

.page-head {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-xxl);
  font-weight: 400;
  color: var(--ink);
}

.page-sub {
  margin: 6px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.entry:active {
  transform: scale(0.98);
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  color: var(--brick);
  border: var(--border-dashed);
  border-radius: var(--r-md);
}

.entry-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entry-name {
  font-family: var(--font-song);
  font-size: var(--fs-md);
  color: var(--ink);
}

.entry-desc {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}

.entry-arrow {
  flex-shrink: 0;
  color: var(--faint);
}
</style>

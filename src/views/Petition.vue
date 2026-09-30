<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">请愿</h1>
      <p class="page-sub">把想要的，认真说给你听</p>
    </header>

    <div class="entry-list">
      <button
        v-for="item in entries"
        :key="item.key"
        type="button"
        class="entry"
        @click="open(item.key)"
      >
        <span class="entry-icon" :class="{ alert: item.alert }">
          <component :is="item.icon" :size="22" :stroke-width="1.5" />
          <span v-if="item.badge" class="badge">{{ item.badge }}</span>
        </span>
        <span class="entry-body">
          <span class="entry-name">{{ item.name }}</span>
          <span class="entry-desc">{{ item.desc }}</span>
        </span>
        <ChevronRight :size="18" :stroke-width="1.5" class="entry-arrow" />
      </button>
    </div>

    <MilkteaPanel v-if="active === 'milktea'" @close="close" />
    <KissPanel v-if="active === 'kiss'" @close="close" />
    <WishPanel v-if="active === 'wish'" @close="close" />
    <ConflictPanel v-if="active === 'conflict'" @close="close" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Ticket,
  Sparkles,
  Heart,
  HeartHandshake,
  ChevronRight,
  type LucideIcon
} from 'lucide-vue-next'
import { usePetition } from '../composables/usePetition'
import MilkteaPanel from '../components/MilkteaPanel.vue'
import KissPanel from '../components/KissPanel.vue'
import WishPanel from '../components/WishPanel.vue'
import ConflictPanel from '../components/ConflictPanel.vue'

type Key = 'milktea' | 'kiss' | 'wish' | 'conflict'

const active = ref<Key | null>(null)

const {
  pendingRequests,
  pendingKisses,
  myPendingKisses,
  kissDebt,
  wishes,
  openConflict,
  loadPetition
} = usePetition()

interface Entry {
  key: Key
  name: string
  desc: string
  icon: LucideIcon
  badge: number
  alert: boolean
}

const entries = computed<Entry[]>(() => {
  const wishTodo = wishes.value.filter((w) => !w.done).length
  const kissWaiting = pendingKisses.value.length
  const myWaiting = myPendingKisses.value.length
  const conflictOpen = !!openConflict.value
  const conflictActive = openConflict.value?.status === 'active'

  return [
    {
      key: 'milktea',
      name: '奶茶券',
      desc: pendingRequests.value.length
        ? `${pendingRequests.value.length} 张等着审批`
        : '发券、核销，等你审批',
      icon: Ticket,
      badge: pendingRequests.value.length,
      alert: pendingRequests.value.length > 0
    },
    {
      key: 'kiss',
      name: '亲亲',
      desc: kissWaiting
        ? `${kissWaiting} 个等你说好`
        : myWaiting
          ? `${myWaiting} 个等回话`
          : `欠着 ${kissDebt.value} 个亲亲`,
      icon: Heart,
      badge: kissWaiting,
      alert: kissWaiting > 0
    },
    {
      key: 'wish',
      name: '心愿',
      desc: wishTodo ? `${wishTodo} 个还没做` : '想和你一起完成的事',
      icon: Sparkles,
      badge: 0,
      alert: false
    },
    {
      key: 'conflict',
      name: '矛盾记录',
      desc: conflictActive
        ? '还没和好，点开看看'
        : conflictOpen
          ? '有一份还没写完'
          : '把争吵说清楚，再和好',
      icon: HeartHandshake,
      badge: 0,
      alert: conflictActive
    }
  ]
})

function open(k: Key) {
  active.value = k
}
function close() {
  active.value = null
}

onMounted(loadPetition)
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
  position: relative;
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

.entry-icon.alert {
  border-style: solid;
  border-color: var(--brick);
}

.badge {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-typewriter);
  font-size: 11px;
  color: var(--photo);
  background-color: var(--brick);
  border-radius: 999px;
}

.entry-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
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

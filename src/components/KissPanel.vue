<template>
  <PanelShell title="亲亲" @close="emit('close')">
    <!-- 今日额度 + 欠账 -->
    <section class="summary">
      <div class="cell">
        <span class="cell-num">{{ freeLeftToday }}</span>
        <span class="cell-label">今天还能免费要</span>
      </div>
      <div class="cell">
        <span class="cell-num">{{ kissDebt }}</span>
        <span class="cell-label">欠着的亲亲</span>
      </div>
    </section>

    <!-- 要一个 -->
    <section class="block">
      <button type="button" class="big-btn" :disabled="busy" @click="ask(1)">
        <Heart :size="17" :stroke-width="1.8" />
        要一个亲亲
      </button>
      <p class="hint">
        {{
          freeLeftToday > 0
            ? `还有 ${freeLeftToday} 次免费，直接算数`
            : '今天的免费次数用完了，要对方同意才算'
        }}
      </p>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- 等我同意 -->
    <section v-if="pendingKisses.length" class="block">
      <h3 class="block-title">等你说好</h3>
      <ul class="list">
        <li v-for="k in pendingKisses" :key="k.id" class="row">
          <div class="row-body">
            <p class="row-main">{{ who(k.requester) }} 想要 {{ k.count }} 个亲亲</p>
            <p class="row-sub">{{ time(k.created_at) }} · 超出了今天的免费次数</p>
          </div>
          <div class="row-acts">
            <button type="button" class="btn ok" @click="resolve(k.id, 'approved')">同意</button>
            <button type="button" class="btn no" @click="resolve(k.id, 'rejected')">驳回</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 我发出去的 -->
    <section v-if="myPendingKisses.length" class="block">
      <h3 class="block-title">等回话</h3>
      <ul class="list">
        <li v-for="k in myPendingKisses" :key="k.id" class="row quiet">
          <span class="row-main">我要的 {{ k.count }} 个亲亲</span>
          <span class="row-time">{{ time(k.created_at) }}</span>
        </li>
      </ul>
    </section>

    <!-- 欠着的，可以兑现 -->
    <section v-if="owed.length" class="block">
      <h3 class="block-title">欠着的</h3>
      <ul class="list">
        <li v-for="k in owed" :key="k.id" class="row">
          <div class="row-body">
            <p class="row-main">
              {{ who(k.requester) }} 的 {{ k.count }} 个亲亲
              <span v-if="k.status === 'free'" class="tag">免费</span>
            </p>
            <p class="row-sub">{{ time(k.created_at) }}</p>
          </div>
          <button type="button" class="btn ghost" @click="redeem(k.id)">亲过了</button>
        </li>
      </ul>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Heart } from 'lucide-vue-next'
import type { Kiss } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const {
  freeLeftToday,
  kissDebt,
  kisses,
  pendingKisses,
  myPendingKisses,
  askKiss,
  resolveKiss,
  redeemKiss,
  loadPetition
} = usePetition()

const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

const owed = computed(() =>
  kisses.value.filter(
    (k: Kiss) => (k.status === 'free' || k.status === 'approved') && !k.redeemed
  )
)

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}

async function ask(count: number) {
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error, free } = await askKiss(count)
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没要到，再试一次'
    return
  }
  msg.value = free ? '记上了，欠他一个亲亲' : '超出今天的免费次数了，等他同意'
}

async function resolve(id: string, status: 'approved' | 'rejected') {
  busy.value = true
  msg.value = ''
  await resolveKiss(id, status)
  busy.value = false
}

async function redeem(id: string) {
  busy.value = true
  msg.value = ''
  await redeemKiss(id)
  busy.value = false
}

onMounted(loadPetition)
</script>

<style scoped>
.summary {
  display: flex;
  gap: 12px;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 16px 8px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.cell-num {
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
}
.cell-label {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--muted);
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

.big-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 13px;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  letter-spacing: 2px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
  cursor: pointer;
}
.big-btn:disabled {
  opacity: 0.6;
}

.hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
  text-align: center;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: var(--border-dashed);
}
.row:first-child {
  border-top: none;
  padding-top: 0;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-main {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.row-sub {
  margin: 3px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.row-time {
  margin-left: auto;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.row-acts {
  display: flex;
  gap: 6px;
}
.tag {
  margin-left: 6px;
  padding: 1px 7px;
  font-size: var(--fs-xs);
  color: var(--caramel);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.btn {
  padding: 7px 12px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  border-radius: var(--r-sm);
  cursor: pointer;
  border: none;
}
.btn.ok {
  color: var(--photo);
  background-color: var(--caramel);
}
.btn.no {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.btn.ghost {
  color: var(--ink-soft);
  background-color: transparent;
  border: var(--border);
}

.msg {
  margin: 10px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
  text-align: center;
}
.msg.err {
  color: var(--brick);
}
</style>

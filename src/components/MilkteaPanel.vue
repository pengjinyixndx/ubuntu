<template>
  <PanelShell title="奶茶券" @close="emit('close')">
    <!-- 她的奶茶卡（余额 / 本周剩余） -->
    <MilkteaCard compact />

    <!-- 待我审批 -->
    <section v-if="pendingRequests.length" class="block">
      <h3 class="block-title">等着审批</h3>
      <ul class="list">
        <li v-for="r in pendingRequests" :key="r.id" class="row">
          <div class="row-body">
            <p class="row-main">{{ who(r.requester) }} 想要一张券</p>
            <p v-if="r.reason" class="row-sub">{{ r.reason }}</p>
          </div>
          <div class="row-acts">
            <button type="button" class="btn ok" @click="approve(r.id)">同意</button>
            <button type="button" class="btn no" @click="reject(r.id)">驳回</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 发起 -->
    <section class="block">
      <h3 class="block-title">说一句</h3>
      <input v-model="reason" class="input" type="text" maxlength="30" placeholder="想喝什么？比如：今天想喝芝士葡萄" />
      <div class="acts">
        <button type="button" class="btn primary" :disabled="busy" @click="ask">我想要一张</button>
        <button type="button" class="btn ghost" :disabled="busy" @click="give">直接发一张</button>
      </div>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- 最近 -->
    <section v-if="history.length" class="block">
      <h3 class="block-title">最近</h3>
      <ul class="list">
        <li v-for="r in history" :key="r.id" class="row quiet">
          <span class="dot" :class="r.status"></span>
          <span class="row-main">{{ who(r.requester) }} 的请求</span>
          <span class="row-status">{{ statusText(r.status) }}</span>
          <span class="row-time">{{ time(r.created_at) }}</span>
        </li>
      </ul>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { MilkteaRequest, RequestStatus } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const { pendingRequests, requests, requestMilktea, resolveRequest, issueVoucher, loadPetition } =
  usePetition()

const reason = ref('')
const msg = ref('')
const isErr = ref(false)
const busy = ref(false)

const history = computed(() =>
  requests.value.filter((r: MilkteaRequest) => r.status !== 'pending').slice(0, 6)
)

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}
function statusText(s: RequestStatus): string {
  return s === 'approved' ? '已同意' : s === 'rejected' ? '已驳回' : '待审批'
}

async function approve(id: string) {
  busy.value = true
  msg.value = ''
  const { error } = await resolveRequest(id, 'approved')
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没同意上，再试一次'
  }
}

async function reject(id: string) {
  busy.value = true
  msg.value = ''
  const { error } = await resolveRequest(id, 'rejected')
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没驳回成，再试一次'
  }
}

async function ask() {
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error } = await requestMilktea(reason.value.trim())
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没发出去，再试一次'
    return
  }
  reason.value = ''
  msg.value = '已经说出口啦，等他回话'
}

async function give() {
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error } = await issueVoucher(reason.value.trim())
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没发出去，再试一次'
    return
  }
  reason.value = ''
  msg.value = '券已经发出去了'
}

onMounted(loadPetition)
</script>

<style scoped>
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
.row-acts {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.row.quiet {
  font-size: var(--fs-sm);
}
.row-status {
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
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--faint);
  flex-shrink: 0;
}
.dot.approved {
  background-color: var(--caramel);
}
.dot.rejected {
  background-color: var(--brick);
}

.input {
  width: 100%;
  padding: 9px 2px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.input::placeholder {
  color: var(--faint);
}
.input:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}

.acts {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.btn {
  padding: 8px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
  border: none;
}
.btn.primary {
  color: var(--photo);
  background-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
  transform: rotate(-1.5deg);
}
.btn.ghost {
  color: var(--ink-soft);
  background-color: transparent;
  border: var(--border);
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
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.msg {
  margin: 10px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.msg.err {
  color: var(--brick);
}
</style>

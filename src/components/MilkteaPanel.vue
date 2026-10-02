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
            <p class="row-main">{{ who(r.requester) }} 递了一份申请</p>
            <p class="row-sub">{{ r.reason || '（没写理由）' }}</p>
          </div>
          <div class="row-acts">
            <button type="button" class="btn ok" @click="askApprove(r)">同意</button>
            <button type="button" class="btn no" @click="askReject(r)">驳回</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 发起 -->
    <section class="block">
      <h3 class="block-title">写一份申请</h3>
      <textarea
        v-model="reason"
        class="area"
        maxlength="60"
        placeholder="为什么想喝这一杯？写清楚一点（必填）"
      ></textarea>

      <label class="expiry-row">
        <span class="expiry-label">券的到期时间</span>
        <input v-model="expiresAt" class="expiry-input" type="date" />
      </label>
      <p class="expiry-hint">发券和同意申请都用这个日期；过期就不能再用了</p>

      <div class="acts">
        <button type="button" class="btn primary" :disabled="busy" @click="askRequest">
          我想要一张
        </button>
        <button type="button" class="btn ghost" :disabled="busy" @click="askIssue">
          直接发一张
        </button>
      </div>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- 最近 -->
    <section v-if="history.length" class="block">
      <h3 class="block-title">最近</h3>
      <ul class="list">
        <li v-for="r in history" :key="r.id" class="row quiet">
          <span class="dot" :class="r.status"></span>
          <span class="row-main">{{ who(r.requester) }} 的申请</span>
          <span class="row-status">{{ statusText(r.status) }}</span>
          <span class="row-time">{{ time(r.created_at) }}</span>
        </li>
      </ul>
    </section>

    <!-- 强制提醒：看清了、等 3 秒才能确认 -->
    <ConfirmModal
      v-if="confirm"
      :title="confirm.title"
      :desc="confirm.desc"
      :lines="confirm.lines"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      @cancel="confirm = null"
      @confirm="runConfirm"
    />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { MilkteaRequest, RequestStatus } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, dateTimeLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const { pendingRequests, requests, requestMilktea, resolveRequest, issueVoucher, loadPetition } =
  usePetition()

const reason = ref('')
const expiresAt = ref(defaultExpiry())
const msg = ref('')
const isErr = ref(false)
const busy = ref(false)

interface PendingConfirm {
  title: string
  desc: string
  lines: string[]
  confirmText: string
  danger: boolean
  run: () => Promise<{ error: unknown }>
}
const confirm = ref<PendingConfirm | null>(null)

/** 默认到期：七天后 */
function defaultExpiry(): string {
  const d = new Date(Date.now() + 7 * 86400000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

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
function fmtDay(v: string): string {
  return v ? dateTimeLabel(`${v}T00:00:00`).split(' ')[0] ?? v : '没设'
}

/* —— 三个入口：都先弹强制提醒 —— */
function askApprove(r: MilkteaRequest) {
  if (!expiresAt.value) {
    isErr.value = true
    msg.value = '先选一个到期时间'
    return
  }
  msg.value = ''
  confirm.value = {
    title: '确认给她发这张券？',
    desc: '同意之后会立刻发出一张奶茶券，并记进展示流。',
    lines: [`申请理由：${r.reason || '（没写）'}`, `这张券到期：${fmtDay(expiresAt.value)}`],
    confirmText: '确认发出',
    danger: false,
    run: () => resolveRequest(r.id, 'approved', { expires_at: expiresAt.value })
  }
}

function askReject(r: MilkteaRequest) {
  msg.value = ''
  confirm.value = {
    title: '确认驳回这份申请？',
    desc: '驳回后这条申请就结束了，她那边会看到结果。',
    lines: [`她写的是：${r.reason || '（没写）'}`],
    confirmText: '确认驳回',
    danger: true,
    run: () => resolveRequest(r.id, 'rejected')
  }
}

function askRequest() {
  if (!reason.value.trim()) {
    isErr.value = true
    msg.value = '申请要写清楚原因'
    return
  }
  isErr.value = false
  msg.value = ''
  const text = reason.value.trim()
  confirm.value = {
    title: '确认递出这份申请？',
    desc: '递出后等对方决定给不给。',
    lines: [`申请理由：${text}`],
    confirmText: '确认递出',
    danger: false,
    run: () => requestMilktea(text)
  }
}

function askIssue() {
  if (!reason.value.trim()) {
    isErr.value = true
    msg.value = '发券要写清楚因何故'
    return
  }
  if (!expiresAt.value) {
    isErr.value = true
    msg.value = '发券要填到期时间'
    return
  }
  isErr.value = false
  msg.value = ''
  const text = reason.value.trim()
  confirm.value = {
    title: '确认发出这张券？',
    desc: '发出后会记进展示流，带上理由和到期时间。',
    lines: [`因何故：${text}`, `到期时间：${fmtDay(expiresAt.value)}`],
    confirmText: '确认发出',
    danger: false,
    run: () => issueVoucher(text, expiresAt.value)
  }
}

async function runConfirm() {
  const job = confirm.value
  if (!job) return
  confirm.value = null
  busy.value = true
  msg.value = ''
  const { error } = await job.run()
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没成功，再试一次'
    return
  }
  isErr.value = false
  reason.value = ''
  msg.value = '好了'
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
  line-height: 1.7;
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

.area {
  width: 100%;
  min-height: 66px;
  resize: none;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  outline: none;
  background-color: transparent;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.8;
  color: var(--ink);
}
.area::placeholder {
  color: var(--faint);
}
.area:focus {
  border-bottom-color: var(--caramel);
}

.expiry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.expiry-label {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}
.expiry-input {
  flex: 1;
  padding: 6px 2px;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  background: transparent;
  font-family: var(--font-typewriter);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.expiry-input:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}
.expiry-hint {
  margin: 6px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
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

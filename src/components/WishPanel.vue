<template>
  <PanelShell title="心愿" @close="emit('close')">
    <!-- 许一个 -->
    <section class="block">
      <h3 class="block-title">许一个</h3>
      <textarea
        v-model="content"
        class="textarea"
        maxlength="80"
        placeholder="想和你一起做成什么事……"
      ></textarea>
      <label class="date-row">
        <span class="date-label">想在什么时候</span>
        <input v-model="wantAt" class="date" type="date" />
      </label>
      <button type="button" class="btn primary" :disabled="!canAdd || busy" @click="askSubmit">
        许下
      </button>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- 进行中 -->
    <section class="block">
      <h3 class="block-title">还没做</h3>
      <p v-if="!todo.length" class="empty">还没有心愿，许一个吧</p>
      <ul v-else class="list">
        <li v-for="w in todo" :key="w.id" class="row">
          <button
            type="button"
            class="check"
            aria-label="标记完成"
            @click="toggle(w.id, true)"
          ></button>
          <div class="row-body">
            <p class="row-main">{{ w.content }}</p>
            <p class="row-sub">
              <span v-if="w.want_at">想在 {{ fmt(w.want_at) }} 完成</span>
              <span v-else>没定时间</span>
              <span class="sep">·</span>
              <span>{{ who(w.owner) }}许的</span>
            </p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 已完成 -->
    <section v-if="done.length" class="block">
      <h3 class="block-title">已经做到</h3>
      <ul class="list">
        <li v-for="w in done" :key="w.id" class="row finished">
          <button
            type="button"
            class="check on"
            aria-label="取消完成"
            @click="toggle(w.id, false)"
          >
            <Check :size="12" :stroke-width="2.6" />
          </button>
          <div class="row-body">
            <p class="row-main">{{ w.content }}</p>
            <p class="row-sub">{{ who(w.owner) }}许的 · 已完成</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 强制提醒 -->
    <ConfirmModal
      v-if="confirm"
      :title="confirm.title"
      :desc="confirm.desc"
      :lines="confirm.lines"
      :confirm-text="confirm.confirmText"
      @cancel="confirm = null"
      @confirm="runConfirm"
    />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check } from 'lucide-vue-next'
import type { Wish } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const { wishList, addWish, toggleWish, loadPetition } = usePetition()

const content = ref('')
const wantAt = ref('')
const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

const canAdd = computed(() => content.value.trim().length > 0)
const todo = computed(() => wishList.value.filter((w: Wish) => !w.done))
const done = computed(() => wishList.value.filter((w: Wish) => w.done))

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function fmt(d: string): string {
  const dt = new Date(`${d}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return d
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
}

async function submit() {
  if (!canAdd.value || busy.value) return
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error } = await addWish(content.value.trim(), wantAt.value)
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没许上，再试一次'
    return
  }
  content.value = ''
  wantAt.value = ''
  msg.value = '许下啦'
}

/* 发布心愿要先过强制提醒 */
interface PendingConfirm {
  title: string
  desc: string
  lines: string[]
  confirmText: string
  run: () => Promise<void>
}
const confirm = ref<PendingConfirm | null>(null)

function askSubmit() {
  if (!canAdd.value) return
  confirm.value = {
    title: '确认许下这个心愿？',
    desc: '许下之后会记进展示流，两个人都能看到。',
    lines: [
      `心愿：${content.value.trim()}`,
      `想完成的时间：${wantAt.value ? fmt(wantAt.value) : '没定'}`
    ],
    confirmText: '确认许下',
    run: submit
  }
}

async function runConfirm() {
  const job = confirm.value
  if (!job) return
  confirm.value = null
  await job.run()
}

async function toggle(id: string, v: boolean) {
  await toggleWish(id, v)
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

.textarea {
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
.textarea::placeholder {
  color: var(--faint);
}
.textarea:focus {
  border-bottom-color: var(--caramel);
}

.date-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.date-label {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}
.date {
  flex: 1;
  padding: 6px 2px;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  background: transparent;
  font-family: var(--font-typewriter);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.date:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}

.btn.primary {
  width: 100%;
  margin-top: 14px;
  padding: 11px;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  letter-spacing: 3px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
  cursor: pointer;
}
.btn.primary:disabled {
  background-color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
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
  line-height: 1.7;
  color: var(--ink);
  word-break: break-word;
}
.row-sub {
  margin: 4px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.sep {
  margin: 0 5px;
}
.finished .row-main {
  color: var(--faint);
  text-decoration: line-through;
}

.check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--paper);
  border: 1.5px solid var(--line-strong);
  border-radius: var(--r-sm);
  color: var(--photo);
  cursor: pointer;
}
.check.on {
  background-color: var(--caramel);
  border-color: var(--caramel);
}

.empty {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
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

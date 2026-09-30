<template>
  <PanelShell title="矛盾记录" @close="emit('close')">
    <!-- 没有进行中的：说明 + 发起 -->
    <template v-if="!openConflict">
      <section class="block">
        <h3 class="block-title">这个怎么用</h3>
        <ol class="steps">
          <li>谁先想谈，就在这里发起一份记录；</li>
          <li>两个人都要各填一份：什么时候、因为什么、诉求是什么；</li>
          <li>两份都填完才算「进入」——在那之前谁都别想跳过；</li>
          <li>期间每次打开青桃都会弹出两份记录，你要选「冷静」还是「和好」。</li>
        </ol>
        <button type="button" class="btn primary" :disabled="busy" @click="start">
          开始一份矛盾记录
        </button>
        <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
      </section>
    </template>

    <!-- 有进行中的 -->
    <template v-else>
      <section class="status" :class="openConflict.status">
        <p class="status-main">{{ statusMain }}</p>
        <p class="status-sub">{{ statusSub }}</p>
      </section>

      <!-- 我还没填：表单 -->
      <section v-if="!iFilledOpenConflict" class="block">
        <h3 class="block-title">你这一份</h3>
        <label class="field">
          <span class="field-label">什么时候</span>
          <input v-model="happenedOn" class="field-input" placeholder="比如：昨天晚上" maxlength="20" />
        </label>
        <label class="field">
          <span class="field-label">因为什么</span>
          <textarea
            v-model="matter"
            class="field-area"
            maxlength="200"
            placeholder="把当时的情况写清楚，别写气话"
          ></textarea>
        </label>
        <label class="field">
          <span class="field-label">诉求是什么</span>
          <textarea
            v-model="demand"
            class="field-area"
            maxlength="200"
            placeholder="你希望对方怎么做"
          ></textarea>
        </label>
        <button type="button" class="btn primary" :disabled="!canSubmit || busy" @click="submitNote">
          提交我这一份
        </button>
        <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
      </section>

      <!-- 两份记录 -->
      <section class="block">
        <h3 class="block-title">两个人的说法</h3>
        <p v-if="!openNotes.length" class="empty">还没人填写</p>
        <ul v-else class="notes">
          <li v-for="n in openNotes" :key="n.id" class="note">
            <header class="note-head">
              <span class="note-who">{{ who(n.author) }}</span>
              <span class="note-time">{{ time(n.created_at) }}</span>
            </header>
            <p v-if="n.happened_on" class="note-line"><em>什么时候</em>{{ n.happened_on }}</p>
            <p class="note-line"><em>因为什么</em>{{ n.matter }}</p>
            <p class="note-line"><em>诉求</em>{{ n.demand }}</p>
          </li>
        </ul>
        <p v-if="!bothFilled" class="waiting">
          还差 {{ waitingWho }} 的那一份，填完才能继续
        </p>
      </section>

      <!-- 抉择 -->
      <section v-if="bothFilled" class="block">
        <h3 class="block-title">现在怎么走</h3>
        <div class="acts">
          <button type="button" class="btn ghost" :disabled="busy" @click="settle('calm')">
            先冷静一下
          </button>
          <button type="button" class="btn primary" :disabled="busy" @click="settle('resolved')">
            和好吧
          </button>
        </div>
        <p class="acts-hint">选「冷静」不会结束这件事，之后还能回到这里选和好</p>
      </section>
    </template>

    <!-- 以前的和好记录 -->
    <section v-if="past.length" class="block">
      <h3 class="block-title">以前的</h3>
      <ul class="list">
        <li v-for="c in past" :key="c.id" class="row quiet">
          <span class="row-main">{{ dateLabel(c.created_at) }} 的那一次</span>
          <span class="row-status">已和好</span>
        </li>
      </ul>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Conflict } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, dateTimeLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const {
  openConflict,
  notesOf,
  iFilledOpenConflict,
  bothFilled,
  conflicts,
  startConflict,
  addConflictNote,
  setConflictStatus,
  loadPetition
} = usePetition()

const happenedOn = ref('')
const matter = ref('')
const demand = ref('')
const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

const openNotes = computed(() => (openConflict.value ? notesOf(openConflict.value.id) : []))
const past = computed(() => conflicts.value.filter((c: Conflict) => c.status === 'resolved').slice(0, 8))
const canSubmit = computed(() => matter.value.trim().length > 0 && demand.value.trim().length > 0)

const statusMain = computed(() => {
  switch (openConflict.value?.status) {
    case 'collecting':
      return '还在各写各的'
    case 'active':
      return '两份都写了，得谈一谈'
    case 'calm':
      return '都在冷静'
    default:
      return ''
  }
})
const statusSub = computed(() => {
  switch (openConflict.value?.status) {
    case 'collecting':
      return '两个人都填完，才算真的进入这件事'
    case 'active':
      return '打开青桃就会弹出这两份记录，直到你们决定怎么办'
    case 'calm':
      return '先放一放，想好了随时回来选和好'
    default:
      return ''
  }
})
const waitingWho = computed(() => {
  if (!openConflict.value) return ''
  const notes = notesOf(openConflict.value.id)
  const filled = notes.some((n) => n.author === myProfile.value?.id)
  return filled ? '对方' : '你'
})

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}
function dateLabel(iso: string): string {
  const s = dateTimeLabel(iso)
  const cut = s.indexOf(' ')
  return cut > 0 ? s.slice(0, cut) : s
}

async function start() {
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error } = await startConflict()
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '已经有进行中的记录了'
  }
}

async function submitNote() {
  if (!openConflict.value || !canSubmit.value) return
  busy.value = true
  msg.value = ''
  isErr.value = false
  const { error } = await addConflictNote({
    conflict_id: openConflict.value.id,
    happened_on: happenedOn.value.trim(),
    matter: matter.value.trim(),
    demand: demand.value.trim()
  })
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没提交上，再试一次'
    return
  }
  happenedOn.value = ''
  matter.value = ''
  demand.value = ''
  msg.value = '写好了'
}

async function settle(status: 'calm' | 'resolved') {
  if (!openConflict.value) return
  busy.value = true
  await setConflictStatus(openConflict.value.id, status)
  busy.value = false
  if (status === 'resolved') emit('close')
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

.steps {
  margin: 0 0 14px;
  padding-left: 18px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 2;
  color: var(--ink-soft);
}

.status {
  padding: 14px 16px;
  background-color: var(--photo);
  border: var(--border);
  border-left: 3px solid var(--caramel);
  border-radius: var(--r-sm);
}
.status.active {
  border-left-color: var(--brick);
}
.status.calm {
  border-left-color: var(--line-strong);
}
.status-main {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--ink);
}
.status-sub {
  margin: 5px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--muted);
}

.field {
  display: block;
  margin-bottom: 12px;
}
.field-label {
  display: block;
  margin-bottom: 4px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--muted);
}
.field-input {
  width: 100%;
  padding: 7px 2px;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  background: transparent;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.field-area {
  width: 100%;
  min-height: 62px;
  padding: 6px 0;
  resize: none;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  outline: none;
  background: transparent;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.8;
  color: var(--ink);
}
.field-input:focus,
.field-area:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}
.field-input::placeholder,
.field-area::placeholder {
  color: var(--faint);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.note {
  padding: 12px;
  background-color: var(--paper);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.note-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.note-who {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.note-time {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.note-line {
  margin: 5px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink);
  word-break: break-word;
}
.note-line em {
  display: inline-block;
  min-width: 58px;
  margin-right: 6px;
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.waiting {
  margin: 12px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--brick);
}

.empty {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}

.acts {
  display: flex;
  gap: 10px;
}
.btn {
  padding: 10px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
  border: none;
}
.btn.primary {
  flex: 1;
  color: var(--photo);
  background-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
}
.btn.primary:disabled {
  background-color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}
.btn.ghost {
  flex: 1;
  color: var(--ink-soft);
  background-color: transparent;
  border: var(--border);
}
.acts-hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: var(--border-dashed);
}
.row:first-child {
  border-top: none;
  padding-top: 0;
}
.row-main {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink-soft);
}
.row-status {
  margin-left: auto;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--caramel);
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

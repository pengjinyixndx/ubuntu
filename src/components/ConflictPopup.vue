<template>
  <Teleport to="body">
    <div class="mask">
      <div class="sheet">
        <p class="eyebrow">青桃 · 先把话说清楚</p>
        <h2 class="title">你们还没和好</h2>
        <p class="lead">这是那天各自写下的两份——都还在。</p>

        <div class="notes">
          <article v-for="n in notes" :key="n.id" class="note">
            <header class="note-head">
              <span class="who">{{ who(n.author) }}</span>
              <span class="at">{{ time(n.created_at) }}</span>
            </header>
            <p class="line"><em>什么时候</em>{{ n.happened_on || '没写' }}</p>
            <p class="line"><em>因为什么</em>{{ n.matter }}</p>
            <p class="line"><em>诉求</em>{{ n.demand }}</p>
          </article>
        </div>

        <div class="acts">
          <button type="button" class="btn ghost" :disabled="busy" @click="settle('calm')">
            先冷静一下
          </button>
          <button type="button" class="btn primary" :disabled="busy" @click="askMakeUp">
            和好吧
          </button>
        </div>
        <p class="hint">选「冷静」不会结束这件事，下次打开还会看到</p>
      </div>

      <!-- 强制提醒：和好要等 3 秒才能确认 -->
      <ConfirmModal
        v-if="confirm"
        title="确认和好？"
        desc="和好之后这件事就结束了，不会再弹这个窗口。"
        :lines="[]"
        confirm-text="确认和好"
        @cancel="confirm = false"
        @confirm="runMakeUp"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, timeLabel } from '../lib/eventLabels'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{ done: [] }>()
const { myProfile } = useFeed()
const { openConflict, notesOf, setConflictStatus } = usePetition()

const busy = ref(false)
const notes = computed(() => (openConflict.value ? notesOf(openConflict.value.id) : []))

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}

async function settle(status: 'calm' | 'resolved') {
  if (!openConflict.value || busy.value) return
  busy.value = true
  await setConflictStatus(openConflict.value.id, status)
  busy.value = false
  emit('done')
}

/* 和好是不可逆的，先弹强制提醒 */
const confirm = ref(false)
function askMakeUp() {
  confirm.value = true
}
async function runMakeUp() {
  confirm.value = false
  await settle('resolved')
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(43, 37, 29, 0.42);
  backdrop-filter: blur(2px);
}

.sheet {
  width: 100%;
  max-width: calc(var(--app-w) - 40px);
  max-height: 84vh;
  overflow-y: auto;
  padding: 20px 18px 18px;
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 18px 46px rgba(60, 44, 20, 0.28);
}

.eyebrow {
  margin: 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 1.5px;
  color: var(--caramel);
  text-transform: uppercase;
}
.title {
  margin: 6px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-xl);
  font-weight: 400;
  color: var(--ink);
}
.lead {
  margin: 6px 0 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note {
  padding: 12px;
  background-color: var(--photo);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.note-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
}
.who {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.at {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.line {
  margin: 4px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink);
  word-break: break-word;
}
.line em {
  display: inline-block;
  min-width: 56px;
  margin-right: 6px;
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.acts {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.btn {
  flex: 1;
  padding: 11px;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
  border: none;
}
.btn.primary {
  color: var(--photo);
  background-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
}
.btn.ghost {
  color: var(--ink-soft);
  background-color: transparent;
  border: var(--border);
}
.btn:disabled {
  opacity: 0.55;
}

.hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
  text-align: center;
}
</style>

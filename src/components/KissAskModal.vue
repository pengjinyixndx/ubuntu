<template>
  <Teleport to="body">
    <div v-if="current" class="ask-mask">
      <div class="ask-box">
        <header class="head">
          <Critter kind="ginkgo" :size="22" class="leaf" />
          <span class="head-text">{{ who(current.requester) }} 想亲你</span>
        </header>

        <p v-if="current.reason" class="reason">{{ current.reason }}</p>
        <div v-if="current.photo_url" class="shot">
          <img :src="current.photo_url" alt="附的照片" @error="onImgError" />
        </div>

        <p class="when">{{ time(current.created_at) }}</p>

        <div class="acts">
          <button type="button" class="btn ghost" :disabled="busy" @click="later">待会儿</button>
          <button type="button" class="btn no" :disabled="busy" @click="answer('rejected')">
            这次不了
          </button>
          <button type="button" class="btn yes" :disabled="busy" @click="answer('approved')">
            好呀
          </button>
        </div>
        <p class="hint">选了待会儿，这件事会留在「我的 → 待办」里</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { useMilktea } from '../composables/useMilktea'
import { actorLabel, timeLabel } from '../lib/eventLabels'
import Critter from './Critter.vue'

const { pendingKisses, resolveKiss } = usePetition()
const { myProfile } = useFeed()
const { iAmHer } = useMilktea()

const busy = ref(false)

/* 选了「待会儿」的，记在本机——不然每次刷新又弹一遍；
   它同时会出现在「我的 → 待办」里，不会被忘掉。 */
const LATER_KEY = 'qingtao_kiss_later'
function loadLater(): string[] {
  try {
    const raw = localStorage.getItem(LATER_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as string[]) : []
  } catch {
    return []
  }
}
const dismissed = ref<string[]>(loadLater())

/** 只弹「她递过来、还没回」的那一条 */
const current = computed(() => {
  if (iAmHer.value) return null
  return pendingKisses.value.find((k) => !dismissed.value.includes(k.id)) ?? null
})

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}

function later() {
  const target = current.value
  if (!target) return
  dismissed.value.push(target.id)
  try {
    localStorage.setItem(LATER_KEY, JSON.stringify(dismissed.value))
  } catch {
    /* 存不下也不影响这次 */
  }
}

async function answer(status: 'approved' | 'rejected') {
  const target = current.value
  if (!target || busy.value) return
  busy.value = true
  await resolveKiss(target.id, status)
  busy.value = false
}

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3ead4"/><text x="200" y="160" font-family="serif" font-size="15" fill="#b3a588" text-anchor="middle">暂无图片</text></svg>`
  )
function onImgError(e: Event) {
  const img = e.currentTarget as HTMLImageElement
  if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER
}
</script>

<style scoped>
.ask-mask {
  position: fixed;
  inset: 0;
  z-index: 430;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background-color: rgba(43, 37, 29, 0.5);
  backdrop-filter: blur(2px);
}
.ask-box {
  width: 100%;
  max-width: calc(var(--app-w) - 44px);
  padding: 20px 18px 16px;
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 20px 50px rgba(60, 44, 20, 0.34);
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.leaf {
  color: var(--caramel);
}
.head-text {
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  letter-spacing: 1px;
  color: var(--ink);
}

.reason {
  margin: 12px 0 0;
  padding: 12px 14px;
  background-color: var(--photo);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.9;
  color: var(--ink-soft);
  word-break: break-word;
}

.shot {
  margin-top: 10px;
  height: 150px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.when {
  margin: 10px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}

.acts {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.btn {
  flex: 1;
  padding: 10px 6px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn.ghost {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.btn.no {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.btn.yes {
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
  text-align: center;
}
</style>

<template>
  <PanelShell title="历史矛盾" @close="emit('close')">
    <p class="lead">和好之后的都收在这儿，想翻旧账（或者想确认当时说清楚了没有）随时来看。</p>

    <p v-if="!list.length" class="empty">还没有和好过的记录</p>

    <section v-for="c in list" :key="c.id" class="block">
      <header class="head">
        <span class="day">{{ dayOf(c.created_at) }}</span>
        <span class="span">前后 {{ lasted(c) }}</span>
      </header>

      <article v-for="n in notesOf(c.id)" :key="n.id" class="note">
        <p class="who">{{ who(n.author) }}</p>
        <p class="line"><em>什么时候</em>{{ n.happened_on || '—' }}</p>
        <p class="line"><em>因为什么</em>{{ n.matter }}</p>
        <p class="line"><em>诉求</em>{{ n.demand }}</p>
      </article>

      <p v-if="!notesOf(c.id).length" class="none">当时没留下文字</p>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Conflict, ConflictNote } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, dateTimeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { conflicts, conflictNotes, loadPetition } = usePetition()
const { myProfile } = useFeed()

/** 只有「已和好」的才算历史；冷静中的还在进行 */
const list = computed<Conflict[]>(() =>
  conflicts.value
    .filter((c) => c.status === 'resolved')
    .slice()
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at))
)

function notesOf(id: string): ConflictNote[] {
  return conflictNotes.value.filter((n) => n.conflict_id === id)
}
function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function dayOf(iso: string): string {
  const s = dateTimeLabel(iso)
  const cut = s.indexOf(' ')
  return cut > 0 ? s.slice(0, cut) : s
}
/** 从开始到和好，隔了多久 */
function lasted(c: Conflict): string {
  const a = new Date(c.created_at).getTime()
  const b = new Date(c.updated_at as string).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return '—'
  const mins = Math.max(0, Math.round((b - a) / 60000))
  if (mins < 60) return `${mins} 分钟`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时`
  return `${Math.floor(hours / 24)} 天`
}

onMounted(loadPetition)
</script>

<style scoped>
.lead {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.8;
  color: var(--muted);
}

.block {
  padding: 14px 15px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: var(--border-dashed);
}
.day {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}
.span {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--caramel);
}

.note {
  padding-top: 12px;
}
.note + .note {
  margin-top: 4px;
  border-top: 1px dashed var(--line);
}
.who {
  margin: 0 0 6px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.line {
  margin: 5px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.85;
  color: var(--ink-soft);
  word-break: break-word;
}
.line em {
  display: inline-block;
  min-width: 66px;
  margin-right: 6px;
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.empty,
.none {
  margin: 0;
  padding: 26px 0;
  text-align: center;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}
.none {
  padding: 12px 0 0;
}
</style>

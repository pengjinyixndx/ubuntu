<template>
  <PanelShell title="恢复" @close="emit('close')">
    <p class="lead">这里是你自己删掉的内容，两个人都看不到，只有你能找回来。</p>

    <p v-if="loading" class="empty">正在找…</p>

    <p v-else-if="!items.length" class="empty">没有删掉的东西</p>

    <ul v-else class="list">
      <li v-for="k in items" :key="k.id" class="row">
        <div class="row-body">
          <p class="row-main">{{ kindOf(k.type) }}<span v-if="k.content">：{{ k.content }}</span></p>
          <p class="row-time">{{ dateTimeLabel(k.created_at) }} 发的 · {{ dateTimeLabel(k.revoked_at || '') }} 删的</p>
        </div>
        <button type="button" class="btn" :disabled="busy === k.id" @click="restore(k.id)">
          恢复
        </button>
      </li>
    </ul>

    <p v-if="err" class="err">没恢复成功，再试一次</p>
    <p class="foot">删掉满 90 天后就真的没了，找不回来。</p>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CoupleEvent } from '../types/domain'
import { getFeedSource } from '../lib/dataSource'
import { useFeed } from '../composables/useFeed'
import { dateTimeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { loadEvents, markRevokedId, markLocalWrite } = useFeed()

const all = ref<CoupleEvent[]>([])
const loading = ref(true)
const busy = ref('')
const err = ref(false)

/** 只有文字类和照片类能自己删，回收站里自然也只有这两类 */
const items = computed(() =>
  all.value.filter((e) => ['note', 'diary', 'photo'].includes(e.type))
)

function kindOf(t: string): string {
  if (t === 'note') return '随笔'
  if (t === 'diary') return '日记'
  if (t === 'photo') return '照片'
  return t
}

async function load() {
  loading.value = true
  const source = await getFeedSource()
  const { data } = await source.listMyRevoked()
  all.value = data
  loading.value = false
}

async function restore(id: string) {
  if (busy.value) return
  busy.value = id
  err.value = false
  const source = await getFeedSource()
  const { error } = await source.setOwnRevoked(id, false)
  busy.value = ''
  if (error) {
    err.value = true
    return
  }
  markRevokedId(id, false)
  markLocalWrite()
  all.value = all.value.filter((x) => x.id !== id)
  // 展示流要跟着把这条放回去
  await loadEvents()
}

onMounted(load)
</script>

<style scoped>
.lead {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.8;
  color: var(--muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 13px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-main {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.row-time {
  margin: 4px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}

.btn {
  flex-shrink: 0;
  padding: 8px 16px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--photo);
  background-color: var(--caramel);
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.empty {
  margin: 0;
  padding: 30px 0;
  text-align: center;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}
.err {
  margin: 12px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--brick);
}
.foot {
  margin: 14px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
}
</style>

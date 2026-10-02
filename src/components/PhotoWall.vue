<template>
  <PanelShell title="照片墙" @close="emit('close')">
    <p class="lead">
      一共 {{ photos.length }} 张 · 点开看大图，也可以直接保存到本地
    </p>

    <p v-if="!photos.length" class="empty">还没有照片，去「记录」发第一张吧</p>

    <div v-else class="wall">
      <figure v-for="p in photos" :key="p.id" class="cell" @click="big = p">
        <div class="cell-img">
          <img :src="p.url" :alt="p.caption || '照片'" loading="lazy" @error="onImgError" />
        </div>
        <figcaption class="cell-foot">
          <span class="cell-cap">{{ p.caption || '没写说明' }}</span>
          <span class="cell-day">{{ p.createdAt.slice(0, 10) }}</span>
        </figcaption>
        <button
          type="button"
          class="cell-save"
          :disabled="saving === p.id"
          aria-label="保存到本地"
          @click.stop="save(p)"
        >
          <Download :size="13" :stroke-width="2" />
        </button>
      </figure>
    </div>

    <!-- 大图 -->
    <Teleport to="body">
      <div v-if="big" class="lightbox" @click.self="big = null">
        <img class="lb-img" :src="big.url" :alt="big.caption || '照片'" @error="onImgError" />
        <div class="lb-bar">
          <span class="lb-cap">{{ big.caption || '没写说明' }}</span>
          <button type="button" class="lb-btn" @click="save(big)">保存到本地</button>
          <button type="button" class="lb-btn ghost" @click="big = null">关闭</button>
        </div>
      </div>
    </Teleport>
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download } from 'lucide-vue-next'
import type { CoupleEvent } from '../types/domain'
import { useFeed } from '../composables/useFeed'
import { photoFileName, saveImage } from '../lib/download'
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
const { events, loadEvents } = useFeed()

interface PhotoItem {
  id: string
  url: string
  caption: string
  createdAt: string
}

/** 不分出处：随笔的随手拍、照片动态，只要有图就收进来（最新在前） */
const photos = computed<PhotoItem[]>(() => {
  const items: PhotoItem[] = []
  for (const ev of events.value) {
    if (!ev.photo_urls?.length) continue
    for (const url of ev.photo_urls) {
      items.push({
        id: `${ev.id}-${url}`,
        url,
        caption: ev.content || '',
        createdAt: ev.created_at
      })
    }
  }
  return items
})

const big = ref<PhotoItem | null>(null)
const saving = ref('')

async function save(p: PhotoItem) {
  saving.value = p.id
  await saveImage(p.url, photoFileName(p.createdAt, p.id))
  saving.value = ''
}

/** 图片加载失败时换成暖色占位，避免破图 */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3ead4"/><g fill="none" stroke="#98663a" stroke-width="2"><rect x="165" y="112" width="70" height="52"/><circle cx="180" cy="128" r="5"/><path d="M165 164 L190 134 L215 164"/></g><text x="200" y="205" font-family="serif" font-size="15" fill="#b3a588" text-anchor="middle">暂无图片</text></svg>`
  )
function onImgError(e: Event) {
  const img = e.currentTarget as HTMLImageElement
  if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER
}

onMounted(() => {
  if (!events.value.length) loadEvents()
})
</script>

<style scoped>
.lead {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}

.wall {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cell {
  position: relative;
  margin: 0;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  cursor: pointer;
}
.cell:active {
  transform: scale(0.985);
}

.cell-img {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background-color: var(--paper-deep);
}
.cell-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cell-foot {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px 9px;
}
.cell-cap {
  font-family: var(--font-hand);
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cell-day {
  font-family: var(--font-typewriter);
  font-size: 10px;
  color: var(--faint);
}

.cell-save {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--photo);
  background-color: rgba(43, 37, 29, 0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
.cell-save:disabled {
  opacity: 0.5;
}

.empty {
  margin: 0;
  padding: 30px 0;
  text-align: center;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}

/* —— 大图 —— */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  background-color: rgba(20, 17, 13, 0.88);
}
.lb-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: var(--r-sm);
}
.lb-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: var(--app-w);
}
.lb-cap {
  flex: 1;
  min-width: 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: #e8dfc9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.lb-btn.ghost {
  color: #e8dfc9;
  background-color: transparent;
  border: 1px solid rgba(232, 223, 201, 0.4);
}
</style>

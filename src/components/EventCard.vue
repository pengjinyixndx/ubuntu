<template>
  <article class="feed-card" :class="{ current }" :style="pose" @click="$emit('pick')">
    <!-- 抬头：类型图标 · 称呼 动作 · 相对时间 -->
    <div class="card-head">
      <component :is="icon" :size="15" :stroke-width="1.7" class="head-icon" />
      <span class="head-actor">{{ actor }} {{ action }}</span>
      <span class="head-time">{{ time }}</span>
    </div>

    <!-- 内容（随类型变化） -->
    <div class="card-content">
      <p v-if="isText" class="content-text">{{ event.content }}</p>

      <div v-else-if="event.type === 'photo'" class="photo-grid">
        <div v-for="(url, i) in visiblePhotos" :key="i" class="photo-cell">
          <img :src="url" alt="照片" loading="lazy" @error="onImgError" />
          <span v-if="i === 2 && restCount > 0" class="photo-more">+{{ restCount }}</span>
        </div>
      </div>

      <div v-else class="ticket-mini">
        <component :is="icon" :size="22" :stroke-width="1.6" />
        <span>{{ event.content || '奶茶券' }}</span>
      </div>
    </div>

    <!-- 当前卡片且内容过长时，提示可点开看全文 -->
    <div v-if="current && isText && tooLong" class="more-hint">
      查看全文
      <Maximize2 :size="13" :stroke-width="1.8" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import {
  PenLine,
  BookOpen,
  Images as ImagesIcon,
  Ticket,
  CupSoda,
  Sparkles,
  Maximize2
} from 'lucide-vue-next'
import type { CoupleEvent, Profile } from '../types/domain'
import { actorLabel, ACTION_LABELS, timeLabel } from '../lib/eventLabels'

const props = defineProps<{
  event: CoupleEvent
  me: Profile
  /** 是否为最上层的当前卡片 */
  current: boolean
  /** 由父组件按层叠关系算好的定位样式 */
  pose: CSSProperties
}>()

defineEmits<{ pick: [] }>()

const ICONS = {
  note: PenLine,
  diary: BookOpen,
  photo: ImagesIcon,
  milktea_issue: Ticket,
  milktea_redeem: CupSoda,
  wish: Sparkles
}

const icon = computed(() => ICONS[props.event.type])
const actor = computed(() => actorLabel(props.event.actor_id, props.me.id, props.me.gender))
const action = computed(() => ACTION_LABELS[props.event.type])
const isText = computed(() => ['note', 'diary', 'wish'].includes(props.event.type))

// 照片卡片最多预览 3 张，其余折叠成 +N，点开看全部
const visiblePhotos = computed(() => props.event.photo_urls?.slice(0, 3) ?? [])
const restCount = computed(() => (props.event.photo_urls?.length ?? 0) - visiblePhotos.value.length)

// 超过约 8 行（约 140 字）就折叠，提示点开看全文
const tooLong = computed(() => (props.event.content?.length ?? 0) > 140)

// 相对时间每 20 秒重算一次，保持「刚刚 / 几分钟前」准确
const now = ref(Date.now())
let timer = 0
onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 20000)
})
onUnmounted(() => window.clearInterval(timer))
const time = computed(() => {
  now.value // 建立依赖
  return timeLabel(props.event.created_at)
})

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3ead4"/><g fill="none" stroke="#98663a" stroke-width="2"><rect x="165" y="112" width="70" height="52"/><circle cx="180" cy="128" r="5"/><path d="M165 164 L190 134 L215 164"/></g><text x="200" y="205" font-family="serif" font-size="15" fill="#b3a588" text-anchor="middle">暂无图片</text></svg>`
  )
function onImgError(e: Event) {
  const img = e.currentTarget as HTMLImageElement
  if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER
}
</script>

<style scoped>
.feed-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-w);
  margin: 0;
  display: flex;
  flex-direction: column;
  /* 实底相纸：当前卡片必须完整可读，不再用半透明玻璃 */
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transform-origin: center center;
  transition:
    transform 0.4s cubic-bezier(0.22, 0.8, 0.24, 1),
    opacity 0.3s ease;
  will-change: transform, opacity;
  cursor: pointer;
}

/* 当前卡片：更强阴影，从两侧露边的卡片中脱颖而出 */
.feed-card.current {
  box-shadow: var(--shadow-float);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 14px;
  border-bottom: var(--border-dashed);
}

.head-icon {
  color: var(--caramel);
  flex-shrink: 0;
}

.head-actor {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink);
  white-space: nowrap;
}

.head-time {
  margin-left: auto;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--muted);
  white-space: nowrap;
}

.card-content {
  padding: 14px;
}

.content-text {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.95;
  color: var(--ink-soft);
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.photo-cell {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: var(--border);
  border-radius: var(--r-sm);
  background-color: var(--paper-deep);
}

.photo-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-more {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(43, 37, 29, 0.55);
  color: var(--photo);
  font-family: var(--font-typewriter);
  font-size: var(--fs-md);
}

.ticket-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 16px;
  color: var(--brick);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-base);
}

/* —— 查看全文提示 —— */
.more-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px;
  border-top: var(--border-dashed);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--caramel);
}
</style>

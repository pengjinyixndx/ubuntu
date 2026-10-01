<template>
  <article class="feed-card" :class="{ current }" @click="$emit('pick')">
    <!-- 抬头 -->
    <div class="card-head">
      <component :is="icon" :size="15" :stroke-width="1.7" class="head-icon" />
      <span class="head-actor">{{ actor }} {{ action }}</span>
      <span class="head-time">{{ time }}</span>
    </div>

    <!-- 内容（随类型变化） -->
    <div class="card-content">
      <!-- 照片：整组 -->
      <div v-if="event.type === 'photo'" class="photo-grid">
        <div v-for="(url, i) in visiblePhotos" :key="i" class="photo-cell">
          <img :src="url" alt="照片" loading="lazy" @error="onImgError" />
          <span v-if="i === 2 && restCount > 0" class="photo-more">+{{ restCount }}</span>
        </div>
      </div>

      <!-- 奶茶券 -->
      <div v-else-if="isTicket" class="ticket-mini">
        <component :is="icon" :size="20" :stroke-width="1.6" />
        <span>{{ event.content || '奶茶券' }}</span>
      </div>

      <!-- 喝奶茶（核销） -->
      <div v-else-if="isTea" class="tea">
        <div v-if="teaChips.length" class="chips">
          <span v-for="c in teaChips" :key="c" class="chip">{{ c }}</span>
        </div>
        <p v-if="event.content" class="content-text">{{ event.content }}</p>
      </div>

      <!-- 随笔 / 日记 / 心愿 -->
      <template v-else>
        <div v-if="diaryChips.length" class="chips">
          <span v-for="c in diaryChips" :key="c" class="chip">{{ c }}</span>
        </div>
        <p v-if="event.content" class="content-text">{{ event.content }}</p>
        <!-- 随笔可选带一张随手拍 -->
        <div v-if="singlePhoto" class="note-photo">
          <img :src="singlePhoto" alt="随手拍" loading="lazy" @error="onImgError" />
        </div>
      </template>

      <!-- 照片组的一行说明 -->
      <p v-if="event.type === 'photo' && event.content" class="cap">{{ event.content }}</p>
    </div>

    <!-- 当前卡片且内容过长时，提示可点开看全文 -->
    <div v-if="current && isText && tooLong" class="more-hint">
      查看全文
      <Maximize2 :size="12" :stroke-width="1.8" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
import { actorLabel, ACTION_LABELS, timeLabel, milkteaAction } from '../lib/eventLabels'
import { WEATHERS, MOODS, labelOfKey } from '../lib/options'

const props = defineProps<{
  event: CoupleEvent
  me: Profile
  /** 是否为当前居中的卡片 */
  current: boolean
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
const action = computed(() =>
  props.event.type === 'milktea_redeem'
    ? milkteaAction(props.event.meta?.source)
    : ACTION_LABELS[props.event.type]
)
const isText = computed(() => ['note', 'diary', 'wish'].includes(props.event.type))
const isTicket = computed(() => props.event.type === 'milktea_issue')
const isTea = computed(() => props.event.type === 'milktea_redeem')

// 照片卡片最多预览 3 张，其余折叠成 +N
const visiblePhotos = computed(() => props.event.photo_urls?.slice(0, 3) ?? [])
const restCount = computed(() => (props.event.photo_urls?.length ?? 0) - visiblePhotos.value.length)

// 随笔可选的一张随手拍
const singlePhoto = computed(() =>
  props.event.type === 'note' ? (props.event.photo_urls?.[0] ?? '') : ''
)

// 日记的天气 / 心情
const diaryChips = computed(() => {
  if (props.event.type !== 'diary') return []
  return [
    labelOfKey(WEATHERS, props.event.meta?.weather),
    labelOfKey(MOODS, props.event.meta?.mood)
  ].filter(Boolean)
})

// 核销奶茶的口味 / 甜度
const teaChips = computed(() => {
  if (props.event.type !== 'milktea_redeem') return []
  return [props.event.meta?.flavor, props.event.meta?.sweetness].filter(
    (x): x is string => typeof x === 'string' && !!x
  )
})

// 超过约 80 字就折叠，提示点开看全文
const tooLong = computed(() => (props.event.content?.length ?? 0) > 80)

// 相对时间每 20 秒重算
const now = ref(Date.now())
let timer = 0
onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 20000)
})
onUnmounted(() => window.clearInterval(timer))
const time = computed(() => {
  now.value
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
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.feed-card.current {
  box-shadow: var(--shadow-float);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 13px;
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
  overflow: hidden;
  text-overflow: ellipsis;
}

.head-time {
  margin-left: auto;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--muted);
  white-space: nowrap;
}

.card-content {
  padding: 12px 13px;
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
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* —— 小标签（天气/心情、口味/甜度）—— */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 9px;
}
.chip {
  padding: 3px 9px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--caramel);
  border: 1px solid var(--line);
  border-radius: 999px;
}

/* —— 照片 —— */
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
.cap {
  margin: 9px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--ink-soft);
  text-align: center;
}

/* —— 随笔的一张随手拍 —— */
.note-photo {
  margin-top: 10px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.note-photo img {
  width: 100%;
  max-height: 190px;
  object-fit: cover;
}

.ticket-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 12px;
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
  padding: 8px;
  border-top: var(--border-dashed);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--caramel);
}
</style>

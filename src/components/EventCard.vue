<template>
  <article class="feed-card" :class="`d${Math.min(distance, 2)}`">
    <!-- 抬头：类型图标 · 称呼 动作 · 时间 -->
    <div class="card-head">
      <component :is="icon" :size="16" :stroke-width="1.6" class="head-icon" />
      <span class="head-actor">{{ actor }} · {{ action }}</span>
      <span class="head-time">{{ time }}</span>
    </div>

    <!-- 内容（随类型变化） -->
    <div class="card-content">
      <p v-if="isText" class="content-text">{{ event.content }}</p>

      <div v-else-if="event.type === 'photo'" class="photo-grid">
        <img
          v-for="(url, i) in event.photo_urls"
          :key="i"
          :src="url"
          class="photo-img"
          alt="照片"
        />
      </div>

      <div v-else class="ticket-mini">
        <component :is="icon" :size="20" :stroke-width="1.6" />
        <span>{{ event.content || '奶茶券' }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { PenLine, BookOpen, Images as ImagesIcon, Ticket, CupSoda, Sparkles } from 'lucide-vue-next'
import type { CoupleEvent, Profile } from '../types/domain'
import { actorLabel, ACTION_LABELS, timeLabel } from '../lib/eventLabels'

const props = defineProps<{
  event: CoupleEvent
  me: Profile
  /** 离居中卡片的距离：0 居中、1 相邻、2 更远 */
  distance: number
}>()

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

// 时间每 20 秒重算一次，相对时间（刚刚 / 几分钟前）会自动更新
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
</script>

<style scoped>
.feed-card {
  flex: 0 0 var(--card-w);
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: transform 0.32s ease, opacity 0.32s ease, box-shadow 0.32s ease;
}

/* 居中主卡片：放大、全实、悬浮阴影 */
.feed-card.d0 {
  transform: scale(1);
  opacity: 1;
  box-shadow: var(--shadow-float);
  z-index: 3;
}

/* 相邻卡片：缩小、半透 */
.feed-card.d1 {
  transform: scale(0.9);
  opacity: 0.55;
  box-shadow: var(--shadow-card);
  z-index: 2;
}

/* 更远的卡片：更小、更淡 */
.feed-card.d2 {
  transform: scale(0.84);
  opacity: 0.3;
  box-shadow: none;
  z-index: 1;
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
  -webkit-line-clamp: 9;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
}

.photo-img {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border: var(--border);
  border-radius: var(--r-sm);
}

.ticket-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px;
  color: var(--brick);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-base);
}
</style>

<template>
  <article
    class="feed-card"
    :class="{ current }"
    :style="pose"
    @click="$emit('pick')"
  >
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
import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { PenLine, BookOpen, Images as ImagesIcon, Ticket, CupSoda, Sparkles } from 'lucide-vue-next'
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
  position: absolute;
  top: 46%;
  left: 50%;
  width: var(--card-w);
  margin: 0;
  display: flex;
  flex-direction: column;
  /* 玻璃相纸：半透明暖白，能透出下面堆叠的卡片，同时保留暖调纸感 */
  background-color: rgba(253, 250, 241, 0.5);
  border: var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transform-origin: center center;
  transition: transform 0.45s cubic-bezier(0.22, 0.78, 0.26, 1),
    opacity 0.35s ease;
  will-change: transform, opacity;
  cursor: pointer;
}

/* 最上层当前卡片：更实、更强阴影、毛玻璃，透过它能看到下面堆叠内容 */
.feed-card.current {
  background-color: rgba(253, 250, 241, 0.66);
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(10px) saturate(1.12);
  -webkit-backdrop-filter: blur(10px) saturate(1.12);
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

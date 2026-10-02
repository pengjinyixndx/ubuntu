<template>
  <Teleport to="body">
    <div class="detail-overlay" @click.self="emit('close')">
      <article class="detail-card">
        <!-- 抬头 -->
        <header class="detail-head">
          <component :is="icon" :size="16" :stroke-width="1.7" class="head-icon" />
          <span class="head-actor">{{ actor }} {{ action }}</span>
          <span class="head-time">{{ dateTime }}</span>
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
            <X :size="20" :stroke-width="1.8" />
          </button>
        </header>

        <!-- 正文 -->
        <div class="detail-body">
          <!-- 照片：全部 -->
          <div v-if="event.type === 'photo'" class="detail-photos">
            <img
              v-for="(url, i) in event.photo_urls"
              :key="i"
              :src="url"
              alt="照片"
              loading="lazy"
              @error="onImgError"
            />
          </div>

          <!-- 奶茶券 -->
          <div v-else-if="isTicket" class="ticket-big">
            <component :is="icon" :size="30" :stroke-width="1.4" />
            <p class="ticket-text">{{ event.content || '奶茶券' }}</p>
            <p v-if="issueReason" class="ticket-meta">因：{{ issueReason }}</p>
            <p v-if="issueExpiry" class="ticket-meta">有效期至 {{ issueExpiry }}</p>
          </div>

          <!-- 喝奶茶（那一杯的照片 + 口味） -->
          <div v-else-if="isTea">
            <div v-if="singlePhoto" class="note-photo">
              <img :src="singlePhoto" alt="这一杯" @error="onImgError" />
            </div>
            <div v-if="teaChips.length" class="chips">
              <span v-for="c in teaChips" :key="c" class="chip">{{ c }}</span>
            </div>
            <p v-if="event.content" class="detail-text">{{ event.content }}</p>
          </div>

          <!-- 随笔 / 日记 / 心愿 -->
          <template v-else>
            <div v-if="diaryChips.length" class="chips">
              <span v-for="c in diaryChips" :key="c" class="chip">{{ c }}</span>
            </div>
            <p v-if="event.content" class="detail-text">{{ event.content }}</p>
            <div v-if="singlePhoto" class="note-photo">
              <img :src="singlePhoto" alt="随手拍" @error="onImgError" />
            </div>
            <p v-if="event.type === 'wish' && wantAt" class="wish-when">想在 {{ wantAt }} 完成</p>
          </template>

          <!-- 照片的说明 -->
          <p v-if="event.type === 'photo' && event.content" class="photo-cap">{{ event.content }}</p>
        </div>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  PenLine,
  BookOpen,
  Images as ImagesIcon,
  Ticket,
  CupSoda,
  Sparkles,
  X
} from 'lucide-vue-next'
import type { CoupleEvent, Profile } from '../types/domain'
import { actorLabel, ACTION_LABELS, dateTimeLabel, milkteaAction } from '../lib/eventLabels'
import { WEATHERS, MOODS, labelOfKey } from '../lib/options'

const props = defineProps<{
  event: CoupleEvent
  me: Profile
}>()

const emit = defineEmits<{ close: [] }>()

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
const dateTime = computed(() => dateTimeLabel(props.event.created_at))
const isTicket = computed(() => props.event.type === 'milktea_issue')
const isTea = computed(() => props.event.type === 'milktea_redeem')

const singlePhoto = computed(() =>
  props.event.type === 'note' || props.event.type === 'milktea_redeem'
    ? (props.event.photo_urls?.[0] ?? '')
    : ''
)

const diaryChips = computed(() => {
  if (props.event.type !== 'diary') return []
  return [
    labelOfKey(WEATHERS, props.event.meta?.weather),
    labelOfKey(MOODS, props.event.meta?.mood)
  ].filter(Boolean)
})

const teaChips = computed(() => {
  if (props.event.type !== 'milktea_redeem') return []
  return [props.event.meta?.flavor, props.event.meta?.sweetness].filter(
    (x): x is string => typeof x === 'string' && !!x
  )
})

// 奶茶券的附加说明
const metaText = computed(() => {
  const reason = props.event.meta?.reason
  return typeof reason === 'string' && reason ? reason : ''
})

// 颁发奶茶券：理由与到期时间分开显示
const issueReason = computed(() => (props.event.type === 'milktea_issue' ? metaText.value : ''))
const issueExpiry = computed(() => {
  if (props.event.type !== 'milktea_issue') return ''
  const v = props.event.meta?.expires_at
  if (typeof v !== 'string' || !v) return ''
  const d = new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

// 心愿的完成时间
const wantAt = computed(() => {
  const iso = props.event.meta?.want_at
  if (typeof iso !== 'string' || !iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
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
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(43, 37, 29, 0.55);
  animation: fade-in 0.18s ease;
}

.detail-card {
  width: min(calc(var(--app-w) - 40px), 92vw);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-float);
  overflow: hidden;
  animation: rise-in 0.22s cubic-bezier(0.22, 0.8, 0.24, 1);
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
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
.close-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-left: 4px;
  color: var(--ink-soft);
  border: var(--border);
  border-radius: var(--r-sm);
  background-color: var(--paper);
}

.detail-body {
  overflow-y: auto;
  padding: 16px 16px 20px;
}

.detail-text {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  line-height: 2;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}
.chip {
  padding: 4px 11px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.detail-photos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-photos img {
  width: 100%;
  border: var(--border);
  border-radius: var(--r-sm);
  background-color: var(--paper-deep);
}

.note-photo {
  margin-top: 14px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.note-photo img {
  width: 100%;
}

.photo-cap {
  margin: 12px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--ink-soft);
  text-align: center;
}

.ticket-big {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 16px;
  color: var(--brick);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  text-align: center;
}
.ticket-text {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  color: var(--ink);
}
.ticket-meta {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--muted);
}

.wish-when {
  margin: 14px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
  text-align: center;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

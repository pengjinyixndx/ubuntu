<template>
  <article class="feed-card" :class="{ current, 'has-photo': !!singlePhoto }" @click="$emit('pick')">
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
          <img :src="imgSrcFor(url)" :data-full="url" alt="照片" loading="lazy" decoding="async" @error="onImgFail($event, url)" />
          <span v-if="i === 2 && restCount > 0" class="photo-more">+{{ restCount }}</span>
        </div>
      </div>

      <!-- 奶茶券 -->
      <div v-else-if="isTicket" class="ticket-mini">
        <component :is="icon" :size="20" :stroke-width="1.6" />
        <div class="ticket-body">
          <span class="ticket-title">{{ event.content || '奶茶券' }}</span>
          <span v-if="issueReason" class="ticket-line">因：{{ issueReason }}</span>
          <span v-if="issueExpiry" class="ticket-line">有效期至 {{ issueExpiry }}</span>
        </div>
      </div>

      <!-- 喝奶茶（核销）：那一杯的照片 + 口味 -->
      <div v-else-if="isTea" class="tea">
        <div v-if="teaChips.length" class="chips">
          <span v-for="c in teaChips" :key="c" class="chip">{{ c }}</span>
        </div>
        <p v-if="event.content" class="content-text">{{ event.content }}</p>
        <div v-if="singlePhoto" class="note-photo">
          <img :src="imgSrcFor(singlePhoto)" :data-full="singlePhoto" alt="这一杯" loading="lazy" decoding="async" @error="onImgFail($event, singlePhoto)" />
        </div>
      </div>

      <!-- 亲亲：小螃蟹和银杏叶之间的一颗心 -->
      <div v-else-if="isKiss" class="kiss">
        <div class="kiss-pair">
          <Critter kind="ginkgo" :size="24" class="kiss-leaf" />
          <span class="kiss-heart"><Heart :size="15" :stroke-width="1.6" fill="currentColor" /></span>
          <Critter kind="crab" :size="24" class="kiss-crab" />
        </div>

        <p class="kiss-line">{{ kissLine }}</p>

        <div v-if="kissCount > 0" class="kiss-hearts">
          <Heart
            v-for="n in Math.min(kissCount, 6)"
            :key="n"
            :size="12"
            :stroke-width="1.4"
            fill="currentColor"
          />
          <span v-if="kissCount > 6" class="kiss-more">共 {{ kissCount }} 个</span>
        </div>

        <p v-if="kissReason" class="kiss-reason">{{ kissReason }}</p>

        <div v-if="singlePhoto" class="note-photo">
          <img
            :src="thumbUrlOf(singlePhoto)"
            :data-full="singlePhoto"
            alt="附的照片"
            loading="lazy"
            decoding="async"
            @error="onImageError"
          />
        </div>
      </div>

      <!-- 随笔 / 日记 / 心愿 -->
      <template v-else>
        <div v-if="diaryChips.length" class="chips">
          <span v-for="c in diaryChips" :key="c" class="chip">{{ c }}</span>
        </div>
        <p v-if="event.content" class="content-text">{{ event.content }}</p>
        <!-- 随笔可选带一张随手拍 -->
        <div v-if="singlePhoto" class="note-photo">
          <img :src="imgSrcFor(singlePhoto)" :data-full="singlePhoto" alt="随手拍" loading="lazy" decoding="async" @error="onImgFail($event, singlePhoto)" />
        </div>
      </template>

      <p v-if="beforePause" class="pause-mark">这条是你们暂停之前发的</p>

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
  Heart,
  Maximize2
} from 'lucide-vue-next'
import type { CoupleEvent, Profile } from '../types/domain'
import { actorLabel, ACTION_LABELS, kissAction, timeLabel, milkteaAction } from '../lib/eventLabels'
import { WEATHERS, MOODS, labelOfKey } from '../lib/options'
import Critter from './Critter.vue'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { thumbUrlOf, onImageError, IMAGE_PLACEHOLDER } from '../lib/image'

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
  milktea_request: Ticket,
  wish: Sparkles,
  kiss: Heart
}

const icon = computed(() => ICONS[props.event.type])
const { partnerProfile } = useFeed()
const actor = computed(() =>
  actorLabel(props.event.actor_id, props.me.id, props.me.gender, partnerProfile.value?.id, partnerProfile.value?.gender)
)
const action = computed(() => {
  if (props.event.type === 'milktea_redeem') return milkteaAction(props.event.meta?.source)
  if (props.event.type === 'kiss') return kissAction(props.event.meta)
  return ACTION_LABELS[props.event.type]
})
const isText = computed(() => ['note', 'diary', 'wish'].includes(props.event.type))
const isTicket = computed(() => props.event.type === 'milktea_issue')
const isTea = computed(() => props.event.type === 'milktea_redeem')
const isKiss = computed(() => props.event.type === 'kiss')

/* 图片取不到时**记住**，别再重试。
   以前是改 img.src 兜底，但组件每次重新渲染会把 src 绑回坏地址，
   于是失败—占位—重绑—再失败，一直闪。改成由状态决定显示什么。 */
const failedUrls = ref<string[]>([])
function imgSrcFor(url: string): string {
  if (!url) return IMAGE_PLACEHOLDER
  return failedUrls.value.includes(url) ? IMAGE_PLACEHOLDER : thumbUrlOf(url)
}
function markFailed(url: string): void {
  if (url && !failedUrls.value.includes(url)) failedUrls.value.push(url)
}
/* 缩略图失败先退回原图（一次），原图也失败才用占位 */
function onImgFail(e: Event, url: string): void {
  const img = e.currentTarget as HTMLImageElement
  if (img.dataset.fallback !== '1' && img.src !== url) {
    img.dataset.fallback = '1'
    img.src = url
    return
  }
  markFailed(url)
}

/* 暂停期间、且是对方发的：标一句这是暂停之前发的，不指责只说事实 */
const { needConflictPopup: inPause } = usePetition()
const beforePause = computed(() => inPause.value && props.event.actor_id !== props.me.id)

/* 亲亲这张卡：两个人是定死的（她亲、他收），所以这里写死"小螃蟹" */
const kissKind = computed(() => String(props.event.meta?.kind ?? 'ask'))
const kissCount = computed(() => {
  if (kissKind.value === 'request') return 1
  const n = props.event.meta?.count
  return typeof n === 'number' && n > 0 ? n : 1
})
const kissLine = computed(() => {
  if (kissKind.value === 'granted') return '小螃蟹答应了'
  return kissCount.value > 1 ? `想亲小螃蟹 ${kissCount.value} 下` : '想亲小螃蟹一下'
})
const kissReason = computed(() =>
  kissKind.value === 'request' && props.event.content ? props.event.content : ''
)

// 照片卡片最多预览 3 张，其余折叠成 +N
const visiblePhotos = computed(() => props.event.photo_urls?.slice(0, 3) ?? [])
const restCount = computed(() => (props.event.photo_urls?.length ?? 0) - visiblePhotos.value.length)

// 随笔的随手拍 / 喝奶茶那一杯 / 亲亲请愿附的照片
const singlePhoto = computed(() => {
  const t = props.event.type
  if (t === 'note' || t === 'milktea_redeem' || t === 'kiss') {
    return props.event.photo_urls?.[0] ?? ''
  }
  return ''
})

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

// 颁发奶茶券：理由 + 到期时间，都要在展示流上看得到
const issueReason = computed(() => {
  if (props.event.type !== 'milktea_issue') return ''
  const r = props.event.meta?.reason
  return typeof r === 'string' ? r : ''
})
const issueExpiry = computed(() => {
  if (props.event.type !== 'milktea_issue') return ''
  const v = props.event.meta?.expires_at
  if (typeof v !== 'string' || !v) return ''
  const d = new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
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
  /* 卡片可用高度由首页按 .feed 实际高度算出来，保证挂在枝上也绝不超出底部 */
  max-height: var(--card-max, 260px);
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
  flex-shrink: 0;
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
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
}

.content-text {
  flex: 0 0 auto;
  margin: 0;
  /* 不用 -webkit-line-clamp：Safari 上它和 flex 一起会不停重算，
     表现就是"字多的卡片一直闪"。改成定高 + 溢出裁切，效果一样但不重排。 */
  max-height: 9.75em; /* 1.95 行高 × 5 行 */
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.95;
  color: var(--ink-soft);
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
}

/* 带随手拍时，正文只留 2 行，把版面让给照片 */
.feed-card.has-photo .content-text {
  /* 带照片时正文只留 1 行，多出来的高度全给照片（照片要大） */
  max-height: 1.95em;
}

/* 带照片的卡片撑满可用高度，剩下的空间全给照片 */
.feed-card.has-photo {
  height: var(--card-max, 260px);
}

/* —— 喝奶茶：要让里面的照片也能跟着卡片伸缩 —— */
.tea {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

/* —— 随笔的一张随手拍 ——
   不给它裁切：图片按原比例缩到能放下的最大尺寸，整张贴上去（不裁、不变形）。
   容器是居中弹性盒，图自己按 max-width/max-height 双向收敛。 */
.note-photo {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.note-photo img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: var(--border);
  border-radius: var(--r-sm);
  background-color: var(--paper-deep);
}

.pause-mark {
  margin: 8px 0 0;
  padding-top: 7px;
  border-top: var(--border-dashed);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
}
/* —— 亲亲：两个人之间一颗心 —— */
.kiss {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 2px 0 2px;
}
.kiss-pair {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kiss-leaf {
  color: var(--caramel);
}
.kiss-crab {
  color: var(--brick);
}
.kiss-heart {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--brick);
  background-color: rgba(173, 79, 56, 0.1);
  border-radius: 50%;
  animation: kiss-beat 1.6s ease-in-out infinite;
}
@keyframes kiss-beat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.14); }
}
.kiss-line {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}
.kiss-hearts {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--brick);
}
.kiss-more {
  margin-left: 3px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.kiss-reason {
  margin: 0;
  padding: 8px 11px;
  max-width: 100%;
  background-color: var(--paper);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--ink-soft);
  word-break: break-word;
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
.ticket-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.ticket-title {
  color: var(--brick);
}
.ticket-line {
  font-size: var(--fs-xs);
  line-height: 1.6;
  color: var(--muted);
  word-break: break-word;
}

/* —— 查看全文提示：永远钉在卡片底部，不被内容挤掉 —— */
.more-hint {
  flex-shrink: 0;
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

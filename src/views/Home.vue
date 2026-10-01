<template>
  <div class="home-page">
    <!-- 顶部手绘装饰：螃蟹 爱心 银杏叶 -->
    <TopDecor />

    <!-- 在一起天数（邮票小相纸） -->
    <section class="days-card">
      <span class="tape"></span>
      <div class="inner">
        <div class="days-label">我们在一起已经</div>
        <div class="days-main">
          <span class="days-num">{{ days }}</span>
          <span class="days-unit">天</span>
        </div>
        <div class="days-since">SINCE&nbsp;2026.06.24</div>
        <div class="blessing">
          <p class="blessing-text">{{ blessing.text }}</p>
          <p class="blessing-source">—— {{ blessing.source }}</p>
        </div>
      </div>
    </section>

    <!-- 分隔 -->
    <div class="divider">
      <span class="divider-line"></span>
      <span class="divider-text">时光记录</span>
      <span class="divider-line"></span>
    </div>

    <!-- 首次加载骨架 -->
    <section v-if="loading && !events.length" class="feed">
      <div class="skeleton-card">
        <div class="sk-line w40"></div>
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
        <div class="sk-line short"></div>
      </div>
    </section>

    <!-- 树枝 + 悬挂卡片：当前居中，两侧露边，左滑看更早 -->
    <section
      v-else-if="events.length && myProfile"
      ref="feedRef"
      class="feed"
      :class="{ dragging: isDragging }"
      :style="feedStyle"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @wheel="onWheel"
    >
      <!-- 手绘树枝（横贯顶部） -->
      <svg class="branch" viewBox="0 0 390 70" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M -5 44 C 70 30, 150 50, 235 44 C 300 40, 350 32, 395 42"
          stroke="#98663a"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
        <path d="M 120 40 C 132 30, 148 26, 168 22" stroke="#98663a" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 305 40 C 314 32, 326 28, 342 25" stroke="#98663a" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 168 22 Q 162 13 168 7 Q 174 13 168 22 Z" fill="#98663a" opacity="0.85" />
        <path d="M 342 25 Q 337 17 342 11 Q 347 17 342 25 Z" fill="#98663a" opacity="0.85" />
        <path d="M 28 40 Q 23 33 28 27 Q 33 33 28 40 Z" fill="#c3a06a" opacity="0.8" />
        <path d="M 262 42 Q 257 35 262 29 Q 267 35 262 42 Z" fill="#c3a06a" opacity="0.8" />
      </svg>

      <!-- 每张卡片从枝上垂下 -->
      <div v-for="(ev, i) in events" :key="ev.id" class="hanger" :style="hangerPose(i)">
        <svg class="stem" viewBox="0 0 30 110" width="30" height="110" aria-hidden="true">
          <path :d="stemPath(i)" stroke="#98663a" stroke-width="2" fill="none" stroke-linecap="round" />
          <circle cx="15" cy="3" r="2.6" fill="#98663a" />
        </svg>
        <EventCard :event="ev" :me="myProfile" :current="i === activeIndex" @pick="onPick(i)" />
      </div>

      <!-- 位置指示 -->
      <div class="indicator"><b>{{ activeIndex + 1 }}</b>&nbsp;/&nbsp;{{ events.length }}</div>
    </section>

    <!-- 空状态 -->
    <section v-else class="feed">
      <div class="feed-empty">
        <PenLine :size="34" :stroke-width="1.2" class="empty-icon" />
        <span class="empty-text">还没有记录，去「记录」写下第一条吧</span>
      </div>
    </section>

    <!-- 点开看全文 -->
    <EventDetail v-if="detailEvent && myProfile" :event="detailEvent" :me="myProfile" @close="detailEvent = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { PenLine } from 'lucide-vue-next'
import TopDecor from '../components/TopDecor.vue'
import EventCard from '../components/EventCard.vue'
import EventDetail from '../components/EventDetail.vue'
import { getTogetherDays } from '../composables/useTogether'
import { getDailyBlessing } from '../composables/useDailyBlessing'
import { useFeed } from '../composables/useFeed'
import type { CoupleEvent } from '../types/domain'

const days = getTogetherDays()
const blessing = getDailyBlessing()

const { events, myProfile, loading, loadEvents } = useFeed()

const feedRef = ref<HTMLElement | null>(null)
const W = ref(390)
// 卡片可用高度：由 .feed 的实际高度算出来，交给卡片当 max-height，防止带照片的卡被底部切掉
const cardMax = ref(260)
// 当前居中卡片的下标（events 最新在前，0 = 最新）
const activeIndex = ref(0)
const dragDx = ref(0)
const isDragging = ref(false)
const detailEvent = ref<CoupleEvent | null>(null)

function measure() {
  if (!feedRef.value) return
  W.value = feedRef.value.clientWidth
  // 树枝下沿 44 + 垂茎 110 + 底部留白 10
  cardMax.value = Math.max(150, feedRef.value.clientHeight - 44 - 110 - 10)
}

const feedStyle = computed(() => {
  const s: Record<string, string> = { '--card-max': `${cardMax.value}px` }
  return s as CSSProperties
})

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// 相邻卡片中心间距（约 0.29W，两侧各露约 70px）
const step = computed(() => W.value * 0.29)

/**
 * 第 i 张卡片的悬挂姿态。
 * d<0 更新（在左），d>0 更早（在右）。只保留当前 + 左右各一张，其余淡出。
 */
function hangerPose(i: number): CSSProperties {
  const d = i - activeIndex.value
  const abs = Math.abs(d)
  const x = d * step.value + dragDx.value
  const scale = abs === 0 ? 1 : abs === 1 ? 0.64 : 0.5
  const rot = abs === 0 ? 0 : d < 0 ? -4 : 4
  return {
    transform: `translateX(${x}px) rotate(${rot}deg) scale(${scale})`,
    opacity: abs === 0 ? 1 : abs === 1 ? 0.62 : 0,
    zIndex: 20 - abs,
    pointerEvents: abs <= 1 ? undefined : 'none'
  }
}

// 垂茎用轻微 S 曲线，偶数/奇数张方向相反，显得更自然（不像一根直线）
function stemPath(i: number): string {
  return i % 2 === 0 ? 'M15 2 C 7 32, 23 76, 15 106' : 'M15 2 C 23 32, 7 76, 15 106'
}

function goTo(i: number) {
  activeIndex.value = clamp(i, 0, events.value.length - 1)
}
function prev() {
  goTo(activeIndex.value - 1)
}
function next() {
  goTo(activeIndex.value + 1)
}

/** 点卡片：当前卡片打开全文；两侧露边的卡片先挪到中间 */
function onPick(i: number) {
  if (i === activeIndex.value) {
    detailEvent.value = events.value[i] ?? null
  } else {
    goTo(i)
  }
}

// —— 触摸：卡片跟手，抬手吸附。手指左滑 = 往前 = 看更早 ——
let startX = 0
let lastX = 0
let lastT = 0
let velocity = 0

function onTouchStart(e: TouchEvent) {
  const x = e.touches[0]?.clientX ?? 0
  startX = x
  lastX = x
  lastT = Date.now()
  velocity = 0
  dragDx.value = 0
  isDragging.value = true
}

function onTouchMove(e: TouchEvent) {
  const x = e.touches[0]?.clientX ?? 0
  const now = Date.now()
  const dt = now - lastT
  if (dt > 0) velocity = (x - lastX) / dt
  lastX = x
  lastT = now
  dragDx.value = x - startX
}

function onTouchEnd() {
  isDragging.value = false
  const dist = dragDx.value
  const fast = Math.abs(velocity) > 0.5
  const shouldFlip = Math.abs(dist) > W.value * 0.12 || (fast && Math.abs(dist) > 8)

  let delta = 0
  if (shouldFlip) delta = dist < 0 ? 1 : -1

  goTo(activeIndex.value + delta)
  dragDx.value = 0
  velocity = 0
}

// PC 触摸板 / 鼠标横向滚动切换（带节流）
let lastWheel = 0
function onWheel(e: WheelEvent) {
  const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
  if (Math.abs(delta) < 10) return
  const now = Date.now()
  if (now - lastWheel < 320) return
  lastWheel = now
  if (delta < 0) next()
  else prev()
}

onMounted(async () => {
  measure()
  window.addEventListener('resize', measure)
  await loadEvents()
  await nextTick()
  measure() // 卡片渲染出来之后再量一次，此时 .feed 才有真实高度
  activeIndex.value = 0
})

onUnmounted(() => window.removeEventListener('resize', measure))
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* 首页固定一屏，不上下滚动 */
  padding: calc(12px + env(safe-area-inset-top)) 20px 0;
}

/* —— 天数邮票卡片 —— */
.days-card {
  position: relative;
  max-width: 320px;
  margin: 14px auto 0;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}

.tape {
  position: absolute;
  top: -11px;
  left: 50%;
  width: 58px;
  height: 20px;
  transform: translateX(-50%) rotate(-3deg);
  background-color: var(--tape);
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 6px,
    rgba(255, 255, 255, 0.35) 6px,
    rgba(255, 255, 255, 0.35) 12px
  );
}

.inner {
  margin: 10px;
  padding: 16px 16px 14px;
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  text-align: center;
}

.days-label {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 3px;
  color: var(--muted);
}

.days-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin: 6px 0;
}

.days-num {
  font-family: var(--font-serif);
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
}

.days-unit {
  font-family: var(--font-song);
  font-size: var(--fs-md);
  color: var(--ink-soft);
}

.days-since {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--caramel);
}

/* —— 每日祝福 —— */
.blessing {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.blessing-text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--ink-soft);
}

.blessing-source {
  margin: 4px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 0.5px;
  color: var(--faint);
}

/* —— 分隔 —— */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 0;
}

.divider-line {
  flex: 1;
  border-top: 1px dashed var(--line-strong);
}

.divider-text {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 3px;
  color: var(--muted);
}

/* —— 树枝 + 悬挂卡片容器 —— */
.feed {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0 -20px;
  touch-action: pan-y;
  overflow: hidden;
}

.branch {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 70px;
  pointer-events: none;
}

/* 每张卡片：从枝上垂下，可左右滑动 */
.hanger {
  position: absolute;
  top: 44px;
  left: 50%;
  width: var(--card-w);
  margin-left: calc(var(--card-w) * -0.5);
  transform-origin: top center;
  transition:
    transform 0.42s cubic-bezier(0.22, 0.8, 0.24, 1),
    opacity 0.3s ease;
  will-change: transform, opacity;
}

/* 拖动中禁用过渡，卡片才跟手；松手后再平滑吸附 */
.feed.dragging .hanger {
  transition: none;
}

.stem {
  display: block;
  margin: 0 auto;
}

/* —— 位置指示 —— */
.indicator {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.indicator b {
  font-size: var(--fs-md);
  color: var(--caramel);
  font-weight: 700;
}

/* —— 加载骨架 —— */
.skeleton-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-w);
  padding: 18px 16px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  transform: translate(-50%, -50%);
}

.sk-line {
  height: 14px;
  margin-bottom: 16px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(180, 150, 100, 0.12) 25%,
    rgba(180, 150, 100, 0.26) 37%,
    rgba(180, 150, 100, 0.12) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.sk-line.w40 {
  width: 40%;
}

.sk-line.short {
  width: 72%;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}

/* —— 空状态 —— */
.feed-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 16px;
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  transform: translate(-50%, -50%);
}

.empty-icon {
  color: var(--faint);
}

.empty-text {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--faint);
  text-align: center;
}
</style>

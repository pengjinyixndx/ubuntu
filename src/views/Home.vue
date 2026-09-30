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
    <section v-if="loading && !events.length" class="deck">
      <div class="skeleton-card">
        <div class="sk-line w40"></div>
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
        <div class="sk-line short"></div>
      </div>
    </section>

    <!-- 横向轮播：当前最新居中，更早的露边排在右侧，左滑看更早 -->
    <section
      v-else-if="events.length && myProfile"
      ref="deckRef"
      class="deck"
      :class="{ dragging: isDragging }"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @wheel="onWheel"
    >
      <EventCard
        v-for="(ev, i) in events"
        :key="ev.id"
        :event="ev"
        :me="myProfile"
        :current="i === activeIndex"
        :pose="poseFor(i)"
        @pick="onPick(i)"
      />

      <!-- 位置指示：第 N / M 条 -->
      <div class="deck-indicator">
        <span class="indicator-num">{{ activeIndex + 1 }}</span>
        <span class="indicator-slash">/</span>
        <span class="indicator-total">{{ events.length }}</span>
      </div>
    </section>

    <!-- 空状态 -->
    <section v-else class="deck">
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
import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
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

const deckRef = ref<HTMLElement | null>(null)
const W = ref(390)
// 当前居中卡片的下标（events 是最新在前，0 = 最新）
const activeIndex = ref(0)
// 手指拖动时的实时横向偏移（整条卡片带跟手）
const dragDx = ref(0)
const isDragging = ref(false)
// 点开的详情事件
const detailEvent = ref<CoupleEvent | null>(null)

function measure() {
  if (deckRef.value) W.value = deckRef.value.clientWidth
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * 相邻卡片中心间距。卡片宽 0.74W、间距 0.66W 时，左右各露出约 0.13W 的「待展示」边缘。
 */
const step = computed(() => W.value * 0.66)

/**
 * 第 i 张卡片相对当前卡片的姿态。
 * d<0 更新（在左），d>0 更早（在右）。只保留当前 + 左右各一张可见，其余淡出。
 */
function poseFor(i: number): CSSProperties {
  const d = i - activeIndex.value
  const abs = Math.abs(d)
  const X = d * step.value + dragDx.value

  const opacity = abs === 0 ? 1 : abs === 1 ? 0.55 : 0
  const scale = abs === 0 ? 1 : abs === 1 ? 0.93 : 0.88

  return {
    transform: `translate(-50%, -50%) translateX(${X}px) scale(${scale})`,
    opacity,
    zIndex: 20 - abs,
    pointerEvents: abs <= 1 ? undefined : 'none'
  }
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

// —— 触摸：卡片跟手，抬手吸附。左滑（手指向左）看更早，右滑看更新 ——
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
  // 固定从最新开始
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
  margin: 16px auto 0;
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
  padding: 18px 16px 16px;
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
  margin: 8px 0;
}

.days-num {
  font-family: var(--font-serif);
  font-size: 60px;
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
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.blessing-text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: 1.75;
  color: var(--ink-soft);
}

.blessing-source {
  margin: 5px 0 0;
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
  margin: 22px 0 14px;
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

/* —— 轮播容器 —— */
.deck {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0 -20px;
  touch-action: pan-y;
  overflow: hidden;
}

/* 拖动中禁用过渡，卡片才跟手；松手后再平滑吸附 */
.deck.dragging :deep(.feed-card) {
  transition: none;
}

/* —— 位置指示 —— */
.deck-indicator {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-typewriter);
  color: var(--faint);
}
.indicator-num {
  font-size: var(--fs-md);
  color: var(--caramel);
}
.indicator-slash {
  font-size: var(--fs-xs);
}
.indicator-total {
  font-size: var(--fs-xs);
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

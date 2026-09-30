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

    <!-- 堆叠卡片：最新在最上层，更早的在左侧层层叠放 -->
    <section
      v-else-if="events.length && myProfile"
      ref="deckRef"
      class="deck"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @wheel="onWheel"
    >
      <EventCard
        v-for="(ev, i) in orderedEvents"
        :key="ev.id"
        :event="ev"
        :me="myProfile"
        :current="i === activeIndex"
        :pose="poseFor(i)"
        @pick="jumpTo(i)"
      />
    </section>

    <!-- 空状态 -->
    <section v-else class="deck">
      <div class="feed-empty">
        <PenLine :size="34" :stroke-width="1.2" class="empty-icon" />
        <span class="empty-text">还没有记录，去「记录」写下第一条吧</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { PenLine } from 'lucide-vue-next'
import TopDecor from '../components/TopDecor.vue'
import EventCard from '../components/EventCard.vue'
import { getTogetherDays } from '../composables/useTogether'
import { getDailyBlessing } from '../composables/useDailyBlessing'
import { useFeed } from '../composables/useFeed'

// 内置起始日动态计算
const days = getTogetherDays()
// 每天轮换一句祝福
const blessing = getDailyBlessing()

const { events, myProfile, loading, loadEvents } = useFeed()

// 视觉上按时间正序：最左最早、最右最新
const orderedEvents = computed(() => [...events.value].reverse())

const deckRef = ref<HTMLElement | null>(null)
const W = ref(480)
// 当前最上层卡片的下标，默认停在最新一张
const activeIndex = ref(0)

function measure() {
  if (deckRef.value) W.value = deckRef.value.clientWidth
}

/**
 * 计算第 i 张卡片相对当前卡片的层叠姿态。
 * d<0 更早（堆在左），d>0 更新（在右）。
 */
function poseFor(i: number): CSSProperties {
  const d = i - activeIndex.value
  const abs = Math.abs(d)
  const sign = d < 0 ? -1 : 1

  if (abs >= 3) {
    return {
      transform: `translate(-50%, -50%) translateX(${sign * 0.24 * W.value}px) scale(0.86)`,
      opacity: 0,
      zIndex: 1,
      pointerEvents: 'none'
    }
  }

  const X = (([0, 0.1265, 0.203] as const)[abs] ?? 0) * W.value
  const scale = ([1, 0.95, 0.9] as const)[abs] ?? 1
  const opacity = ([1, 0.96, 0.6] as const)[abs] ?? 1

  return {
    transform: `translate(-50%, -50%) translateX(${sign * X}px) scale(${scale})`,
    opacity,
    zIndex: 20 - abs
  }
}

function jumpTo(i: number) {
  activeIndex.value = i
}
function prev() {
  activeIndex.value = Math.max(0, activeIndex.value - 1)
}
function next() {
  activeIndex.value = Math.min(orderedEvents.value.length - 1, activeIndex.value + 1)
}

// 触摸：手指向右滑 -> 看左边更早；向左滑 -> 看右边更新
let touchX = 0
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0]?.clientX ?? 0
}
function onTouchEnd(e: TouchEvent) {
  const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX
  if (Math.abs(dx) < 40) return
  if (dx > 0) prev()
  else next()
}

// PC 触摸板/鼠标横向滚动切换（带节流）
let lastWheel = 0
function onWheel(e: WheelEvent) {
  const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0)
  if (Math.abs(delta) < 12) return
  const now = Date.now()
  if (now - lastWheel < 350) return
  lastWheel = now
  if (delta > 0) next()
  else prev()
}

onMounted(async () => {
  measure()
  window.addEventListener('resize', measure)
  await loadEvents()
  activeIndex.value = Math.max(0, orderedEvents.value.length - 1)
})

onUnmounted(() => window.removeEventListener('resize', measure))
</script>

<style scoped>
.home-page {
  padding: calc(16px + env(safe-area-inset-top)) 20px 24px;
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
  margin: 26px 0 18px;
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

/* —— 堆叠卡片容器 —— */
.deck {
  position: relative;
  height: 392px;
  margin: 0 -20px;
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

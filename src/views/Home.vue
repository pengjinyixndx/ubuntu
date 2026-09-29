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

    <!-- 横向卡片流：最新卡片居中，左右露出相邻卡片 -->
    <section
      v-if="myProfile && (events.length || loading)"
      ref="deckRef"
      class="feed-deck"
      @scroll.passive="onScroll"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
    >
      <!-- 首次加载骨架 -->
      <div v-if="loading && !events.length" class="skeleton-card">
        <div class="sk-line w40"></div>
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
        <div class="sk-line short"></div>
      </div>

      <EventCard
        v-for="(ev, i) in events"
        :key="ev.id"
        :event="ev"
        :me="myProfile"
        :distance="Math.abs(i - activeIndex)"
      />
    </section>

    <!-- 空状态 -->
    <section v-else-if="!loading" class="feed-empty">
      <PenLine :size="34" :stroke-width="1.2" class="empty-icon" />
      <span class="empty-text">还没有记录，去「记录」写下第一条吧</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
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

// 动态流
const { events, myProfile, loading, loadEvents } = useFeed()

const deckRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

// 每张卡片（含间距）的步长，用于根据 scrollLeft 反推居中卡片
function stepPx(): number {
  const el = deckRef.value
  const card = el?.querySelector('.feed-card') as HTMLElement | null
  if (!el || !card) return 1
  return card.offsetWidth + 12 // 与 --card-gap 一致
}

function onScroll() {
  const el = deckRef.value
  if (!el) return
  activeIndex.value = Math.max(0, Math.round(el.scrollLeft / stepPx()))
}

// PC 端鼠标按住拖拽（真机触摸由浏览器原生处理）
let dragging = false
let startX = 0
let startScroll = 0
function onDown(e: PointerEvent) {
  const el = deckRef.value
  if (!el || e.pointerType !== 'mouse') return
  dragging = true
  startX = e.pageX
  startScroll = el.scrollLeft
}
function onMove(e: PointerEvent) {
  const el = deckRef.value
  if (!dragging || !el || e.pointerType !== 'mouse') return
  el.scrollLeft = startScroll - (e.pageX - startX)
}
function onUp() {
  dragging = false
}

onMounted(async () => {
  await loadEvents()
  await nextTick()
  activeIndex.value = 0
  if (deckRef.value) deckRef.value.scrollLeft = 0
})
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
  left:50%;
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
  margin: 26px 0 22px;
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

/* —— 横向卡片流 —— */
.feed-deck {
  display: flex;
  gap: var(--card-gap);
  margin: 0 -20px; /* 延伸到手机列边缘，露边更自然 */
  padding: 10px calc((var(--app-w) - var(--card-w)) / 2) 22px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  cursor: grab;
}

.feed-deck:active {
  cursor: grabbing;
}

.feed-deck::-webkit-scrollbar {
  display: none;
}

/* —— 首次加载骨架 —— */
.skeleton-card {
  flex: 0 0 var(--card-w);
  scroll-snap-align: center;
  padding: 18px 16px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 46px 20px;
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}

.empty-icon {
  color: var(--faint);
}

.empty-text {
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  letter-spacing: 1px;
  color: var(--faint);
}
</style>

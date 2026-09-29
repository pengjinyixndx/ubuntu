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
    <section v-if="myProfile && events.length" class="feed-deck">
      <EventCard
        v-for="ev in events"
        :key="ev.id"
        :event="ev"
        :me="myProfile"
      />
    </section>

    <!-- 空状态 -->
    <section v-else class="feed-empty">
      <PenLine :size="34" :stroke-width="1.2" class="empty-icon" />
      <span class="empty-text">还没有记录，去「记录」写下第一条吧</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PenLine } from 'lucide-vue-next'
import TopDecor from '../components/TopDecor.vue'
import EventCard from '../components/EventCard.vue'
import { getTogetherDays } from '../composables/useTogether'
import { getDailyBlessing } from '../composables/useDailyBlessing'
import { useFeed } from '../composables/useFeed'

// 内置起始日动态计算，当前应为第 98 天
const days = getTogetherDays()
// 每天轮换一句祝福
const blessing = getDailyBlessing()

// 动态流：每次进入首页重新拉取，保证看到最新内容
const { events, myProfile, loadEvents } = useFeed()
onMounted(loadEvents)
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
  margin: 8px 0 8px;
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
  gap: 12px;
  margin: 0 -20px; /* 延伸到屏幕边缘，露边更自然 */
  padding: 6px 11% 20px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.feed-deck::-webkit-scrollbar {
  display: none;
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

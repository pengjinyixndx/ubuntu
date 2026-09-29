<template>
  <div class="home-page">
    <!-- 顶部纪念日卡片 -->
    <div class="anniversary-card">
      <div class="card-bg"></div>
      <div class="card-content">
        <div class="day-count">
          <span class="number">{{ togetherDays }}</span>
          <span class="unit">天</span>
        </div>
        <div class="card-title">我们在一起已经</div>
      </div>
    </div>

    <!-- 时光线标题 -->
    <div class="timeline-header">
      <span class="line"></span>
      <span class="text">时光记录</span>
      <span class="line"></span>
    </div>

    <!-- 时光线列表 -->
    <div class="timeline-list">
      <div
        v-for="(item, index) in timelineList"
        :key="index"
        class="timeline-item"
      >
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="card-time">{{ item.time }}</div>
          <div class="card-content-text">{{ item.content }}</div>
          <div v-if="item.image" class="card-image">
            <img :src="item.image" alt="" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const togetherDays = ref(1) // 在一起的天数，后面接真实数据

const timelineList = ref([
  {
    time: '2026-09-29 14:30',
    content: '今天把我们的小网站做好啦！🎉',
    image: ''
  },
  {
    time: '2026-09-28 20:15',
    content: '一起吃了火锅，超开心～',
    image: ''
  }
])

onMounted(() => {
  // 后面在这里加载时光线数据
})
</script>

<style scoped>
.home-page {
  padding: 16px;
}

/* 纪念日卡片 */
.anniversary-card {
  position: relative;
  height: 120px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  color: #fff;
}

.card-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.day-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.day-count .number {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.day-count .unit {
  font-size: 14px;
}

.card-title {
  font-size: 14px;
  opacity: 0.9;
}

/* 时光线标题 */
.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.timeline-header .line {
  flex: 1;
  height: 1px;
  background-color: #e8e8e8;
}

.timeline-header .text {
  font-size: 14px;
  color: #999;
}

/* 时光线列表 */
.timeline-list {
  position: relative;
  padding-left: 20px;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #ffd6e0;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 8px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #ff6b9d;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #ffd6e0;
}

.timeline-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-time {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.card-content-text {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
}

.card-image {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  display: block;
}
</style>

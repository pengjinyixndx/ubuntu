<template>
  <div class="main-layout">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <span class="title">{{ currentTitle }}</span>
    </header>

    <!-- 页面内容区 -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部导航栏 -->
    <nav class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: route.path === tab.path }"
        @click="switchTab(tab.path)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-text">{{ tab.name }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: '首页', path: '/home', icon: '🏠' },
  { name: '日记', path: '/diary', icon: '📝' },
  { name: '相册', path: '/album', icon: '🖼️' },
  { name: '我的', path: '/profile', icon: '👤' }
]

const currentTitle = computed(() => {
  return route.meta.title as string || '双人空间'
})

const switchTab = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
}

.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px;
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #999;
  font-size: 12px;
  transition: color 0.2s;
}

.tab-item.active {
  color: #ff6b9d;
}

.tab-icon {
  font-size: 22px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

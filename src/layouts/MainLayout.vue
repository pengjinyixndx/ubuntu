<template>
  <div class="main-layout">
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
        <component :is="tab.icon" :size="23" :stroke-width="1.5" class="tab-icon" />
        <span class="tab-text">{{ tab.name }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Home, NotebookPen, Images, User } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: '首页', path: '/home', icon: Home },
  { name: '日记', path: '/diary', icon: NotebookPen },
  { name: '相册', path: '/album', icon: Images },
  { name: '我的', path: '/profile', icon: User }
]

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
}
@supports (height: 100dvh) {
  .main-layout {
    height: 100dvh;
  }
}

/* —— 内容区 —— */
.content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}

/* —— 底部导航 —— */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--tabbar-h);
  display: flex;
  background-color: var(--paper);
  border-top: var(--border-strong);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--muted);
  transition: color 0.2s ease;
}

.tab-icon {
  stroke-width: 1.5;
}

.tab-text {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
}

.tab-item.active {
  color: var(--caramel);
}

/* —— 页面淡入淡出 —— */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

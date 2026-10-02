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

    <!-- 吵架期间：每次打开都会弹出两份矛盾记录 -->
    <ConflictPopup v-if="showConflict" @done="showConflict = false" />

    <!-- 她递了亲亲请愿：直接在他当前页之上弹出来问 -->
    <KissAskModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, PenLine, HeartHandshake, User } from 'lucide-vue-next'
import { usePetition } from '../composables/usePetition'
import ConflictPopup from '../components/ConflictPopup.vue'
import KissAskModal from '../components/KissAskModal.vue'

const route = useRoute()
const router = useRouter()

const { needConflictPopup, loadPetition } = usePetition()
const showConflict = ref(false)

const tabs = [
  { name: '首页', path: '/home', icon: Home },
  { name: '记录', path: '/record', icon: PenLine },
  { name: '请愿', path: '/petition', icon: HeartHandshake },
  { name: '我的', path: '/profile', icon: User }
]

const switchTab = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}

onMounted(async () => {
  // 每次打开青桃都自查一次：还在吵架期间就弹出来
  await loadPetition()
  if (needConflictPopup.value) showConflict.value = true
})
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: var(--app-w);
  margin: 0 auto;
  position: relative;
  overflow: hidden; /* 外层固定，绝不随 body 滚动，像 app 一样 */
  background-color: var(--paper);
  border-left: 1px solid var(--line-strong);
  border-right: 1px solid var(--line-strong);
}
@supports (height: 100dvh) {
  .main-layout {
    height: 100dvh;
  }
}

/* —— 内容区：内部独立滚动，外层不滚 —— */
.content {
  flex: 1 1 auto;
  min-height: 0; /* 允许收缩，overflow 才能真正生效 */
  overflow-y: auto;
  overscroll-behavior: contain; /* 滚到边缘不把滚动传给外层 */
  -webkit-overflow-scrolling: touch;
}

/* —— 底部导航：作为 flex 底部项固定，不被内容遮挡、点击稳定 —— */
.tab-bar {
  position: relative;
  z-index: 10;
  flex: 0 0 auto;
  width: 100%;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
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

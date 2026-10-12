<template>
  <div class="main-layout">
    <!-- 暂停：两个小家伙之间那条线是断的，点它就是和好入口 -->
    <button v-if="inPause" type="button" class="pause-bar" @click="showPause = true">
      <Critter kind="crab" :size="17" class="pb-face" />
      <span class="pb-line"></span>
      <Critter kind="ginkgo" :size="17" class="pb-face" />
      <span class="pb-text">{{ pauseSince }} 起暂停</span>
    </button>

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

    <!-- 和好入口（暂停中随时可以点开；不再是简单弹窗） -->
    <PauseSheet v-if="showPause" @close="showPause = false" @done="showPause = false" />

    <!-- 有新动静时的轻提示 -->
    <transition name="toast">
      <div v-if="notice" class="toast">{{ notice }}</div>
    </transition>

    <!-- 她递了亲亲请愿：直接在他当前页之上弹出来问 -->
    <KissAskModal />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, PenLine, HeartHandshake, User } from 'lucide-vue-next'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { subscribeChanges } from '../lib/realtime'
import { USE_MOCK } from '../lib/dataSource'
import PauseSheet from '../components/PauseSheet.vue'
import Critter from '../components/Critter.vue'
import { dateTimeLabel } from '../lib/eventLabels'
import KissAskModal from '../components/KissAskModal.vue'

const route = useRoute()
const router = useRouter()

const { needConflictPopup, openConflict, loadPetition } = usePetition()

/* 一份矛盾里：两份都写完的那一刻（status 变成 active）就要弹，
   不能只在打开 App 时才检查。同一个会话里处理过就不再反复弹。 */
const shownConflicts = ref<string[]>([])
/** 暂停中：到处都能点开和好入口 */
const showPause = ref(false)
const inPause = computed(() => needConflictPopup.value)
const pauseSince = computed(() =>
  openConflict.value ? dateTimeLabel(openConflict.value.created_at) : ''
)
watch(
  needConflictPopup,
  (need) => {
    const c = openConflict.value
    if (!need || !c || shownConflicts.value.includes(c.id)) return
    shownConflicts.value.push(c.id)
    showPause.value = true
  },
  { immediate: true }
)
const { loadEvents, lastLocalWriteAt } = useFeed()
let unsub: (() => void) | null = null

/* 轻提示：有新动静时在底部飘一下，2.6 秒自己消失 */
const notice = ref('')
let noticeTimer = 0
function flash(text: string, ms = 2600) {
  notice.value = text
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
  }, ms)
}


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
  await loadPetition()

  // 实时：对方一发东西，这边立刻刷新（不用等他自己刷新）
  unsub = subscribeChanges({
    // 真的有人动了数据：刷新 + 提示（但自己刚发完的那 6 秒内不提示）
    onChange: () => {
      if (Date.now() - lastLocalWriteAt() > 6000) flash('有新的动静，已经刷新')
      void loadEvents()
      void loadPetition()
    },
    // 兜底轮询：只是怕实时断了，安静地刷新，不要弹提示
    onPoll: () => {
      void loadEvents()
      void loadPetition()
    }
  })

  // 本地演示没有服务端，留个钩子方便自己看提示效果：__qtToast('文案')
  if (USE_MOCK) {
    ;(window as unknown as { __qtToast?: typeof flash }).__qtToast = flash
  }
})

onUnmounted(() => {
  unsub?.()
  window.clearTimeout(noticeTimer)
})
</script>

<style scoped>
/* —— 暂停：那条断线 —— */
.pause-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 16px;
  background-color: var(--photo);
  border: none;
  border-bottom: 1px solid var(--line-strong);
  cursor: pointer;
}
.pb-face {
  color: var(--caramel);
  flex-shrink: 0;
}
.pb-line {
  width: 26px;
  height: 2px;
  flex-shrink: 0;
  background-image: linear-gradient(
    to right,
    var(--line-strong) 0 5px,
    transparent 5px 9px,
    var(--line-strong) 9px 14px,
    transparent 14px 18px,
    var(--line-strong) 18px 26px
  );
}
.pb-text {
  margin-left: auto;
  font-family: var(--font-typewriter);
  font-size: 10.5px;
  color: var(--muted);
}

.toast {
  position: absolute;
  left: 50%;
  bottom: calc(80px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 420;
  max-width: 80%;
  padding: 9px 16px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 0.5px;
  color: var(--photo);
  background-color: rgba(43, 37, 29, 0.88);
  border-radius: var(--r-sm);
  white-space: nowrap;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
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

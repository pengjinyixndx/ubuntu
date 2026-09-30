<template>
  <Teleport to="body">
    <div class="flash">
      <div class="flash-inner">
        <!-- 小相纸 + 红印章 -->
        <div class="flash-card" :class="{ tremble: type === 'note' }">
          <component :is="icon" :size="30" :stroke-width="1.4" class="flash-icon" />
          <span class="flash-stamp">{{ stampChar }}</span>
          <span v-if="type === 'photo'" class="flash-dev"></span>
        </div>

        <!-- 奶茶：两缕热气 -->
        <div v-if="type === 'milktea'" class="flash-steam" aria-hidden="true">
          <i></i><i></i>
        </div>

        <div class="flash-text">{{ doneText }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { PenLine, BookOpen, Images as ImagesIcon, CupSoda, Ticket, Sparkles } from 'lucide-vue-next'
import type { EventType } from '../types/domain'

const props = defineProps<{ type: EventType }>()
const emit = defineEmits<{ done: [] }>()

const ICONS = {
  note: PenLine,
  diary: BookOpen,
  photo: ImagesIcon,
  milktea: CupSoda,
  milktea_issue: Ticket,
  milktea_redeem: CupSoda,
  wish: Sparkles
}

// 印章里的字 + 下方文案，按类型不同
const MAP: Record<EventType, { stamp: string; text: string }> = {
  note: { stamp: '寄', text: '已寄出' },
  diary: { stamp: '录', text: '已收录' },
  photo: { stamp: '印', text: '已冲印' },
  milktea: { stamp: '甜', text: '已记下' },
  milktea_issue: { stamp: '券', text: '已发出' },
  milktea_redeem: { stamp: '兑', text: '已核销' },
  wish: { stamp: '愿', text: '已许下' }
}

const icon = computed(() => ICONS[props.type])
const stampChar = computed(() => MAP[props.type].stamp)
const doneText = computed(() => MAP[props.type].text)

// 动画播完（约 1.3 秒）后通知父组件收尾
onMounted(() => {
  window.setTimeout(() => emit('done'), 1300)
})
</script>

<style scoped>
.flash {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(43, 37, 29, 0.36);
  animation: flash-in 0.18s ease both;
}

.flash-inner {
  position: relative;
  text-align: center;
}

/* —— 小相纸 —— */
.flash-card {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-float);
  overflow: hidden;
  animation: card-in 0.4s cubic-bezier(0.22, 0.9, 0.3, 1.2) both;
}

.flash-card.tremble {
  animation:
    card-in 0.4s cubic-bezier(0.22, 0.9, 0.3, 1.2) both,
    tremble 0.18s ease 0.6s;
}

.flash-icon {
  color: var(--line-strong);
}

/* —— 红印章 —— */
.flash-stamp {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  font-family: var(--font-song);
  font-size: 34px;
  line-height: 1;
  color: var(--brick);
  border: 3px solid var(--brick);
  border-radius: var(--r-md);
  animation: stamp-down 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) 0.24s both;
}

/* 照片：先白再显影 */
.flash-dev {
  position: absolute;
  inset: 0;
  background-color: #fff;
  animation: dev-out 0.75s ease 0.12s both;
}

/* —— 文案 —— */
.flash-text {
  margin-top: 22px;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  letter-spacing: 4px;
  text-indent: 4px;
  color: var(--paper);
  animation: text-in 0.3s ease 0.62s both;
}

/* —— 奶茶热气 —— */
.flash-steam {
  position: absolute;
  left: 50%;
  top: -20px;
  transform: translateX(-50%);
  display: flex;
  gap: 7px;
}
.flash-steam i {
  display: block;
  width: 5px;
  height: 20px;
  border-radius: 3px;
  background: linear-gradient(to top, rgba(253, 250, 241, 0), rgba(253, 250, 241, 0.5));
  animation: steam 1.2s ease-in-out infinite;
}
.flash-steam i:nth-child(2) {
  animation-delay: 0.35s;
}

@keyframes flash-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: rotate(-3deg) scale(0.68);
  }
  to {
    opacity: 1;
    transform: rotate(-3deg) scale(1);
  }
}

@keyframes stamp-down {
  0% {
    opacity: 0;
    transform: rotate(-9deg) scale(2.5);
  }
  60% {
    opacity: 1;
    transform: rotate(-9deg) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: rotate(-9deg) scale(1);
  }
}

@keyframes tremble {
  0%,
  100% {
    margin-top: 0;
  }
  50% {
    margin-top: 2px;
  }
}

@keyframes dev-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes text-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes steam {
  0% {
    opacity: 0;
    transform: translateY(6px) scaleY(0.6);
  }
  40% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(-10px) scaleY(1.1);
  }
}
</style>

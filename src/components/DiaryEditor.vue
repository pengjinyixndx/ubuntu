<template>
  <Teleport to="body">
    <div class="overlay">
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">写日记</span>
        <button type="button" class="stamp-btn" :disabled="!canSave" @click="save">
          <Loader v-if="saving" :size="14" class="spin" />
          <span v-else>写完了</span>
        </button>
      </header>

      <!-- 日记本页 -->
      <div class="paper-wrap">
        <div class="notebook">
          <div class="nb-head">
            <span class="nb-date">{{ todayLabel }}</span>
            <span class="nb-to">写给 {{ partner }}</span>
          </div>

          <!-- 天气 / 心情（可都不选） -->
          <div class="picks">
            <button
              v-for="w in WEATHERS"
              :key="w.key"
              type="button"
              class="pick"
              :class="{ on: weather === w.key }"
              @click="weather = weather === w.key ? '' : w.key"
            >
              <component :is="w.icon" :size="15" :stroke-width="1.7" />
              {{ w.label }}
            </button>
            <span class="pick-gap"></span>
            <button
              v-for="m in MOODS"
              :key="m.key"
              type="button"
              class="pick"
              :class="{ on: mood === m.key }"
              @click="mood = mood === m.key ? '' : m.key"
            >
              <component :is="m.icon" :size="15" :stroke-width="1.7" />
              {{ m.label }}
            </button>
          </div>

          <textarea
            ref="taRef"
            v-model="text"
            class="writing"
            placeholder="今天发生了什么呢……"
          ></textarea>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ text.length }} 字</span>
      </footer>

      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
        <Critter class="ginkgo g1" kind="ginkgo" :size="34" />
        <Critter class="ginkgo g2" kind="ginkgo" :size="24" />
      </div>

      <PublishFlash v-if="flash" type="diary" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Loader } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'
import { WEATHERS, MOODS } from '../lib/options'
import Critter from './Critter.vue'
import PublishFlash from './PublishFlash.vue'

const emit = defineEmits<{ close: [] }>()
const { publishEvent, myProfile, ensureMe } = useFeed()

const text = ref('')
const saving = ref(false)
const errMsg = ref('')
const flash = ref(false)
const taRef = ref<HTMLTextAreaElement | null>(null)
const weather = ref('')
const mood = ref('')

const canSave = computed(() => text.value.trim().length > 0 && !saving.value)
const partner = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))

// 日期：二〇二六年九月三十日
const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
function cnNum(n: number): string {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  let s = ''
  if (tens === 1) s = '十'
  else if (tens >= 2) s = CN[tens]! + '十'
  if (ones > 0) s += CN[ones]
  return s
}
const todayLabel = computed(() => {
  const d = new Date()
  const y = String(d.getFullYear())
    .split('')
    .map((c) => CN[Number(c)])
    .join('')
  return `${y}年${cnNum(d.getMonth() + 1)}月${cnNum(d.getDate())}日`
})

async function save() {
  if (!canSave.value) return
  saving.value = true
  errMsg.value = ''

  const { error } = await publishEvent({
    type: 'diary',
    content: text.value.trim(),
    meta: { weather: weather.value || null, mood: mood.value || null }
  })
  saving.value = false

  if (error) {
    errMsg.value = '没收录进去，再试一次'
    return
  }
  text.value = ''
  flash.value = true
}

onMounted(() => {
  ensureMe()
  taRef.value?.focus()
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  max-width: var(--app-w);
  margin: 0 auto;
  background-color: var(--paper);
  border-left: 1px solid var(--line-strong);
  border-right: 1px solid var(--line-strong);
  padding-top: env(safe-area-inset-top);
}

.editor-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: var(--border-dashed);
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: var(--ink-soft);
  background: none;
  border: none;
  cursor: pointer;
}
.editor-title {
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  color: var(--ink);
  letter-spacing: 2px;
}
.stamp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 8px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 2px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.55);
  transform: rotate(-2deg);
  cursor: pointer;
}
.stamp-btn:disabled {
  background-color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* —— 日记本页 —— */
.paper-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 14px 14px calc(50px + env(safe-area-inset-bottom));
}

.notebook {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 16px 14px 16px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* 装订线 */
.notebook::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 34px;
  border-left: 1px solid rgba(173, 79, 56, 0.16);
  pointer-events: none;
}

.nb-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-left: 26px;
}
.nb-date {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}
.nb-to {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}

/* —— 天气 / 心情 —— */
.picks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0 10px;
  padding-left: 26px;
}
.pick {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
  border-radius: 999px;
  cursor: pointer;
}
.pick.on {
  color: var(--photo);
  background-color: var(--caramel);
  border-color: var(--caramel);
}
.pick-gap {
  width: 8px;
}

/* —— 正文 —— */
.writing {
  flex: 1;
  width: 100%;
  min-height: 0;
  resize: none;
  border: none;
  outline: none;
  background-color: transparent;
  background-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent 29px,
    var(--line) 29px,
    var(--line) 30px
  );
  font-family: var(--font-song);
  font-size: var(--fs-lg);
  line-height: 30px;
  padding-left: 26px;
  color: var(--ink);
}
.writing::placeholder {
  color: var(--faint);
}

.editor-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: var(--border-dashed);
}
.foot-err {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--brick);
}
.foot-count {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}

/* —— 桌面小生物 —— */
.edge-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.crawler {
  position: absolute;
  left: 6px;
  bottom: calc(48px + env(safe-area-inset-bottom));
  color: var(--caramel);
  animation: crawl-drift 22s ease-in-out infinite alternate;
}
.ginkgo {
  position: absolute;
  color: var(--caramel);
}
.ginkgo.g1 {
  top: 66px;
  right: 8px;
  opacity: 0.5;
}
.ginkgo.g2 {
  top: 114px;
  right: 40px;
  opacity: 0.3;
}
@keyframes crawl-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(210px);
  }
}
</style>

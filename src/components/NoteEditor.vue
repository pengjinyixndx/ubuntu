<template>
  <Teleport to="body">
    <div class="overlay">
      <!-- 顶部栏：关闭 / 标题 / 寄出 -->
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">写随笔</span>
        <button type="button" class="stamp-btn" :disabled="!canSave" @click="save">
          <Loader v-if="saving" :size="14" class="spin" />
          <span v-else>寄出</span>
        </button>
      </header>

      <!-- 信纸（桌面上的主体） -->
      <div class="paper-wrap">
        <div class="letter-card">
          <!-- 信头：日期 + 写给谁 -->
          <div class="letterhead">
            <span class="letter-date">{{ todayLabel }}</span>
            <span class="letter-to">写给 {{ partner }}</span>
          </div>
          <div class="greeting">见字如面：</div>
          <div class="letter-rule"></div>

          <textarea
            ref="taRef"
            v-model="text"
            class="writing"
            :placeholder="placeholder"
          ></textarea>
        </div>
      </div>

      <!-- 底部提示 -->
      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ text.length }} 字</span>
      </footer>

      <!-- 桌面边缘：爬行的小螃蟹 + 银杏叶 -->
      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
        <Critter class="ginkgo g1" kind="ginkgo" :size="34" />
        <Critter class="ginkgo g2" kind="ginkgo" :size="24" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Loader } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'
import Critter from './Critter.vue'

const emit = defineEmits<{ close: [] }>()
const { publishEvent, myProfile, ensureMe } = useFeed()

const text = ref('')
const saving = ref(false)
const errMsg = ref('')
const taRef = ref<HTMLTextAreaElement | null>(null)

const canSave = computed(() => text.value.trim().length > 0 && !saving.value)

// 对方称呼：自己男 -> 她；自己女 -> 他
const partner = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))
const placeholder = computed(() => `写${partner.value}的话，不用太长，一句就好……`)

// 信头日期：二〇二六年九月三十日
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
  const { error } = await publishEvent({ type: 'note', content: text.value.trim() })
  saving.value = false

  if (error) {
    const msg = typeof error === 'string' ? error : (error as { message?: string })?.message
    errMsg.value = msg ? `没寄出去：${msg}` : '没寄出去，再试一次'
    return
  }
  text.value = ''
  emit('close')
}

onMounted(() => {
  ensureMe() // 拿到自己性别，正确显示「写给 她/他」
  taRef.value?.focus()
})
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: 100%;
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

/* 寄出：一颗红色印章 */
.stamp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 8px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 3px;
  text-indent: 3px;
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

/* —— 信纸（主体）—— */
.paper-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 12px 14px calc(50px + env(safe-area-inset-bottom));
}

.letter-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.letterhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 18px 0;
}

.letter-date {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}

.letter-to {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
}

.greeting {
  padding: 8px 18px 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--ink-soft);
}

.letter-rule {
  margin: 12px 18px 4px;
  border-top: var(--border-dashed);
}

.writing {
  flex: 1;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0 18px 12px;
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

/* —— 桌面边缘小生物 —— */
.edge-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* 爬行的小螃蟹：沿底部慢慢横着爬 */
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
  right: 10px;
  opacity: 0.55;
}
.ginkgo.g2 {
  top: 116px;
  right: 44px;
  opacity: 0.32;
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

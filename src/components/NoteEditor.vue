<template>
  <Teleport to="body">
    <div class="overlay">
      <!-- 顶部栏：关闭 / 标题 / 发布 -->
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">写随笔</span>
        <button type="button" class="save-btn" :disabled="!canSave" @click="save">
          <Loader v-if="saving" :size="15" class="spin" />
          <Check v-else :size="15" :stroke-width="2" />
          贴上
        </button>
      </header>

      <!-- 横线信纸 -->
      <div class="paper-body">
        <textarea
          v-model="text"
          class="writing"
          placeholder="此刻在想什么？随手写下来……"
        ></textarea>
      </div>

      <!-- 底部提示 -->
      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else-if="justSaved" class="foot-ok">已收进时光里</span>
        <span v-else class="foot-count">{{ text.length }} 字</span>
      </footer>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Check, Loader } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'

const emit = defineEmits<{ close: [] }>()
const { publishEvent } = useFeed()

const text = ref('')
const saving = ref(false)
const justSaved = ref(false)
const errMsg = ref('')

const canSave = computed(() => text.value.trim().length > 0 && !saving.value)

async function save() {
  if (!canSave.value) return
  saving.value = true
  errMsg.value = ''
  const { error } = await publishEvent({ type: 'note', content: text.value.trim() })
  saving.value = false

  if (error) {
    errMsg.value = '没贴上去，再试一次'
    return
  }
  text.value = ''
  justSaved.value = true
  window.setTimeout(() => {
    justSaved.value = false
  }, 2000)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background-color: var(--paper);
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

.save-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-sm);
  color: var(--paper);
  background-color: var(--ink);
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
}

.save-btn:disabled {
  background-color: var(--faint);
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

.paper-body {
  flex: 1;
  overflow: hidden;
  padding: 8px 20px;
}

.writing {
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  outline: none;
  background-color: transparent;
  background-image: linear-gradient(to bottom, transparent 0, transparent 29px, var(--line) 29px, var(--line) 30px);
  font-family: var(--font-song);
  font-size: var(--fs-lg);
  line-height: 30px;
  padding-top: 2px;
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

.foot-ok {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--caramel);
}

.foot-count {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
</style>

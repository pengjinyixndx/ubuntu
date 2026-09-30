<template>
  <Teleport to="body">
    <!-- 底部选择：拍照 / 相册 -->
    <transition name="pp">
      <div v-if="sheetOpen" class="pp-backdrop" @click.self="close">
        <div class="pp-sheet">
          <!-- 用 label 原生关联输入框：微信 / 安卓内置浏览器里也稳定能唤起 -->
          <label class="pp-item" :for="camId">拍照</label>
          <label class="pp-item" :for="albId">从相册选</label>
          <button type="button" class="pp-item pp-cancel" @click="close">取消</button>
        </div>
      </div>
    </transition>

    <!-- 输入框挪到屏幕外，而不是 display:none：
         部分手机浏览器（微信内置、安卓 WebView）不会响应隐藏输入框 -->
    <input
      :id="camId"
      ref="camRef"
      class="pp-input"
      type="file"
      accept="image/*"
      capture="environment"
      @change="onChange"
    />
    <input
      :id="albId"
      ref="albRef"
      class="pp-input"
      type="file"
      accept="image/*"
      :multiple="multiple"
      @change="onChange"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 是否允许多选（照片页用） */
    multiple?: boolean
  }>(),
  { multiple: false }
)

const emit = defineEmits<{ picked: [files: File[]] }>()

// 每个实例一组独立 id，label 的 for 才能对上
let seq = 0
const camId = `qt-pp-cam-${++seq}-${Math.random().toString(36).slice(2, 6)}`
const albId = `qt-pp-alb-${++seq}-${Math.random().toString(36).slice(2, 6)}`

const sheetOpen = ref(false)
const camRef = ref<HTMLInputElement | null>(null)
const albRef = ref<HTMLInputElement | null>(null)

function open() {
  sheetOpen.value = true
}
function close() {
  sheetOpen.value = false
}

/** 从系统选择器回来（拿到图或取消）——窗口重新获得焦点，收起面板 */
function onReturn() {
  sheetOpen.value = false
}

watch(sheetOpen, (isOpen) => {
  if (isOpen) window.addEventListener('focus', onReturn)
  else window.removeEventListener('focus', onReturn)
})

onBeforeUnmount(() => window.removeEventListener('focus', onReturn))

function onChange(e: Event) {
  const input = e.currentTarget as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // 清空，允许重复选同一张
  close()
  if (!files.length) return
  emit('picked', props.multiple ? files : files.slice(0, 1))
}

defineExpose({ open, close })
</script>

<style scoped>
/* 屏幕外，但保留在布局里（不能 display:none） */
.pp-input {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.pp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background-color: rgba(43, 37, 29, 0.4);
}

.pp-sheet {
  width: 100%;
  max-width: var(--app-w);
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
  background-color: var(--paper);
  border-radius: 10px 10px 0 0;
  border-top: var(--border-strong);
}

.pp-item {
  display: block;
  width: 100%;
  padding: 15px;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  letter-spacing: 2px;
  text-align: center;
  color: var(--ink);
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  margin-bottom: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pp-item:last-child {
  margin-bottom: 0;
}

.pp-cancel {
  color: var(--muted);
}

.pp-enter-active,
.pp-leave-active {
  transition: opacity 0.2s ease;
}
.pp-enter-active .pp-sheet,
.pp-leave-active .pp-sheet {
  transition: transform 0.24s cubic-bezier(0.22, 0.8, 0.24, 1);
}
.pp-enter-from,
.pp-leave-to {
  opacity: 0;
}
.pp-enter-from .pp-sheet,
.pp-leave-to .pp-sheet {
  transform: translateY(100%);
}
</style>

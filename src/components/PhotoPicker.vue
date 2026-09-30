<template>
  <Teleport to="body">
    <!-- 底部选择：拍照 / 相册 -->
    <transition name="pp">
      <div v-if="sheetOpen" class="pp-backdrop" @click.self="sheetOpen = false">
        <div class="pp-sheet">
          <button type="button" class="pp-item" @click="pick('camera')">拍照</button>
          <button type="button" class="pp-item" @click="pick('album')">从相册选</button>
          <button type="button" class="pp-item pp-cancel" @click="sheetOpen = false">取消</button>
        </div>
      </div>
    </transition>

    <input
      ref="camRef"
      class="pp-input"
      type="file"
      accept="image/*"
      capture="environment"
      @change="onChange"
    />
    <input
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
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 是否允许多选（照片页用） */
    multiple?: boolean
  }>(),
  { multiple: false }
)

const emit = defineEmits<{ picked: [files: File[]] }>()

const sheetOpen = ref(false)
const camRef = ref<HTMLInputElement | null>(null)
const albRef = ref<HTMLInputElement | null>(null)

/** 由父组件调用：弹出「拍照 / 从相册选」 */
function open() {
  sheetOpen.value = true
}

function pick(which: 'camera' | 'album') {
  sheetOpen.value = false
  const el = which === 'camera' ? camRef.value : albRef.value
  if (!el) return
  el.value = '' // 清空，允许重复选同一张
  el.click()
}

function onChange(e: Event) {
  const input = e.currentTarget as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  emit('picked', props.multiple ? files : files.slice(0, 1))
}

defineExpose({ open })
</script>

<style scoped>
.pp-input {
  display: none;
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
  color: var(--ink);
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  margin-bottom: 8px;
  cursor: pointer;
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

<template>
  <Teleport to="body">
    <!-- 底部选择：拍照 / 相册 -->
    <transition name="pp">
      <div v-if="sheetOpen" class="pp-backdrop" @click.self="close">
        <div class="pp-sheet">
          <!--
            真正的 input 就平铺在按钮上面：手指直接落在 input 上。
            不依赖 label 关联、也不依赖 JS 点击，微信 / 安卓 WebView 里最稳。
          -->
          <div class="pp-item">
            <span class="pp-text">拍照</span>
            <input
              class="pp-input"
              type="file"
              accept="image/*"
              capture="environment"
              @change="onChange"
              @cancel="close"
            />
          </div>

          <div class="pp-item">
            <span class="pp-text">从相册选</span>
            <input
              class="pp-input"
              type="file"
              accept="image/*"
              :multiple="multiple"
              @change="onChange"
              @cancel="close"
            />
          </div>

          <button type="button" class="pp-item pp-cancel" @click="close">取消</button>
        </div>
      </div>
    </transition>
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

/** 由父组件调用：弹出「拍照 / 从相册选」 */
function open() {
  sheetOpen.value = true
}

function close() {
  sheetOpen.value = false
}

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
  position: relative;
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
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pp-item:last-child {
  margin-bottom: 0;
}

.pp-text {
  display: block;
  pointer-events: none;
}

/* 铺满整条按钮的透明 input：手指点的就是它本身 */
.pp-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
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

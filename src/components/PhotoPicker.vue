<template>
  <Teleport to="body">
    <!-- 底部选择：拍照 / 相册 -->
    <transition name="pp">
      <div v-if="sheetOpen" class="pp-backdrop" @click.self="close">
        <div class="pp-sheet">
          <button type="button" class="pp-item" @click="openCamera">
            <span class="pp-text">拍照</span>
          </button>

          <div class="pp-item">
            <span class="pp-text">从相册选</span>
            <!-- 真正的 input 平铺在按钮上：手指点的就是它本身 -->
            <input
              class="pp-input"
              type="file"
              accept="image/*"
              :multiple="multiple"
              @change="onChange"
              @cancel="onAlbumCancel"
            />
          </div>

          <!-- 系统选择器没弹出来时，别静默关闭，给一条能走的路 -->
          <div v-if="albumFailed" class="pp-note">
            <p class="pp-note-text">系统没弹出相册（浏览器限制）。可以直接用相机拍一张。</p>
            <button type="button" class="pp-note-btn" @click="openCamera">改用相机拍</button>
          </div>

          <button type="button" class="pp-item pp-cancel" @click="close">取消</button>
        </div>
      </div>
    </transition>

    <!-- 应用内相机：不依赖系统 capture，PWA 里也能拍 -->
    <div v-if="camOpen" class="cam-mask">
      <video ref="videoRef" class="cam-video" playsinline autoplay muted></video>

      <div v-if="camError" class="cam-error">
        <p class="cam-error-text">{{ camError }}</p>
      </div>

      <button type="button" class="cam-close" aria-label="关闭相机" @click="closeCamera">
        <X :size="22" :stroke-width="1.8" />
      </button>

      <div class="cam-bar">
        <span class="cam-hint">{{ camError ? '相机不可用' : '对准想拍的东西，按下面这个圆' }}</span>
        <button
          type="button"
          class="cam-shutter"
          :disabled="!!camError || !ready"
          aria-label="拍照"
          @click="shoot"
        ></button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** 是否允许多选（照片页用；相机一次只拍一张） */
    multiple?: boolean
  }>(),
  { multiple: false }
)

const emit = defineEmits<{ picked: [files: File[]] }>()

const sheetOpen = ref(false)
const albumFailed = ref(false)

const camOpen = ref(false)
const camError = ref('')
const ready = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

/** 由父组件调用：弹出「拍照 / 从相册选」 */
function open() {
  albumFailed.value = false
  sheetOpen.value = true
}

function close() {
  sheetOpen.value = false
  albumFailed.value = false
}

/* ---------------- 从相册选（系统选择器） ---------------- */
function onAlbumCancel() {
  // 浏览器拒绝弹出 / 用户取消：不静默关闭
  albumFailed.value = true
}

function onChange(e: Event) {
  const input = e.currentTarget as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // 清空，允许重复选同一张

  if (!files.length) {
    albumFailed.value = true
    return
  }
  sheetOpen.value = false
  albumFailed.value = false
  emit('picked', props.multiple ? files : files.slice(0, 1))
}

/* ---------------- 应用内相机 ---------------- */
async function openCamera() {
  sheetOpen.value = false
  albumFailed.value = false
  camError.value = ''
  ready.value = false
  camOpen.value = true
  await nextTick()

  if (!navigator.mediaDevices?.getUserMedia) {
    camError.value = '这个浏览器不支持在应用里调用相机，请用「从相册选」'
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1600 },
        height: { ideal: 1200 }
      },
      audio: false
    })
    const v = videoRef.value
    if (!v) return
    v.srcObject = stream
    await v.play().catch(() => {})
    ready.value = true
  } catch (e) {
    camError.value = cameraErrorText(e)
  }
}

function cameraErrorText(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '相机权限被拒绝了。去系统/浏览器设置里，允许「青桃」使用相机，再回来点一次。'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return '没找到可用的摄像头，用「从相册选」吧。'
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return '摄像头被别的应用占用了，关掉再试。'
  }
  return '相机打不开，先用「从相册选」吧。'
}

function closeCamera() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  camOpen.value = false
  camError.value = ''
  ready.value = false
}

async function shoot() {
  const v = videoRef.value
  if (!v || !v.videoWidth) return

  const canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, 'image/jpeg', 0.86)
  )
  closeCamera()
  if (!blob) return

  const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
  emit('picked', [file])
}

onBeforeUnmount(() => {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
})

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

.pp-note {
  margin-bottom: 8px;
  padding: 12px 14px;
  background-color: var(--paper-deep);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
  text-align: center;
}
.pp-note-text {
  margin: 0 0 10px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--muted);
}
.pp-note-btn {
  padding: 8px 16px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
}

.pp-cancel {
  color: var(--muted);
}

/* ---------------- 相机 ---------------- */
.cam-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background-color: #14110d;
  overflow: hidden;
}

.cam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cam-close {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top));
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fdfaf1;
  background-color: rgba(20, 17, 13, 0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.cam-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 20px calc(28px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: linear-gradient(to top, rgba(20, 17, 13, 0.72), rgba(20, 17, 13, 0));
}

.cam-hint {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: rgba(253, 250, 241, 0.85);
}

.cam-shutter {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: rgba(253, 250, 241, 0.92);
  border: 4px solid rgba(253, 250, 241, 0.55);
  box-shadow: 0 0 0 3px rgba(20, 17, 13, 0.35);
  cursor: pointer;
}
.cam-shutter:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cam-error {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 45%;
  padding: 16px;
  background-color: rgba(253, 250, 241, 0.94);
  border-radius: var(--r-sm);
  text-align: center;
}
.cam-error-text {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink);
}

/* ---------------- 过渡 ---------------- */
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

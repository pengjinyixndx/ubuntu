<template>
  <Teleport to="body">
    <div class="overlay">
      <!-- 顶部栏 -->
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

      <!-- 一张精致的信 -->
      <div class="paper-wrap">
        <div class="letter">
          <!-- 框框条条 -->
          <span class="frame frame-a"></span>
          <span class="frame frame-b"></span>

          <!-- 四角小树枝 -->
          <svg class="twig twig-tr" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <path d="M6 90 C 30 74, 50 56, 72 32" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <g stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
              <path d="M72 32 C 60 24, 60 10, 72 2 C 84 10, 84 24, 72 32 Z" fill="currentColor" fill-opacity="0.1" />
              <path d="M48 56 C 38 50, 36 38, 46 30 C 56 38, 58 50, 48 56 Z" fill="currentColor" fill-opacity="0.1" />
              <path d="M26 78 C 16 72, 14 60, 24 52 C 34 60, 36 72, 26 78 Z" fill="currentColor" fill-opacity="0.1" />
            </g>
          </svg>
          <svg class="twig twig-bl" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <path d="M6 90 C 30 74, 50 56, 72 32" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <g stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
              <path d="M72 32 C 60 24, 60 10, 72 2 C 84 10, 84 24, 72 32 Z" fill="currentColor" fill-opacity="0.1" />
              <path d="M48 56 C 38 50, 36 38, 46 30 C 56 38, 58 50, 48 56 Z" fill="currentColor" fill-opacity="0.1" />
              <path d="M26 78 C 16 72, 14 60, 24 52 C 34 60, 36 72, 26 78 Z" fill="currentColor" fill-opacity="0.1" />
            </g>
          </svg>

          <!-- 火漆印 -->
          <span class="seal"><em>桃</em></span>

          <!-- 小东西：虚线点缀 -->
          <span class="dots"></span>
          <!-- 小东西：一枚小邮票 -->
          <span class="mini-stamp"><i></i></span>

          <!-- 正文 -->
          <div class="letter-body">
            <!-- 随手拍（可不加） -->
            <button v-if="!photoUrl" type="button" class="photo-empty" @click="picker?.open()">
              <Plus :size="16" :stroke-width="1.8" />
              <span>贴张随手拍（可不加）</span>
            </button>
            <div v-else class="photo-have">
              <img :src="photoUrl" alt="随手拍" />
              <button type="button" class="photo-del" aria-label="删掉照片" @click="clearPhoto">
                <X :size="12" :stroke-width="2.2" />
              </button>
            </div>

            <textarea
              ref="taRef"
              v-model="text"
              class="writing"
              :placeholder="placeholder"
            ></textarea>
          </div>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ text.length }} 字</span>
      </footer>

      <PhotoPicker ref="picker" @picked="onPicked" />
      <PublishFlash v-if="flash" type="note" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Loader, Plus } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'
import PhotoPicker from './PhotoPicker.vue'
import PublishFlash from './PublishFlash.vue'

const emit = defineEmits<{ close: [] }>()
const { publishEvent, uploadPhoto, myProfile, ensureMe } = useFeed()

const text = ref('')
const saving = ref(false)
const errMsg = ref('')
const flash = ref(false)
const taRef = ref<HTMLTextAreaElement | null>(null)
const picker = ref<InstanceType<typeof PhotoPicker> | null>(null)

const photo = ref<File | null>(null)
const photoUrl = ref('')

const canSave = computed(() => (text.value.trim().length > 0 || !!photo.value) && !saving.value)
const partner = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))
const placeholder = computed(() => `写${partner.value}的话，随手记两句……`)

function onPicked(files: File[]) {
  const f = files[0]
  if (!f) return
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  photo.value = f
  photoUrl.value = URL.createObjectURL(f)
}

function clearPhoto() {
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  photo.value = null
  photoUrl.value = ''
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  errMsg.value = ''

  let urls: string[] | undefined
  if (photo.value) {
    const { url, error } = await uploadPhoto(photo.value)
    if (error || !url) {
      saving.value = false
      errMsg.value = '照片没传上去，再试一次'
      return
    }
    urls = [url]
  }

  const { error } = await publishEvent({
    type: 'note',
    content: text.value.trim(),
    photo_urls: urls
  })
  saving.value = false

  if (error) {
    errMsg.value = '没寄出去，再试一次'
    return
  }
  text.value = ''
  clearPhoto()
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

/* —— 信 —— */
.paper-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 16px 14px calc(30px + env(safe-area-inset-bottom));
}

.letter {
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* 框框条条：外实线 + 内虚线 */
.frame {
  position: absolute;
  pointer-events: none;
}
.frame-a {
  inset: 9px;
  border: 1px solid var(--line-strong);
}
.frame-b {
  inset: 15px;
  border: 1px dashed var(--line);
}

/* 四角小树枝 */
.twig {
  position: absolute;
  width: 66px;
  color: var(--caramel);
  opacity: 0.85;
  pointer-events: none;
}
.twig-tr {
  top: 22px;
  right: 20px;
}
.twig-bl {
  bottom: 22px;
  left: 20px;
  transform: rotate(180deg);
}

/* 火漆印 */
.seal {
  position: absolute;
  top: 30px;
  left: 50%;
  width: 46px;
  height: 46px;
  margin-left: -23px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--brick);
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgba(253, 250, 241, 0.35);
  transform: rotate(-8deg);
}
.seal em {
  font-family: var(--font-song);
  font-size: 20px;
  font-style: normal;
  color: var(--photo);
  opacity: 0.95;
}

/* 小东西：火漆下一排小点 */
.dots {
  position: absolute;
  top: 88px;
  left: 50%;
  width: 58px;
  margin-left: -29px;
  border-top: 1.5px dotted var(--line-strong);
}

/* 小东西：右下角一枚小邮票 */
.mini-stamp {
  position: absolute;
  right: 24px;
  bottom: 22px;
  width: 34px;
  height: 42px;
  border: 1px solid var(--line-strong);
  background-color: var(--paper);
  transform: rotate(4deg);
}
.mini-stamp::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px dashed var(--line);
}
.mini-stamp i {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 1.4px solid var(--caramel);
  border-radius: 50%;
}

/* —— 正文区 —— */
.letter-body {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 96px 38px 96px;
}

.photo-empty {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 62px;
  margin-bottom: 12px;
  color: var(--faint);
  background-color: transparent;
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  cursor: pointer;
}

.photo-have {
  position: relative;
  flex-shrink: 0;
  height: 160px;
  margin-bottom: 12px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.photo-have img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-del {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--photo);
  background-color: rgba(43, 37, 29, 0.55);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

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
</style>

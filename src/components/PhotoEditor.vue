<template>
  <Teleport to="body">
    <div class="overlay">
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">发照片</span>
        <button type="button" class="stamp-btn" :disabled="!canSave" @click="save">
          <Loader v-if="saving" :size="14" class="spin" />
          <span v-else>冲印</span>
        </button>
      </header>

      <!-- 冲印一版相纸 -->
      <div class="paper-wrap">
        <div class="album">
          <input
            v-model="cap"
            class="cap-input"
            type="text"
            maxlength="40"
            placeholder="给这组照片配句话（可不写）"
          />

          <div class="grid">
            <div v-for="(p, i) in photos" :key="p.url" class="cell">
              <img :src="p.url" :alt="`照片${i + 1}`" />
              <button type="button" class="cell-del" aria-label="删掉这张" @click="remove(i)">
                <X :size="12" :stroke-width="2.2" />
              </button>
            </div>

            <button
              v-if="photos.length < MAX"
              type="button"
              class="cell cell-add"
              @click="picker?.open()"
            >
              <Plus :size="22" :stroke-width="1.6" />
              <span>{{ photos.length ? '再加' : '选照片' }}</span>
            </button>
          </div>

          <p class="hint">
            最多 {{ MAX }} 张 · 已选 {{ photos.length }} 张
          </p>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ saving ? '正在冲印…' : '一整组一起发' }}</span>
      </footer>

      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
        <Critter class="ginkgo g1" kind="ginkgo" :size="34" />
      </div>

      <PhotoPicker ref="picker" multiple @picked="onPicked" />
      <PublishFlash v-if="flash" type="photo" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, Loader, Plus } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'
import Critter from './Critter.vue'
import PhotoPicker from './PhotoPicker.vue'
import PublishFlash from './PublishFlash.vue'

const emit = defineEmits<{ close: [] }>()
const { publishEvent, uploadPhoto } = useFeed()

const MAX = 9
const photos = ref<{ file: File; url: string }[]>([])
const cap = ref('')
const saving = ref(false)
const errMsg = ref('')
const flash = ref(false)
const picker = ref<InstanceType<typeof PhotoPicker> | null>(null)

const canSave = computed(() => photos.value.length > 0 && !saving.value)

function onPicked(files: File[]) {
  const room = MAX - photos.value.length
  for (const f of files.slice(0, Math.max(0, room))) {
    photos.value.push({ file: f, url: URL.createObjectURL(f) })
  }
}

function remove(i: number) {
  const [gone] = photos.value.splice(i, 1)
  if (gone) URL.revokeObjectURL(gone.url)
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  errMsg.value = ''

  const urls: string[] = []
  for (const p of photos.value) {
    const { url, error } = await uploadPhoto(p.file)
    if (error || !url) {
      saving.value = false
      errMsg.value = '有照片没传上去，再试一次'
      return
    }
    urls.push(url)
  }

  const { error } = await publishEvent({
    type: 'photo',
    content: cap.value.trim(),
    photo_urls: urls
  })
  saving.value = false

  if (error) {
    errMsg.value = '没冲印出来，再试一次'
    return
  }
  photos.value.forEach((p) => URL.revokeObjectURL(p.url))
  photos.value = []
  cap.value = ''
  flash.value = true
}
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

/* —— 相纸 —— */
.paper-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 14px calc(50px + env(safe-area-inset-bottom));
}

.album {
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  padding: 14px;
}

.cap-input {
  width: 100%;
  padding: 8px 2px;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  font-family: var(--font-song);
  font-size: var(--fs-md);
  color: var(--ink);
}
.cap-input::placeholder {
  color: var(--faint);
}
.cap-input:focus {
  outline: none;
  border-bottom-color: var(--caramel);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.cell {
  position: relative;
  aspect-ratio: 1;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}

.cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cell-del {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--photo);
  background-color: rgba(43, 37, 29, 0.6);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.cell-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--faint);
  background-color: transparent;
  border: 1.5px dashed var(--line-strong);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  cursor: pointer;
}

.hint {
  margin: 12px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
  text-align: center;
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
@keyframes crawl-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(210px);
  }
}
</style>

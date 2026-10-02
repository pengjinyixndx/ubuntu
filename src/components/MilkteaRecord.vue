<template>
  <Teleport to="body">
    <div class="overlay">
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">喝奶茶</span>
        <button type="button" class="stamp-btn" :disabled="!canSave" @click="save">
          <Loader v-if="busy" :size="14" class="spin" />
          <span v-else>记下</span>
        </button>
      </header>

      <div class="paper-wrap">
        <div class="sheet">
          <!-- 这一杯的样子（记的时候留一张） -->
          <button v-if="!photoUrl" type="button" class="photo-empty" @click="picker?.open()">
            <Camera :size="20" :stroke-width="1.6" />
            <span>这一杯的样子</span>
          </button>
          <div v-else class="photo-have">
            <img :src="photoUrl" alt="这一杯" />
            <button type="button" class="photo-del" aria-label="换一张" @click="clearPhoto">
              <X :size="12" :stroke-width="2.2" />
            </button>
          </div>

          <div class="block">
            <span class="label">口味</span>
            <div class="chips">
              <button
                v-for="f in TEA_FLAVORS"
                :key="f"
                type="button"
                class="chip"
                :class="{ on: flavor === f }"
                @click="flavor = flavor === f ? '' : f"
              >
                {{ f }}
              </button>
            </div>
          </div>

          <div class="block">
            <span class="label">甜度</span>
            <div class="chips">
              <button
                v-for="s in TEA_SWEETNESS"
                :key="s"
                type="button"
                class="chip"
                :class="{ on: sweet === s }"
                @click="sweet = sweet === s ? '' : s"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <textarea v-model="text" class="note" maxlength="60" placeholder="随便写点什么"></textarea>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
      </footer>

      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
      </div>

      <PhotoPicker ref="picker" @picked="onPicked" />
      <PublishFlash v-if="flash" type="milktea_redeem" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Loader, Camera } from 'lucide-vue-next'
import { useMilktea } from '../composables/useMilktea'
import { useFeed } from '../composables/useFeed'
import { TEA_FLAVORS, TEA_SWEETNESS } from '../lib/options'
import Critter from './Critter.vue'
import PhotoPicker from './PhotoPicker.vue'
import PublishFlash from './PublishFlash.vue'

const emit = defineEmits<{ close: [] }>()
const { redeem, canDrink } = useMilktea()
const { uploadPhoto, events, loadEvents } = useFeed()

const flavor = ref('')
const sweet = ref('')
const text = ref('')
const photo = ref<File | null>(null)
const photoUrl = ref('')
const picker = ref<InstanceType<typeof PhotoPicker> | null>(null)
const busy = ref(false)
const errMsg = ref('')
const flash = ref(false)

const canSave = computed(() => !!photo.value && canDrink.value && !busy.value)

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
  busy.value = true
  errMsg.value = ''

  const { url, error } = await uploadPhoto(photo.value as File)
  if (error || !url) {
    busy.value = false
    errMsg.value = '照片没传上去，再试一次'
    return
  }

  const res = await redeem({
    flavor: flavor.value,
    sweetness: sweet.value,
    content: text.value.trim(),
    photoUrl: url
  })
  busy.value = false

  if (res.error) {
    errMsg.value = '没记上，再试一次'
    return
  }
  flavor.value = ''
  sweet.value = ''
  text.value = ''
  clearPhoto()
  flash.value = true
}

onMounted(() => {
  if (!events.value.length) loadEvents()
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

.paper-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px calc(50px + env(safe-area-inset-bottom));
}

.sheet {
  padding: 14px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}

.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 168px;
  margin-bottom: 16px;
  color: var(--faint);
  background-color: var(--paper-deep);
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  cursor: pointer;
}
.photo-have {
  position: relative;
  height: 210px;
  margin-bottom: 16px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.photo-have img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-del {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--photo);
  background-color: rgba(43, 37, 29, 0.55);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.block {
  margin-bottom: 14px;
}
.label {
  display: block;
  margin-bottom: 7px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--muted);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.chip {
  padding: 6px 13px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
  background-color: transparent;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-sm);
  cursor: pointer;
}
.chip.on {
  color: var(--photo);
  background-color: var(--caramel);
  border-style: solid;
  border-color: var(--caramel);
}

.note {
  width: 100%;
  min-height: 64px;
  resize: none;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  outline: none;
  background-color: transparent;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.8;
  color: var(--ink);
}
.note::placeholder {
  color: var(--faint);
}
.note:focus {
  border-bottom-color: var(--caramel);
}

.editor-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: var(--border-dashed);
  min-height: 20px;
}
.foot-err {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--brick);
}

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
@keyframes crawl-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(210px);
  }
}
</style>

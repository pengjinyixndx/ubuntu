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

      <!-- 一张明信片 -->
      <div class="paper-wrap">
        <div class="postcard">
          <div class="post-top">
            <!-- 左：贴一张随手拍 -->
            <div class="post-photo">
              <button v-if="!photoUrl" type="button" class="photo-empty" @click="picker?.open()">
                <Plus :size="17" :stroke-width="1.8" />
                <span>贴张随手拍</span>
              </button>
              <div v-else class="photo-have">
                <img :src="photoUrl" alt="随手拍" />
                <button type="button" class="photo-del" aria-label="删掉照片" @click="clearPhoto">
                  <X :size="12" :stroke-width="2.2" />
                </button>
              </div>
            </div>

            <!-- 右：邮票 + 邮戳（谁写的用谁的票） -->
            <div class="post-stamps">
              <span class="postmark">{{ stampDate }}</span>
              <span class="stamp">
                <Critter :kind="writerKind" :size="24" still />
                <em>青桃</em>
              </span>
            </div>
          </div>

          <!-- 右下：写着的话 -->
          <textarea
            ref="taRef"
            v-model="text"
            class="post-msg"
            :placeholder="placeholder"
          ></textarea>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ text.length }} 字</span>
      </footer>

      <!-- 桌面边缘小生物 -->
      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
        <Critter class="ginkgo g1" kind="ginkgo" :size="34" />
        <Critter class="ginkgo g2" kind="ginkgo" :size="24" />
      </div>

      <PhotoPicker ref="picker" @picked="onPicked" />
      <PublishFlash v-if="flash" type="note" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X, Loader, Plus } from 'lucide-vue-next'
import { useFeed } from '../composables/useFeed'
import Critter from './Critter.vue'
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

// 一张随手拍（可选）
const photo = ref<File | null>(null)
const photoUrl = ref('')

const canSave = computed(() => (text.value.trim().length > 0 || !!photo.value) && !saving.value)
const partner = computed(() => (myProfile.value?.gender === 'female' ? '他' : '她'))
const placeholder = computed(() => `写${partner.value}的话，随手记两句……`)

// 谁写的，邮票上就印谁的符号：他=螃蟹，她=银杏叶
const writerKind = computed<'crab' | 'ginkgo'>(() =>
  myProfile.value?.gender === 'female' ? 'ginkgo' : 'crab'
)

// 邮戳上的日期：2026.09.30
const stampDate = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
})

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

/* —— 明信片（横版）—— */
.paper-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 22px 14px 0;
}

.postcard {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px 15px 12px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  transform: rotate(-0.7deg);
}

/* 上排：随手拍 + 邮票邮戳 */
.post-top {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-height: 104px;
}

.post-photo {
  flex: 1 1 auto;
  max-width: 48%;
  height: 104px;
}

.photo-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
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
  width: 100%;
  height: 100%;
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

/* —— 邮票 + 邮戳 —— */
.post-stamps {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* 邮戳：椭圆、斜压一角，里面带日期 */
.postmark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 42px;
  margin-right: -10px;
  border: 1.5px solid rgba(173, 79, 56, 0.45);
  border-radius: 50%;
  transform: rotate(-14deg);
  font-family: var(--font-typewriter);
  font-size: 9px;
  letter-spacing: 0.5px;
  color: rgba(173, 79, 56, 0.62);
  position: relative;
  z-index: 1;
}

/* 邮票：小方票 + 齿孔边 + 写的人的符号 */
.stamp {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 48px;
  height: 58px;
  background-color: var(--photo);
  border: 1px solid var(--line-strong);
  box-shadow: 0 1px 3px rgba(84, 62, 30, 0.18);
  transform: rotate(3deg);
  color: var(--caramel);
}
/* 齿孔：内层虚线框 */
.stamp::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px dashed var(--line);
  pointer-events: none;
}
.stamp em {
  font-family: var(--font-song);
  font-size: 8px;
  font-style: normal;
  letter-spacing: 1.5px;
  color: var(--caramel);
}

/* —— 写着的话 —— */
.post-msg {
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
    transparent 27px,
    var(--line) 27px,
    var(--line) 28px
  );
  font-family: var(--font-song);
  font-size: var(--fs-md);
  line-height: 28px;
  padding-top: 5px;
  color: var(--ink);
}
.post-msg::placeholder {
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
  top: calc(50% + 40px);
  right: 12px;
  opacity: 0.42;
}
.ginkgo.g2 {
  top: calc(50% + 96px);
  left: 18px;
  opacity: 0.26;
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

<template>
  <PanelShell title="亲亲" @close="emit('close')">
    <!-- 今日免费 + 欠账 -->
    <section class="summary">
      <div class="cell">
        <span class="cell-num">{{ freeLeftToday }}</span>
        <span class="cell-label">今天还能免费要</span>
      </div>
      <div class="cell">
        <span class="cell-num">{{ kissDebt }}</span>
        <span class="cell-label">欠着的亲亲</span>
      </div>
    </section>

    <!-- 写一张亲亲请愿 -->
    <section class="block">
      <h3 class="block-title">递一张亲亲请愿</h3>

      <button v-if="!photoUrl" type="button" class="photo-empty" @click="picker?.open()">
        <Camera :size="16" :stroke-width="1.8" />
        <span>附一张照片（可不要）</span>
      </button>
      <div v-else class="photo-have">
        <img :src="photoUrl" alt="附的照片" />
        <button type="button" class="photo-del" aria-label="删掉照片" @click="clearPhoto">
          <X :size="12" :stroke-width="2.2" />
        </button>
      </div>

      <textarea
        v-model="reason"
        class="area"
        maxlength="60"
        placeholder="为什么想亲呀～"
      ></textarea>

      <button type="button" class="btn primary" :disabled="busy" @click="askRequest">请求</button>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- 等她点头 / 等他的回话 -->
    <section v-if="pendingKisses.length" class="block">
      <h3 class="block-title">等你说好</h3>
      <ul class="list">
        <li v-for="k in pendingKisses" :key="k.id" class="row">
          <div class="row-body">
            <p class="row-main">{{ who(k.requester) }} 想亲你</p>
            <p v-if="k.reason" class="row-sub">{{ k.reason }}</p>
            <p class="row-time">{{ time(k.created_at) }}</p>
          </div>
          <div class="row-acts">
            <button type="button" class="btn ok" @click="resolve(k.id, 'approved')">好呀</button>
            <button type="button" class="btn no" @click="resolve(k.id, 'rejected')">不了</button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="myPendingKisses.length" class="block">
      <h3 class="block-title">等他的回话</h3>
      <ul class="list">
        <li v-for="k in myPendingKisses" :key="k.id" class="row quiet">
          <span class="row-main">{{ k.reason || '想亲一下' }}</span>
          <span class="row-time">{{ time(k.created_at) }}</span>
        </li>
      </ul>
    </section>

    <!-- 欠着的，可以兑现 -->
    <section v-if="owed.length" class="block">
      <h3 class="block-title">欠着的</h3>
      <ul class="list">
        <li v-for="k in owed" :key="k.id" class="row">
          <div class="row-body">
            <p class="row-main">{{ who(k.requester) }} 的 {{ k.count }} 个亲亲</p>
            <p class="row-time">{{ time(k.created_at) }}</p>
          </div>
          <button type="button" class="btn ghost" @click="redeem(k.id)">亲过了</button>
        </li>
      </ul>
    </section>

    <PhotoPicker ref="picker" @picked="onPicked" />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Camera, X } from 'lucide-vue-next'
import type { Kiss } from '../types/domain'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { actorLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'
import PhotoPicker from './PhotoPicker.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile, uploadPhoto } = useFeed()
const {
  freeLeftToday,
  kissDebt,
  kisses,
  pendingKisses,
  myPendingKisses,
  requestKiss,
  resolveKiss,
  redeemKiss,
  loadPetition
} = usePetition()

const reason = ref('')
const photo = ref<File | null>(null)
const photoUrl = ref('')
const picker = ref<InstanceType<typeof PhotoPicker> | null>(null)
const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}

const owed = computed(() =>
  kisses.value.filter((k) => !k.redeemed && (k.status === 'free' || k.status === 'approved'))
)

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

async function askRequest() {
  if (!reason.value.trim()) {
    isErr.value = true
    msg.value = '说一句为什么吧'
    return
  }
  isErr.value = false
  msg.value = ''
  busy.value = true

  let url: string | undefined
  if (photo.value) {
    const up = await uploadPhoto(photo.value)
    if (up.error || !up.url) {
      busy.value = false
      isErr.value = true
      msg.value = '照片没传上去，再试一次'
      return
    }
    url = up.url
  }

  const { error } = await requestKiss(reason.value.trim(), url)
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没递上，再试一次'
    return
  }
  reason.value = ''
  clearPhoto()
  msg.value = '递给他了'
}

async function resolve(id: string, status: 'approved' | 'rejected') {
  busy.value = true
  await resolveKiss(id, status)
  busy.value = false
}
async function redeem(id: string) {
  busy.value = true
  await redeemKiss(id)
  busy.value = false
}

onMounted(loadPetition)
</script>

<style scoped>
.summary {
  display: flex;
  gap: 10px;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 14px 6px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.cell-num {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
}
.cell-label {
  font-family: var(--font-song);
  font-size: 11px;
  color: var(--muted);
}

.block {
  padding: 14px 15px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.block-title {
  margin: 0 0 10px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--ink);
}

.photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 66px;
  margin-bottom: 12px;
  color: var(--faint);
  background-color: transparent;
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--r-sm);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  cursor: pointer;
}
.photo-have {
  position: relative;
  height: 150px;
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
  display: block;
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

.area {
  width: 100%;
  min-height: 66px;
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
.area::placeholder {
  color: var(--faint);
}
.area:focus {
  border-bottom-color: var(--caramel);
}

.btn {
  padding: 8px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
  border: none;
}
.btn.primary {
  margin-top: 14px;
  color: var(--photo);
  background-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
}
.btn.ok {
  color: var(--photo);
  background-color: var(--caramel);
}
.btn.no {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.btn.ghost {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: var(--border-dashed);
}
.row:first-child {
  border-top: none;
  padding-top: 0;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-main {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.row-sub {
  margin: 3px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--ink-soft);
  word-break: break-word;
}
.row-time {
  margin: 3px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.row-acts {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.row.quiet .row-time {
  margin: 0 0 0 auto;
}

.msg {
  margin: 10px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
}
.msg.err {
  color: var(--brick);
}
</style>

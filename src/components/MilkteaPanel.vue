<template>
  <PanelShell title="奶茶" @close="emit('close')">
    <!-- 她的集点卡：点开看每张券的明细 -->
    <MilkteaCard compact clickable @open="showDetail = true" />

    <!-- ① 今天喝了哪一杯 -->
    <section class="block">
      <h3 class="block-title">今天喝了哪一杯</h3>

      <!-- 这一杯的照片是必须的 -->
      <button v-if="!photoUrl" type="button" class="photo-empty" @click="picker?.open()">
        <Camera :size="16" :stroke-width="1.8" />
        <span>贴一张这杯的照片（必须）</span>
      </button>
      <div v-else class="photo-have">
        <img :src="photoUrl" alt="奶茶照片" />
        <button type="button" class="photo-del" aria-label="删掉照片" @click="clearPhoto">
          <X :size="12" :stroke-width="2.2" />
        </button>
      </div>

      <div class="mt-block">
        <span class="mt-label">口味</span>
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

      <div class="mt-block">
        <span class="mt-label">甜度</span>
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

      <textarea
        v-model="text"
        class="area"
        maxlength="60"
        placeholder="想说点什么？不写也行"
      ></textarea>

      <button type="button" class="btn primary wide" :disabled="drinkBusy" @click="submitDrink">
        {{ iAmHer ? '喝掉这杯' : '记一杯' }}
      </button>
      <p v-if="drinkMsg" class="msg err">{{ drinkMsg }}</p>
      <p v-else class="hint">{{ drinkHint }}</p>
    </section>

    <!-- ② 券：他点进来是「颁」，她点进来是「讨」 -->
    <section class="block">
      <h3 class="block-title">{{ iAmHer ? '想讨一杯奶茶' : '颁一张奶茶券' }}</h3>
      <p class="hint">
        {{
          iAmHer
            ? '跟他说一声今天想喝什么，他回你了就有一张'
            : '写清楚因何故、到什么时候过期，这张券会记进时光记录'
        }}
      </p>

      <textarea
        v-if="iAmHer"
        v-model="reason"
        class="area"
        maxlength="60"
        placeholder="今天想喝哪一杯呀？为什么突然想喝～"
      ></textarea>

      <template v-else>
        <textarea
          v-model="reason"
          class="area"
          maxlength="60"
          placeholder="因何故？比如：这周加班辛苦了"
        ></textarea>
        <label class="expiry-row">
          <span class="expiry-label">这张券到哪天为止</span>
          <input v-model="expiresAt" class="expiry-input" type="date" />
        </label>
      </template>

      <button type="button" class="btn primary" :disabled="busy" @click="askCoupon">
        {{ iAmHer ? '递给他' : '颁给她' }}
      </button>
      <p v-if="msg" class="msg" :class="{ err: isErr }">{{ msg }}</p>
    </section>

    <!-- ③ 她递过来的（等他回） -->
    <section v-if="pendingRequests.length" class="block">
      <h3 class="block-title">她递过来的</h3>
      <ul class="list">
        <li v-for="r in pendingRequests" :key="r.id" class="row">
          <div class="row-body">
            <p class="row-main">{{ who(r.requester) }} 想讨一杯奶茶</p>
            <p class="row-sub">{{ r.reason || '（这次她没写）' }}</p>
          </div>
          <div class="row-acts">
            <button type="button" class="btn ok" @click="askApprove(r)">好呀给她</button>
            <button type="button" class="btn no" @click="askReject(r)">这次先不啦</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 我递出去还没回的 -->
    <section v-if="myPending.length" class="block">
      <h3 class="block-title">等他的回话</h3>
      <ul class="list">
        <li v-for="r in myPending" :key="r.id" class="row quiet">
          <span class="row-main">我说：{{ r.reason || '想喝一杯' }}</span>
          <span class="row-time">{{ time(r.created_at) }}</span>
        </li>
      </ul>
    </section>

    <!-- ④ 最近 -->
    <section v-if="history.length" class="block">
      <h3 class="block-title">最近</h3>
      <ul class="list">
        <li v-for="r in history" :key="r.id" class="row quiet">
          <span class="dot" :class="r.status"></span>
          <span class="row-main">{{ who(r.requester) }} 讨的那一杯</span>
          <span class="row-status">{{ statusText(r.status) }}</span>
          <span class="row-time">{{ time(r.created_at) }}</span>
        </li>
      </ul>
    </section>

    <!-- 强制提醒：不可逆的动作先看清、等 3 秒 -->
    <ConfirmModal
      v-if="confirm"
      :title="confirm.title"
      :desc="confirm.desc"
      :lines="confirm.lines"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      @cancel="confirm = null"
      @confirm="runConfirm"
    />

    <MilkteaDetail v-if="showDetail" @close="showDetail = false" />
    <PhotoPicker ref="picker" @picked="onPicked" />
    <PublishFlash v-if="flash" type="milktea_redeem" @done="emit('close')" />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Camera, X } from 'lucide-vue-next'
import type { MilkteaRequest, RequestStatus } from '../types/domain'
import { useMilktea } from '../composables/useMilktea'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { TEA_FLAVORS, TEA_SWEETNESS } from '../lib/options'
import { actorLabel, dateTimeLabel, timeLabel } from '../lib/eventLabels'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'
import MilkteaDetail from './MilkteaDetail.vue'
import PhotoPicker from './PhotoPicker.vue'
import PublishFlash from './PublishFlash.vue'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile, uploadPhoto } = useFeed()
const { iAmHer, canDrink, nextSource, redeem } = useMilktea()
const {
  pendingRequests,
  requests,
  requestMilktea,
  resolveRequest,
  issueVoucher,
  loadPetition
} = usePetition()

/* —— 喝一杯 —— */
const flavor = ref('')
const sweet = ref('')
const text = ref('')
const photo = ref<File | null>(null)
const photoUrl = ref('')
const picker = ref<InstanceType<typeof PhotoPicker> | null>(null)
const drinkBusy = ref(false)
const drinkMsg = ref('')
const flash = ref(false)

const drinkHint = computed(() => {
  if (!iAmHer.value) return '你喝的，记一笔就好，不占她的额度'
  if (!photoUrl.value) return '先贴一张这杯的照片'
  if (nextSource.value === 'free') return '这次用「本周免费」'
  if (nextSource.value === 'voucher') return '这次用掉一张券'
  return '这周的免费喝完了，也没券了——跟他说一声？'
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

async function submitDrink() {
  drinkMsg.value = ''
  if (!photo.value) {
    drinkMsg.value = '得先贴一张这杯的照片'
    return
  }
  if (!canDrink.value) {
    drinkMsg.value = '这周的额度用完了'
    return
  }

  drinkBusy.value = true
  const { url, error } = await uploadPhoto(photo.value)
  if (error || !url) {
    drinkBusy.value = false
    drinkMsg.value = '照片没传上去，再试一次'
    return
  }

  const res = await redeem({
    flavor: flavor.value,
    sweetness: sweet.value,
    content: text.value.trim(),
    photoUrl: url
  })
  drinkBusy.value = false

  if (res.error) {
    drinkMsg.value = '没记上，再试一次'
    return
  }
  flavor.value = ''
  sweet.value = ''
  text.value = ''
  clearPhoto()
  flash.value = true
}

/* —— 券 —— */
const reason = ref('')
const expiresAt = ref(defaultExpiry())
const busy = ref(false)
const msg = ref('')
const isErr = ref(false)

const myPending = computed(() =>
  requests.value.filter(
    (r: MilkteaRequest) => r.status === 'pending' && r.requester === myProfile.value?.id
  )
)
const history = computed(() =>
  requests.value.filter((r: MilkteaRequest) => r.status !== 'pending').slice(0, 6)
)

/** 默认到期：七天后 */
function defaultExpiry(): string {
  const d = new Date(Date.now() + 7 * 86400000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function who(id: string): string {
  return actorLabel(id, myProfile.value?.id ?? '', myProfile.value?.gender)
}
function time(iso: string): string {
  return timeLabel(iso)
}
function statusText(s: RequestStatus): string {
  return s === 'approved' ? '他给了' : s === 'rejected' ? '这次没给' : '等他回'
}
function fmtDay(v: string): string {
  if (!v) return '没定'
  const s = dateTimeLabel(`${v}T00:00:00`)
  const cut = s.indexOf(' ')
  return cut > 0 ? s.slice(0, cut) : s
}

interface PendingConfirm {
  title: string
  desc: string
  lines: string[]
  confirmText: string
  danger: boolean
  run: () => Promise<{ error: unknown }>
}
const confirm = ref<PendingConfirm | null>(null)
const showDetail = ref(false)

/** 他：颁一张；她：讨一张 */
function askCoupon() {
  if (!reason.value.trim()) {
    isErr.value = true
    msg.value = iAmHer.value ? '总得说一句想喝什么呀' : '写一句因何故吧'
    return
  }
  if (!iAmHer.value && !expiresAt.value) {
    isErr.value = true
    msg.value = '再选一个到哪天为止'
    return
  }
  isErr.value = false
  msg.value = ''
  const text = reason.value.trim()

  if (iAmHer.value) {
    confirm.value = {
      title: '这就递给他？',
      desc: '他那边会收到，回了你就有券啦。',
      lines: [`我说：${text}`],
      confirmText: '递给他',
      danger: false,
      run: () => requestMilktea(text)
    }
    return
  }

  confirm.value = {
    title: '这就颁给她？',
    desc: '发出去之后会记进时光记录，她那边能看到。',
    lines: [`因何故：${text}`, `到哪天为止：${fmtDay(expiresAt.value)}`],
    confirmText: '颁给她',
    danger: false,
    run: () => issueVoucher(text, expiresAt.value)
  }
}

function askApprove(r: MilkteaRequest) {
  if (!expiresAt.value) {
    isErr.value = true
    msg.value = '先选一个到哪天为止'
    return
  }
  msg.value = ''
  confirm.value = {
    title: '好呀，这就给她？',
    desc: '发出后这张券就归她了，会记进时光记录。',
    lines: [`她说：${r.reason || '（没写）'}`, `这张券到：${fmtDay(expiresAt.value)}`],
    confirmText: '给她',
    danger: false,
    run: () => resolveRequest(r.id, 'approved', { expires_at: expiresAt.value })
  }
}

function askReject(r: MilkteaRequest) {
  msg.value = ''
  confirm.value = {
    title: '这次先不给她？',
    desc: '她会看到你这次没答应。',
    lines: [`她说：${r.reason || '（没写）'}`],
    confirmText: '先不啦',
    danger: true,
    run: () => resolveRequest(r.id, 'rejected')
  }
}

async function runConfirm() {
  const job = confirm.value
  if (!job) return
  confirm.value = null
  busy.value = true
  msg.value = ''
  const { error } = await job.run()
  busy.value = false
  if (error) {
    isErr.value = true
    msg.value = '没成功，再试一次'
    return
  }
  isErr.value = false
  reason.value = ''
  msg.value = '好啦'
}

onMounted(loadPetition)
</script>

<style scoped>
.block {
  padding: 14px 15px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.block-title {
  margin: 0 0 8px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--ink);
}
.hint {
  margin: 0 0 10px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--muted);
}

/* —— 这一杯的照片 —— */
.photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 74px;
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
  height: 158px;
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

.mt-block {
  margin-bottom: 10px;
}
.mt-label {
  display: block;
  margin-bottom: 6px;
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
  padding: 5px 12px;
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

.area {
  width: 100%;
  min-height: 60px;
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

.expiry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.expiry-label {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}
.expiry-input {
  flex: 1;
  padding: 6px 2px;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  background: transparent;
  font-family: var(--font-typewriter);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.expiry-input:focus {
  outline: none;
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
.btn.wide {
  width: 100%;
  margin-top: 12px;
  padding: 11px;
  font-size: var(--fs-base);
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
  font-size: var(--fs-xs);
  line-height: 1.7;
  color: var(--muted);
}
.row-acts {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.row.quiet {
  font-size: var(--fs-sm);
}
.row-status {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.row-time {
  margin-left: auto;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--faint);
  flex-shrink: 0;
}
.dot.approved {
  background-color: var(--caramel);
}
.dot.rejected {
  background-color: var(--brick);
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

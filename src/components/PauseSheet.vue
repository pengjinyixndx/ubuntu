<template>
  <Teleport to="body">
    <div class="mask">
      <!-- 第一步：那封"信" -->
      <div v-if="step === 'letter'" class="sheet">
        <header class="head">
          <span class="pair"><Critter kind="crab" :size="20" /> <i class="broken"></i> <Critter kind="ginkgo" :size="20" /></span>
          <span class="since">从 {{ sinceText }} 起，你们停在这里</span>
        </header>

        <div class="notes">
          <article v-for="n in notes" :key="n.id" class="note">
            <p class="who">{{ n.who }}</p>
            <p class="line"><em>什么时候</em>{{ n.happened_on || '—' }}</p>
            <p class="line"><em>因为什么</em>{{ n.matter }}</p>
            <p class="line"><em>想要什么</em>{{ n.demand }}</p>
          </article>
        </div>

        <button type="button" class="big" :disabled="busy" @click="makeUp">和好吧</button>
        <button type="button" class="small" @click="step = 'evidence'">再想一想…</button>
      </div>

      <!-- 第二步：TA 的证据（可以左右滑） -->
      <div v-else-if="step === 'evidence'" class="evidence">
        <div class="slider" @scroll="onScroll">
          <section v-for="(c, i) in cards" :key="i" class="card" :class="c.tone">
            <p class="c-kicker">{{ c.kicker }}</p>
            <p class="c-text">{{ c.text }}</p>
            <div v-if="c.photo" class="c-photo">
              <img :src="thumbUrlOf(c.photo)" :data-full="c.photo" alt="" loading="lazy" @error="onImageError" />
            </div>
            <p v-if="c.note" class="c-note">{{ c.note }}</p>
          </section>
          <section class="card last">
            <p class="c-text big-text">矛盾是小事。</p>
            <p class="c-text big-text">TA 还爱着你。</p>
            <button type="button" class="big" :disabled="busy" @click="makeUp">和好吧</button>
            <button type="button" class="small" @click="close">再等一会儿</button>
          </section>
        </div>
        <div class="dots">
          <span v-for="(c, i) in cards" :key="i" :class="{ on: i === page }"></span>
          <span :class="{ on: page === cards.length }"></span>
        </div>
      </div>

      <!-- 第三步：和好了 -->
      <div v-else class="sheet done">
        <span class="pair"><Critter kind="crab" :size="26" /> <i class="joined"></i> <Critter kind="ginkgo" :size="26" /></span>
        <div class="stamp">和好</div>
        <p class="d-time">{{ doneAt }}</p>
        <p class="d-line">{{ iAmHer ? '是小螃蟹先伸的手' : '是你先伸的手' }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePetition } from '../composables/usePetition'
import { useFeed } from '../composables/useFeed'
import { useMilktea } from '../composables/useMilktea'
import { dateTimeLabel, timeLabel } from '../lib/eventLabels'
import { thumbUrlOf, onImageError } from '../lib/image'
import Critter from './Critter.vue'

const emit = defineEmits<{ close: []; done: [] }>()
const { openConflict, notesOf, setConflictStatus, kisses, loadPetition } = usePetition()
const { events, myProfile } = useFeed()
const { iAmHer } = useMilktea()

const step = ref<'letter' | 'evidence' | 'done'>('letter')
const busy = ref(false)
const page = ref(0)
const doneAt = ref('')

const who = (id: string) => (id === myProfile.value?.id ? '你' : iAmHer.value ? '小螃蟹' : '银杏叶')

const notes = computed(() =>
  openConflict.value
    ? notesOf(openConflict.value.id).map((n) => ({ ...n, who: who(n.author) }))
    : []
)

const sinceText = computed(() => {
  const at = openConflict.value?.created_at
  return at ? dateTimeLabel(at) : ''
})

/** TA 的证据：全部来自数据库，一条不编 */
const cards = computed(() => {
  const partnerId = iAmHer.value
    ? events.value.find((e) => e.actor_id !== myProfile.value?.id)?.actor_id ?? ''
    : events.value.find((e) => e.actor_id !== myProfile.value?.id)?.actor_id ?? ''
  const theirs = events.value.filter((e) => !e.revoked_at && e.actor_id === partnerId)
  const out: { kicker: string; text: string; photo?: string; note?: string; tone: string }[] = []

  // 1. TA 最近写的一条
  const noted = theirs.find((e) => e.type === 'note' || e.type === 'diary')
  if (noted?.content) {
    out.push({
      kicker: `这条是 TA ${timeLabel(noted.created_at)}写的`,
      text: noted.content,
      photo: noted.photo_urls?.[0],
      tone: 'paper'
    })
  }

  // 2. 这些天想亲了多少下
  const count = kisses.value
    .filter((k) => k.requester === partnerId)
    .reduce((s, k) => s + (k.count || 1), 0)
  if (count > 0) {
    out.push({
      kicker: '在这些日子里',
      text: `TA 点了 ${count} 次想亲`,
      note: '每一次都是想你了',
      tone: 'warm'
    })
  }

  // 3. 给你留过的券
  const mine = events.value.filter((e) => !e.revoked_at && e.type === 'milktea_issue' && e.actor_id === myProfile.value?.id)
  if (mine.length) {
    const reason = mine.map((e) => (typeof e.meta?.reason === 'string' ? e.meta.reason : '')).filter(Boolean)[0]
    out.push({
      kicker: '你给 TA 留过券',
      text: reason ? `最早那张写着「${reason}」` : `一共 ${mine.length} 张`,
      tone: 'paper'
    })
  }

  // 4. 一起喝过的
  const drinks = events.value.filter((e) => !e.revoked_at && e.type === 'milktea_redeem')
  if (drinks.length) {
    out.push({
      kicker: '你们一起喝了奶茶',
      text: `一共 ${drinks.length} 次`,
      photo: drinks[0]?.photo_urls?.[0],
      note: '最近的一次，照片还留着',
      tone: 'paper'
    })
  }

  // 5. TA 最近发的一张照片
  const shot = theirs.find((e) => e.photo_urls?.length)
  if (shot?.photo_urls?.[0]) {
    out.push({
      kicker: `TA ${timeLabel(shot.created_at)}拍了这张`,
      text: shot.content || '拍的这张还在这儿',
      photo: shot.photo_urls[0],
      tone: 'paper'
    })
  }

  return out
})

function onScroll(e: Event) {
  const el = e.currentTarget as HTMLElement
  page.value = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
}

async function makeUp() {
  if (busy.value || !openConflict.value) return
  busy.value = true
  const { error } = await setConflictStatus(openConflict.value.id, 'resolved')
  busy.value = false
  if (error) return
  doneAt.value = dateTimeLabel(new Date().toISOString())
  step.value = 'done'
  await loadPetition()
  window.setTimeout(() => emit('done'), 2400)
}

function close() {
  emit('close')
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 460;
  background-color: rgba(43, 37, 29, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
}
.sheet {
  width: 100%;
  max-width: calc(var(--app-w) - 44px);
  padding: 20px 18px 16px;
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 20px 52px rgba(60, 44, 20, 0.36);
}
.head {
  text-align: center;
}
.pair {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--caramel);
}
.broken,
.joined {
  display: inline-block;
  width: 34px;
  height: 2px;
}
.broken {
  background-image: linear-gradient(to right, var(--line-strong) 0 6px, transparent 6px 11px, var(--line-strong) 11px 17px, transparent 17px 22px, var(--line-strong) 22px 34px);
}
.joined {
  background-color: var(--brick);
  border-radius: 2px;
}
.since {
  display: block;
  margin-top: 8px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}

.notes {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.note {
  padding: 11px 12px;
  background-color: var(--photo);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.who {
  margin: 0 0 6px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--caramel);
}
.line {
  margin: 4px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--ink-soft);
  word-break: break-word;
}
.line em {
  display: inline-block;
  min-width: 62px;
  margin-right: 6px;
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.big {
  width: 100%;
  margin-top: 16px;
  padding: 13px;
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  letter-spacing: 4px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.55);
  cursor: pointer;
}
.small {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
  background: none;
  border: none;
  cursor: pointer;
}

/* 证据 */
.evidence {
  width: 100%;
  max-width: calc(var(--app-w) - 30px);
}
.slider {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
}
.card {
  flex: 0 0 100%;
  scroll-snap-align: center;
  padding: 20px 18px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 12px 30px rgba(60, 44, 20, 0.24);
  display: flex;
  flex-direction: column;
}
.card.warm {
  background-color: var(--paper);
}
.c-kicker {
  margin: 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--caramel);
}
.c-text {
  margin: 14px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.95;
  color: var(--ink);
  word-break: break-word;
}
.c-photo {
  margin-top: 14px;
  height: 190px;
  border: var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  background-color: var(--paper-deep);
}
.c-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.c-note {
  margin: 12px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--muted);
}
.card.last {
  justify-content: center;
  text-align: center;
}
.big-text {
  font-family: var(--font-hand);
  font-size: var(--fs-xl);
  letter-spacing: 2px;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 12px;
}
.dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(253, 250, 241, 0.4);
}
.dots span.on {
  background-color: var(--photo);
}

/* 和好 */
.done {
  text-align: center;
}
.stamp {
  display: inline-block;
  margin: 18px auto 0;
  padding: 10px 22px;
  font-family: var(--font-hand);
  font-size: var(--fs-xl);
  letter-spacing: 6px;
  text-indent: 6px;
  color: var(--photo);
  background-color: var(--brick);
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px rgba(253, 250, 241, 0.6);
  transform: rotate(-6deg);
  animation: drop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes drop {
  from {
    transform: rotate(-6deg) scale(1.6);
    opacity: 0;
  }
  to {
    transform: rotate(-6deg) scale(1);
    opacity: 1;
  }
}
.d-time {
  margin: 12px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}
.d-line {
  margin: 8px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--caramel);
}
</style>

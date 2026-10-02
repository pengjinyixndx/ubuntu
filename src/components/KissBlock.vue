<template>
  <section class="kiss-block">
    <!-- 小螃蟹（他）——「想亲」只对她有意义，所以只有她看得到 -->
    <div class="person">
      <Critter kind="crab" :size="30" class="face" />
      <span class="who">小螃蟹</span>
      <button v-if="iAmHer" type="button" class="ask" @click="tap">
        <Heart :size="14" :stroke-width="2" :fill="pending ? 'currentColor' : 'none'" />
        <span>想亲</span>
        <span v-if="pending" class="pop">{{ pending }}</span>
      </button>
    </div>

    <div class="person">
      <Critter kind="ginkgo" :size="30" class="face" />
      <span class="who">银杏叶</span>
    </div>

    <p class="foot">
      <span>欠着的亲亲 <b>{{ kissDebt + pending }}</b> 个</span>
      <span v-if="iAmHer" class="dot">·</span>
      <span v-if="iAmHer">今天还能点 <b>{{ leftNow }}</b> 次</span>
    </p>

    <!-- 免费十次用完了 -->
    <Teleport to="body">
      <div v-if="askGo" class="ask-mask" @click.self="askGo = false">
        <div class="ask-box">
          <p class="ask-text">今天已经亲满十次啦，要不要去请愿？</p>
          <div class="ask-acts">
            <button type="button" class="ask-btn ghost" @click="askGo = false">算了</button>
            <button type="button" class="ask-btn go" @click="goPetition">去请愿</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Heart } from 'lucide-vue-next'
import { usePetition } from '../composables/usePetition'
import { useMilktea } from '../composables/useMilktea'
import Critter from './Critter.vue'

const router = useRouter()
const { askKiss, kissDebt, freeLeftToday } = usePetition()
const { iAmHer } = useMilktea()

/* 连点合并：每点一下都重新计时，**距上次点击 10 秒内**都算同一批。
   也就是「一直点就一直续」，停手满了 10 秒才落库成一条「想亲 ×n」。 */
const FREE_WINDOW_MS = 10000

const pending = ref(0)
const askGo = ref(false)
let timer = 0

/** 先攒着，10 秒内没有下一次点击才写进去 */
function bump() {
  window.clearTimeout(timer)
  timer = window.setTimeout(flush, FREE_WINDOW_MS)
}

/** 界面上要立刻减少的那几次（还没写进库的） */
const leftNow = computed(() => Math.max(0, freeLeftToday.value - pending.value))

function tap() {
  // 今天的十次已经点满了（含手上攒着的）：直接问要不要去请愿，不许再往上加
  if (freeLeftToday.value - pending.value <= 0) {
    askGo.value = true
    return
  }
  pending.value += 1
  bump()
}

async function flush() {
  const n = pending.value
  if (!n) return
  const over = n > freeLeftToday.value
  pending.value = 0
  await askKiss(n)
  if (over) askGo.value = true
}

function goPetition() {
  askGo.value = false
  router.push({ path: '/petition', query: { panel: 'kiss' } })
}

onUnmounted(() => {
  window.clearTimeout(timer)
  // 刚点完就切走/关掉，别把那几下丢掉
  if (pending.value > 0) void flush()
})
</script>

<style scoped>
.kiss-block {
  padding: 12px 14px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: var(--border-dashed);
}
.person:first-child {
  border-top: none;
  padding-top: 2px;
}
.face {
  flex-shrink: 0;
  color: var(--caramel);
}
.who {
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  letter-spacing: 1px;
  color: var(--ink);
}

.ask {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 7px 14px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--photo);
  background-color: var(--brick);
  border: none;
  border-radius: var(--r-sm);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
  cursor: pointer;
}
.ask:active {
  transform: scale(0.95);
}
.pop {
  min-width: 18px;
  padding: 0 5px;
  font-family: var(--font-typewriter);
  font-size: 11px;
  line-height: 18px;
  color: var(--brick);
  background-color: var(--photo);
  border-radius: 9px;
  animation: pop 0.32s ease;
}
@keyframes pop {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

.foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  padding-top: 9px;
  border-top: var(--border-dashed);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.foot b {
  font-family: var(--font-serif);
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--caramel);
}
.dot {
  color: var(--faint);
}

/* 超出十次时的问句 */
.ask-mask {
  position: fixed;
  inset: 0;
  z-index: 360;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26px;
  background-color: rgba(43, 37, 29, 0.45);
}
.ask-box {
  width: 100%;
  max-width: calc(var(--app-w) - 52px);
  padding: 20px 18px 16px;
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 18px 46px rgba(60, 44, 20, 0.3);
}
.ask-text {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  line-height: 1.8;
  color: var(--ink);
  text-align: center;
}
.ask-acts {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.ask-btn {
  flex: 1;
  padding: 10px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.ask-btn.ghost {
  color: var(--muted);
  background-color: transparent;
  border: var(--border);
}
.ask-btn.go {
  color: var(--photo);
  background-color: var(--brick);
  border: none;
}
</style>

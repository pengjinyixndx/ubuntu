<template>
  <Teleport to="body">
    <div class="overlay">
      <header class="editor-bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="editor-title">喝奶茶</span>
        <button type="button" class="stamp-btn" :disabled="!canRedeem" @click="save">
          <Loader v-if="saving" :size="14" class="spin" />
          <span v-else>盖章</span>
        </button>
      </header>

      <div class="paper-wrap">
        <!-- 她的集点卡 -->
        <MilkteaCard />

        <!-- 这杯是什么 -->
        <div class="form">
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
            class="mt-note"
            placeholder="今天这杯，想说点什么……"
          ></textarea>
        </div>
      </div>

      <footer class="editor-foot">
        <span v-if="errMsg" class="foot-err">{{ errMsg }}</span>
        <span v-else class="foot-count">{{ quotaHint }}</span>
      </footer>

      <div class="edge-decor" aria-hidden="true">
        <div class="crawler"><Critter kind="crab" :size="40" /></div>
      </div>

      <PublishFlash v-if="flash" type="milktea_redeem" @done="emit('close')" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, Loader } from 'lucide-vue-next'
import { useMilktea } from '../composables/useMilktea'
import { TEA_FLAVORS, TEA_SWEETNESS } from '../lib/options'
import Critter from './Critter.vue'
import MilkteaCard from './MilkteaCard.vue'
import PublishFlash from './PublishFlash.vue'

const emit = defineEmits<{ close: [] }>()
const { drinkable, nextSource, redeem } = useMilktea()

const flavor = ref('')
const sweet = ref('')
const text = ref('')
const saving = ref(false)
const errMsg = ref('')
const flash = ref(false)

const canRedeem = computed(() => drinkable.value > 0 && !saving.value)

const quotaHint = computed(() => {
  if (nextSource.value === 'free') return '这次用「本周免费」'
  if (nextSource.value === 'voucher') return '这次用掉一张奶茶券'
  return '这周的额度用完了'
})

async function save() {
  if (!canRedeem.value) return
  saving.value = true
  errMsg.value = ''

  const { error } = await redeem({
    flavor: flavor.value,
    sweetness: sweet.value,
    content: text.value.trim()
  })
  saving.value = false

  if (error) {
    errMsg.value = '没盖上章，再试一次'
    return
  }
  flavor.value = ''
  sweet.value = ''
  text.value = ''
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

.paper-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px calc(50px + env(safe-area-inset-bottom));
}

/* —— 这杯是什么 —— */
.form {
  margin-top: 14px;
  padding: 16px 15px 14px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}

.mt-block + .mt-block {
  margin-top: 14px;
}
.mt-label {
  display: block;
  margin-bottom: 7px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
/* 标签做成「小印章/小贴纸」的样子，不用圆药丸 */
.chip {
  padding: 6px 11px;
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
  border: 1px solid var(--caramel);
}

.mt-note {
  width: 100%;
  min-height: 84px;
  margin-top: 16px;
  padding-top: 12px;
  resize: none;
  border: none;
  border-top: var(--border-dashed);
  outline: none;
  background-color: transparent;
  font-family: var(--font-song);
  font-size: var(--fs-md);
  line-height: 1.9;
  color: var(--ink);
}
.mt-note::placeholder {
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
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--muted);
}

/* —— 桌面小生物（只有螃蟹：她的卡由他管）—— */
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

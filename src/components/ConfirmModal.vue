<template>
  <Teleport to="body">
    <div class="mask" @click.self="emit('cancel')">
      <div class="sheet">
        <h2 class="title">{{ title }}</h2>
        <p v-if="desc" class="desc">{{ desc }}</p>

        <ul v-if="lines.length" class="lines">
          <li v-for="(l, i) in lines" :key="i">{{ l }}</li>
        </ul>

        <div class="acts">
          <button type="button" class="btn ghost" @click="emit('cancel')">取消</button>
          <button
            type="button"
            class="btn"
            :class="danger ? 'danger' : 'primary'"
            :disabled="left > 0"
            @click="emit('confirm')"
          >
            {{ left > 0 ? `${confirmText}（${left}）` : confirmText }}
          </button>
        </div>

        <p v-if="left > 0" class="hint">先看清上面写的内容，{{ left }} 秒后才能确认</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    desc?: string
    /** 逐条列出来给对方看清（例如券的理由、到期时间） */
    lines?: string[]
    confirmText?: string
    /** 强制等待几秒，默认 3 秒 */
    seconds?: number
    /** 危险操作（驳回、和好这种不可逆的）用红色 */
    danger?: boolean
  }>(),
  { desc: '', lines: () => [], confirmText: '确认', seconds: 3, danger: false }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const left = ref(props.seconds)
let timer = 0

onMounted(() => {
  left.value = props.seconds
  timer = window.setInterval(() => {
    if (left.value > 0) left.value -= 1
    if (left.value <= 0) window.clearInterval(timer)
  }, 1000)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 320;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background-color: rgba(43, 37, 29, 0.45);
  backdrop-filter: blur(2px);
}

.sheet {
  width: 100%;
  max-width: calc(var(--app-w) - 44px);
  padding: 20px 18px 16px;
  background-color: var(--paper);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 18px 46px rgba(60, 44, 20, 0.3);
}

.title {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-xl);
  font-weight: 400;
  color: var(--ink);
}

.desc {
  margin: 8px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--muted);
}

.lines {
  margin: 12px 0 0;
  padding: 12px 14px;
  list-style: none;
  background-color: var(--photo);
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.lines li {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.9;
  color: var(--ink);
  word-break: break-word;
}
.lines li + li {
  margin-top: 4px;
}

.acts {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.btn {
  flex: 1;
  padding: 11px;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  letter-spacing: 1px;
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn.primary {
  color: var(--photo);
  background-color: var(--brick);
  box-shadow: inset 0 0 0 1.5px rgba(253, 250, 241, 0.5);
}
.btn.danger {
  color: var(--photo);
  background-color: #8f3f2c;
}
.btn.ghost {
  color: var(--ink-soft);
  background-color: transparent;
  border: var(--border);
}
.btn:disabled {
  background-color: var(--faint);
  box-shadow: none;
  cursor: not-allowed;
}

.hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--caramel);
  text-align: center;
}
</style>

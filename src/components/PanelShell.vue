<template>
  <Teleport to="body">
    <div class="overlay">
      <header class="bar">
        <button type="button" class="icon-btn" @click="emit('close')" aria-label="关闭">
          <X :size="22" :stroke-width="1.6" />
        </button>
        <span class="title">{{ title }}</span>
        <span class="right"><slot name="action" /></span>
      </header>

      <div class="body">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  flex-direction: column;
  max-width: var(--app-w);
  margin: 0 auto;
  background-color: var(--paper);
  border-left: 1px solid var(--line-strong);
  border-right: 1px solid var(--line-strong);
  padding-top: env(safe-area-inset-top);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
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

.title {
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  color: var(--ink);
  letter-spacing: 2px;
}

.right {
  margin-left: auto;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px calc(28px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>

<template>
  <div class="placeholder-page">
    <NotebookPen :size="44" :stroke-width="1.2" class="ph-icon" />
    <div class="ph-text">日记正在准备中</div>
  </div>
</template>

<script setup lang="ts">
import { NotebookPen } from 'lucide-vue-next'
</script>

<style scoped>
.placeholder-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 130px;
}

.ph-icon {
  color: var(--faint);
}

.ph-text {
  margin-top: 14px;
  font-family: var(--font-hand);
  font-size: var(--fs-xl);
  color: var(--muted);
  letter-spacing: 2px;
}
</style>

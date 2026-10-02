<template>
  <PanelShell title="设置" @close="emit('close')">
    <!-- 奶茶的规则都写在这儿，功能页面上就不啰嗦了 -->
    <section class="block">
      <h3 class="block-title">奶茶的规矩</h3>
      <ul class="rules">
        <li>每周一零点刷新，她这一周有一杯是免费的。</li>
        <li>券是他另外给的，每张都写清楚因何故、到哪天为止。</li>
        <li>她喝的时候先扣这一周的免费，再用券；过期的券就不能用了。</li>
        <li>他自己喝多少都不算数，也不占她的额度。</li>
        <li>喝的时候留一张这一杯的样子，以后翻起来才有画面。</li>
      </ul>
    </section>

    <section class="block">
      <h3 class="block-title">这两件事在哪儿</h3>
      <ul class="rules">
        <li><b>喝奶茶</b>：在「记录」页，记下这一杯。</li>
        <li><b>奶茶券</b>：在「请愿」页，他颁、她讨。</li>
        <li>点「我的」页那张奶茶卡，可以看每张券的明细。</li>
      </ul>
    </section>
  </PanelShell>
</template>

<script setup lang="ts">
import PanelShell from './PanelShell.vue'

const emit = defineEmits<{ close: [] }>()
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
  margin: 0 0 10px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--ink);
}

.rules {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rules li {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.85;
  color: var(--ink-soft);
}
.rules b {
  color: var(--caramel);
  font-weight: 400;
}
</style>

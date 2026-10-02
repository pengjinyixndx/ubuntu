<template>
  <PanelShell title="规则" @close="emit('close')">
    <!-- 奶茶：先把当前状态摆出来（可点开明细），再讲规矩 -->
    <MilkteaCard compact clickable @open="showDetail = true" />

    <section class="block">
      <h3 class="block-title">奶茶</h3>
      <ol class="rules">
        <li>每周一零点刷新，她这一周有一杯是免费的。</li>
        <li>券是他另外给的，每张都写清楚因何故、到哪天为止。</li>
        <li>她喝的时候先扣这一周的免费，再用券。</li>
        <li>过期的券就不能用了，用掉的和过期的都留在明细里。</li>
        <li>他自己喝多少都不算数，也不占她的额度。</li>
        <li>喝的时候留一张这一杯的样子，以后翻起来才有画面。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">在哪儿找</h3>
      <ul class="plain">
        <li><b>喝奶茶</b><span>记录页，记下这一杯</span></li>
        <li><b>奶茶券</b><span>请愿页，他颁、她讨</span></li>
        <li><b>券的明细</b><span>点上面那张卡</span></li>
      </ul>
    </section>

    <section class="block">
      <h3 class="block-title">亲亲</h3>
      <ol class="rules">
        <li>她总想亲你，所以「我的」页小螃蟹那格有个「想亲」，每天可以免费点十次。</li>
        <li>点满十次之后再点，会问要不要去请愿。</li>
        <li>请愿里写清楚为什么想亲，可以附一张照片。</li>
        <li>你这边会收到，同意或者拒绝；同意和请求都会记进时光记录。</li>
        <li>短时间连点好几下，只记一条「想亲 ×n」。</li>
        <li>没想好就先选「待会儿」，那件事会留在「我的 → 待办」里。</li>
      </ol>
    </section>

    <MilkteaDetail v-if="showDetail" @close="showDetail = false" />
  </PanelShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'
import MilkteaDetail from './MilkteaDetail.vue'

const emit = defineEmits<{ close: [] }>()
const showDetail = ref(false)
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
  letter-spacing: 2px;
  color: var(--ink);
}

.rules {
  margin: 0;
  padding-left: 20px;
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

.plain {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.plain li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink-soft);
}
.plain b {
  flex-shrink: 0;
  min-width: 66px;
  font-weight: 400;
  color: var(--caramel);
}
.plain span {
  color: var(--muted);
}
</style>

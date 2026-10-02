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

    <!-- 谁是谁是定死的，这里只报一下，不用人配 -->
    <section class="block">
      <h3 class="block-title">谁是谁</h3>
      <ul class="plain">
        <li>
          <b>小螃蟹</b>
          <span>{{ iAmHe ? '你（先注册的那个）' : '他（先注册的那个）' }}</span>
        </li>
        <li>
          <b>银杏叶</b>
          <span>{{ iAmHer ? '你' : '她' }}</span>
        </li>
      </ul>
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

    <section class="block">
      <h3 class="block-title">心愿</h3>
      <ol class="rules">
        <li>许下的心愿会记进时光记录。</li>
        <li>也可以写上想在什么时候完成。</li>
        <li>做到以后，去「请愿 → 心愿」打个勾就算完成。</li>
        <li>心愿不会过期，只是一直挂在那里提醒你。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">矛盾</h3>
      <ol class="rules">
        <li>谁都可以开始一份矛盾记录。</li>
        <li>两个人都要各写一份：什么时候、因为什么、想要什么。</li>
        <li>两份都写完才算进入，之后每次打开青桃都会弹出。</li>
        <li>选「冷静」不算结束，选「和好」才过去；和好后在「我的 → 历史矛盾」回看。</li>
      </ol>
    </section>

    <MilkteaDetail v-if="showDetail" @close="showDetail = false" />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFeed } from '../composables/useFeed'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'
import MilkteaDetail from './MilkteaDetail.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const showDetail = ref(false)

const iAmHe = computed(() => myProfile.value?.gender === 'male')
const iAmHer = computed(() => myProfile.value?.gender === 'female')
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

/* —— 我是谁 —— */
.who-row {
  display: flex;
  gap: 10px;
}
.who {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px 12px;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
  background-color: transparent;
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--r-sm);
  cursor: pointer;
}
.who.on {
  color: var(--ink);
  background-color: var(--photo);
  border-style: solid;
  border-color: var(--caramel);
  box-shadow: var(--shadow-card);
}
.who:disabled {
  opacity: 0.6;
}
.who-hint {
  margin: 10px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--faint);
}
</style>

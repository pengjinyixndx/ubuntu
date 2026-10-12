<template>
  <PanelShell title="规则" @close="emit('close')">
    <!-- 当前状态放最上面，规则是解释它的 -->
    <MilkteaCard compact clickable @open="showDetail = true" />

    <section class="block">
      <h3 class="block-title">一 · 身份</h3>
      <ul class="plain">
        <li><b>小螃蟹</b><span>他，先注册的那一位</span></li>
        <li><b>银杏叶</b><span>她，后注册的那一位</span></li>
        <li><b>你</b><span>{{ meName }}</span></li>
      </ul>
      <p class="note">本页按你的身份显示；对方的权限只作说明，不在此生效。</p>
    </section>

    <section class="block">
      <h3 class="block-title">二 · 奶茶</h3>
      <ol class="rules">
        <li>每周一 00:00，自动发放「每周免费的一杯」一张，至当周周日 24:00 失效。</li>
        <li>除此以外，奶茶券均由小螃蟹颁发，每张须写明因何故与到期日。</li>
        <li>全部券按颁发时间排成一个队列，先发的先用。</li>
        <li>饮用一次消耗队列中的一张券；已过期的券不得使用。</li>
        <li>银杏叶当周能喝几杯，以手上未使用、未过期的券为准。</li>
        <li>小螃蟹自己的饮用记录仅作留存，不占用任何额度，也不进入队列。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">三 · 亲亲</h3>
      <ol class="rules">
        <li>「想亲」仅由银杏叶发起，每自然日免费十次。</li>
        <li>相隔不超过十秒的连续点击，合并为同一条记录。</li>
        <li>十次用尽后，须以「亲亲请愿」提出：写明理由，可附照片一张。</li>
        <li>请愿由小螃蟹答复，同意或驳回；同意后计入欠账。</li>
        <li>答复可在任意页面直接进行；选择「待会儿」者转入「我的 · 待办」。</li>
        <li>欠账数会显示在双方页面上，写法按身份区分谁欠谁。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">四 · 记录与删除</h3>
      <ol class="rules">
        <li>随笔、日记、照片可各自删除；请求类与亲亲不可自行删除。</li>
        <li>自行删除后，双方均不再可见；本人可在「我的 · 恢复」中找回。</li>
        <li>删除满九十日，由系统永久清除，含所附图片，不可恢复。</li>
        <li>后台的删除不通知双方，亦不可恢复；被用户删除的内容后台仍可见。</li>
        <li>页面上的提示只说明状态变化，不重复本页规则。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">五 · 你的权限</h3>
      <ul class="rights">
        <li v-for="r in rights" :key="r">{{ r }}</li>
      </ul>
    </section>

    <MilkteaDetail v-if="showDetail" @close="showDetail = false" />
  </PanelShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFeed } from '../composables/useFeed'
import { useMilktea } from '../composables/useMilktea'
import PanelShell from './PanelShell.vue'
import MilkteaCard from './MilkteaCard.vue'
import MilkteaDetail from './MilkteaDetail.vue'

const emit = defineEmits<{ close: [] }>()
const { myProfile } = useFeed()
const { iAmHer } = useMilktea()
const showDetail = ref(false)

const meName = computed(() =>
  iAmHer.value ? '银杏叶，下面这些以你的身份生效' : '小螃蟹，下面这些以你的身份生效'
)

/** 同一个系统，两边各有各的权限；这里只列你自己那份 */
const HER_RIGHTS = [
  '讨奶茶券：每周一张由系统自动发放',
  '每天十次「想亲」',
  '以请愿方式再要亲亲，须写理由、可附照片',
  '许愿，并在完成后打勾',
  '开始一份矛盾记录',
  '删除自己发的随笔、日记、照片，可在「我的 · 恢复」找回'
]

const HIS_RIGHTS = [
  '颁发奶茶券，须写因何故与到期日',
  '答复她递来的奶茶券申请与亲亲请愿',
  '答复方式：好呀 / 这次不了 / 待会儿',
  '开始或结束一份矛盾记录，与她各写一份后和好',
  '在「我的 · 恢复」里恢复删掉的文字与照片',
  '在后台彻底删除记录，双方均不可见，且不可恢复'
]

const rights = computed(() => (iAmHer.value ? HER_RIGHTS : HIS_RIGHTS))

/** myProfile 只是为了让 meName 的判定依赖它，避免未加载时闪一下 */
void myProfile
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

.note {
  margin: 11px 0 0;
  padding-top: 10px;
  border-top: var(--border-dashed);
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  line-height: 1.8;
  color: var(--faint);
}

.rights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.rights li {
  position: relative;
  padding-left: 15px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  line-height: 1.85;
  color: var(--ink-soft);
}
.rights li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--caramel);
}
</style>

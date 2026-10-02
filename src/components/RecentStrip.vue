<template>
  <section class="strip">
    <div class="head">
      <span class="t">最近七天</span>
      <span class="s">{{ note }}</span>
    </div>
    <div class="cells">
      <div
        v-for="d in days"
        :key="d.key"
        class="cell"
        :class="{ on: d.count > 0, today: d.today }"
      >
        <span class="mark">{{ d.count > 0 ? d.count : '' }}</span>
        <span class="lbl">{{ d.label }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CoupleEvent } from '../types/domain'

const props = defineProps<{ events: CoupleEvent[] }>()

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

interface Cell {
  key: string
  label: string
  count: number
  today: boolean
}

/** 最近七天（含今天）：谁记了都算，只看"我们这一天有没有留下东西" */
const days = computed<Cell[]>(() => {
  const out: Cell[] = []
  const now = new Date()
  for (let back = 6; back >= 0; back--) {
    const d = new Date(now)
    d.setDate(now.getDate() - back)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)

    const count = props.events.filter((e) => {
      if (e.revoked_at) return false
      const t = new Date(e.created_at).getTime()
      return t >= d.getTime() && t < next.getTime()
    }).length

    out.push({
      key: d.toISOString().slice(0, 10),
      label: back === 0 ? '今天' : WEEK[d.getDay()] ?? '',
      count,
      today: back === 0
    })
  }
  return out
})

/** 一句话说清这七天：连着几天、今天留了没有 */
const note = computed(() => {
  const list = days.value
  const today = list[list.length - 1]
  if (today && today.count > 0) return '今天留过了'

  let streak = 0
  for (let i = list.length - 2; i >= 0; i--) {
    if ((list[i]?.count ?? 0) > 0) streak += 1
    else break
  }
  if (streak > 0) return `之前连着 ${streak} 天`
  return '这几天还空着'
})
</script>

<style scoped>
.strip {
  padding: 13px 14px 11px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.t {
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--ink);
}
.s {
  font-family: var(--font-hand);
  font-size: var(--fs-xs);
  color: var(--caramel);
}

.cells {
  display: flex;
  gap: 6px;
}
.cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 0 5px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-sm);
  background-color: transparent;
}
/* 有记录的那天：盖上一个实实在在的点 */
.cell.on {
  border-style: solid;
  border-color: var(--caramel);
  background-color: rgba(152, 102, 58, 0.08);
}
/* 今天还没留：留一格虚的等着 */
.cell.today {
  border-color: var(--brick);
}
.cell.today.on {
  background-color: rgba(173, 79, 56, 0.09);
}

.mark {
  min-height: 17px;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: var(--caramel);
}
.cell.today .mark {
  color: var(--brick);
}
.lbl {
  font-family: var(--font-song);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--faint);
}
.cell.on .lbl {
  color: var(--muted);
}
</style>

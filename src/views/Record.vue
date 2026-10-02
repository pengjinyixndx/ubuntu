<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">记录</h1>
      <p class="page-date">{{ dateLine }}</p>
      <p class="page-sub">{{ todayLine }}</p>
    </header>

    <div class="entry-list">
      <button
        v-for="item in entries"
        :key="item.name"
        type="button"
        class="entry"
        @click="openEntry(item)"
      >
        <span class="entry-icon"><component :is="item.icon" :size="22" :stroke-width="1.5" /></span>
        <span class="entry-body">
          <span class="entry-name">{{ item.name }}</span>
          <span class="entry-desc">{{ item.desc }}</span>
        </span>
        <span class="entry-last" :class="{ none: !lastOf(item.types) }">{{ lastOf(item.types) || '还没写过' }}</span>
        <ChevronRight :size="18" :stroke-width="1.5" class="entry-arrow" />
      </button>
    </div>

    <NoteEditor v-if="active === 'note'" @close="close" />
    <DiaryEditor v-if="active === 'diary'" @close="close" />
    <PhotoEditor v-if="active === 'photo'" @close="close" />
    <!-- 喝奶茶：只记这一杯；券在请愿页（同一个奶茶系统，页面分开） -->
    <MilkteaRecord v-if="active === 'milktea'" @close="close" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useFeed } from '../composables/useFeed'
import { timeLabel } from '../lib/eventLabels'
import { PenLine, BookOpen, Images, CupSoda, ChevronRight } from 'lucide-vue-next'
import NoteEditor from '../components/NoteEditor.vue'
import DiaryEditor from '../components/DiaryEditor.vue'
import PhotoEditor from '../components/PhotoEditor.vue'
import MilkteaRecord from '../components/MilkteaRecord.vue'

const active = ref('')
const { events, myProfile, loadEvents } = useFeed()

// 直接进本页时也要有数据，否则「上次」算不出来
onMounted(() => {
  if (!events.value.length) loadEvents()
})

/** 每个入口对应动态里的哪些类型（用来算「你上次什么时候记的」） */
const entries = [
  { key: 'note', name: '随笔', desc: '三两句心情，随手记下', icon: PenLine, types: ['note'] },
  { key: 'diary', name: '日记', desc: '完整的一篇，留给今天', icon: BookOpen, types: ['diary'] },
  { key: 'photo', name: '照片', desc: '把这一刻装进相纸', icon: Images, types: ['photo'] },
  { key: 'milktea', name: '喝奶茶', desc: '记一杯奶茶的甜', icon: CupSoda, types: ['milktea_redeem'] }
]

/** 你上次在这里记东西是什么时候（没有就返回空，界面显示「还没写过」） */
function lastOf(types: string[]): string {
  const myId = myProfile.value?.id ?? ''
  // 只看自己写的，不然会显示成对方上次写的时间
  const me = events.value.filter(
    (e) => !e.revoked_at && e.actor_id === myId && types.includes(e.type)
  )
  const newest = me[0]
  return newest ? `上次 ${timeLabel(newest.created_at)}` : ''
}

/** 每天换一句，就像首页那句爱的话一样 */
const LINES = [
  '今天有风，适合写两句',
  '把这一刻按住',
  '这会儿的光，值得留一张',
  '有什么想说，趁还记得',
  '随便写写，以后会谢现在的你',
  '今天过得怎么样',
  '写下来，就不会丢了'
]
const todayLine = computed(() => {
  const d = new Date()
  const dayIndex = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
  )
  return LINES[dayIndex % LINES.length] ?? LINES[0]
})

/** 页头那行小日期 */
const dateLine = computed(() => {
  const d = new Date()
  const week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()] ?? ''
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`
})



function openEntry(item: { key: string }) {
  active.value = item.key
}

function close() {
  active.value = ''
}
</script>

<style scoped>
.page {
  padding: calc(18px + env(safe-area-inset-top)) 20px 24px;
}

.page-head {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-xxl);
  font-weight: 400;
  color: var(--ink);
}

.page-date {
  margin: 7px 0 0;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--faint);
}

.entry-last {
  font-family: var(--font-typewriter);
  font-size: 10.5px;
  color: var(--caramel);
  white-space: nowrap;
}
.entry-last.none {
  color: var(--faint);
}

.page-sub {
  margin: 6px 0 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--muted);
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.entry:active {
  transform: scale(0.98);
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  color: var(--caramel);
  border: var(--border-dashed);
  border-radius: var(--r-md);
}

.entry-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entry-name {
  font-family: var(--font-song);
  font-size: var(--fs-md);
  color: var(--ink);
}

.entry-desc {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  color: var(--muted);
}

.entry-arrow {
  flex-shrink: 0;
  color: var(--faint);
}
</style>

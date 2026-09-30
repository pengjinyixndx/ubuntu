<template>
  <div class="page">
    <header class="page-head">
      <h1 class="page-title">记录</h1>
      <p class="page-sub">记下此刻，留给以后翻</p>
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
        <ChevronRight :size="18" :stroke-width="1.5" class="entry-arrow" />
      </button>
    </div>

    <NoteEditor v-if="active === 'note'" @close="close" />
    <DiaryEditor v-if="active === 'diary'" @close="close" />
    <PhotoEditor v-if="active === 'photo'" @close="close" />
    <MilkteaEditor v-if="active === 'milktea'" @close="close" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PenLine, BookOpen, Images, CupSoda, ChevronRight } from 'lucide-vue-next'
import NoteEditor from '../components/NoteEditor.vue'
import DiaryEditor from '../components/DiaryEditor.vue'
import PhotoEditor from '../components/PhotoEditor.vue'
import MilkteaEditor from '../components/MilkteaEditor.vue'

const active = ref('')

const entries = [
  { key: 'note', name: '随笔', desc: '三两句心情，随手记下', icon: PenLine },
  { key: 'diary', name: '日记', desc: '完整的一篇，留给今天', icon: BookOpen },
  { key: 'photo', name: '照片', desc: '把这一刻装进相纸', icon: Images },
  { key: 'milktea', name: '喝奶茶', desc: '记一杯奶茶的甜', icon: CupSoda }
]

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

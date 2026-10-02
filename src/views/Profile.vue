<template>
  <div class="profile-page">
    <!-- 名片：贴上相纸，盖一枚天数印章 -->
    <section class="id-card">
      <span class="tape"></span>
      <div class="avatar">{{ initial }}</div>
      <div class="id-info">
        <div class="nickname">{{ displayName }}</div>
        <div class="sub">在一起的第 {{ days }} 天</div>
        <p v-if="kissDebt > 0" class="debt">还欠着 {{ kissDebt }} 个亲亲</p>
      </div>
      <div class="stamp">
        <span class="stamp-num">{{ days }}</span>
        <span class="stamp-unit">天</span>
      </div>
    </section>

    <!-- 数一数一起攒下的东西 -->
    <section class="stats">
      <div class="stat">
        <span class="stat-num">{{ photoCount }}</span>
        <span class="stat-label">相片</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ wishCount }}</span>
        <span class="stat-label">心愿</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ eventCount }}</span>
        <span class="stat-label">记录</span>
      </div>
    </section>

    <!-- 待办：等她等他回的事都摆这儿 -->
    <section v-if="todos.length" class="section">
      <header class="section-head">
        <h2 class="section-title">待办</h2>
        <span class="section-note">{{ todos.length }} 件</span>
      </header>
      <ul class="todo-list">
        <li v-for="t in todos" :key="t.key" class="todo" @click="openTodo(t)">
          <span class="todo-dot"></span>
          <span class="todo-text">{{ t.text }}</span>
          <ChevronRight :size="16" :stroke-width="1.6" class="todo-arrow" />
        </li>
      </ul>
    </section>

    <!-- 亲亲：两个人都摆出来，想亲在小螃蟹那格 -->
    <section class="section">
      <header class="section-head">
        <h2 class="section-title">亲亲</h2>
      </header>
      <KissBlock />
    </section>

    <!-- 奶茶卡：本周还能喝几杯（点开看每张券的明细） -->
    <MilkteaCard compact clickable @open="showMilkteaDetail = true" />

    <!-- 照片墙：这里只给个入口 + 最近几张的预览，点开才详细展示 -->
    <section class="section">
      <header class="section-head">
        <h2 class="section-title">照片墙</h2>
        <span class="section-note">共 {{ photos.length }} 张</span>
      </header>

      <button type="button" class="wall-entry" @click="showWall = true">
        <span class="wall-strip">
          <span v-for="p in previewPhotos" :key="p.id" class="strip-cell">
            <img :src="p.url" alt="" loading="lazy" @error="onImgError" />
          </span>
          <span v-if="!previewPhotos.length" class="strip-empty">还没有照片</span>
          <span v-else-if="photos.length > previewPhotos.length" class="strip-more">
            +{{ photos.length - previewPhotos.length }}
          </span>
        </span>
        <span class="wall-go">
          查看全部
          <ChevronRight :size="15" :stroke-width="1.8" />
        </span>
      </button>
    </section>

    <!-- 心愿单 -->
    <section class="section">
      <header class="section-head">
        <h2 class="section-title">心愿单</h2>
        <span class="section-note">共 {{ wishes.length }} 个</span>
      </header>

      <div v-if="loading && !wishes.length" class="wish-list">
        <div v-for="i in 3" :key="'skw-' + i" class="wish-item skeleton-row"></div>
      </div>

      <ul v-else-if="wishes.length" class="wish-list">
        <li v-for="w in wishes" :key="w.id" class="wish-item" :class="{ done: w.done }">
          <span class="wish-check" :class="{ on: w.done }">
            <Check v-if="w.done" :size="12" :stroke-width="2.6" />
          </span>
          <div class="wish-body">
            <p class="wish-text">{{ w.content }}</p>
            <p class="wish-date">
              {{ w.done ? '已经做到啦' : w.wantAt ? `想在 ${w.wantAt} 完成` : '没定时间' }}
            </p>
          </div>
        </li>
      </ul>

      <div v-else class="empty">
        <Sparkles :size="30" :stroke-width="1.2" class="empty-icon" />
        <span class="empty-text">还没有心愿，去「请愿」许一个吧</span>
      </div>
    </section>

    <!-- 菜单清单 -->
    <section class="menu">
      <div class="menu-item" @click="showRules = true">
        <Settings :size="18" :stroke-width="1.5" class="mi-icon" />
        <span class="mi-text">设置</span>
        <ChevronRight :size="18" :stroke-width="1.5" class="mi-arrow" />
      </div>
      <div class="menu-item" @click="handleLogout">
        <LogOut :size="18" :stroke-width="1.5" class="mi-icon logout" />
        <span class="mi-text logout">退出登录</span>
      </div>
    </section>

    <!-- 奶茶券明细 -->
    <MilkteaDetail v-if="showMilkteaDetail" @close="showMilkteaDetail = false" />

    <!-- 照片墙（详细展示） -->
    <PhotoWall v-if="showWall" @close="showWall = false" />

    <!-- 设置（奶茶规矩都写在这里） -->
    <RulesPanel v-if="showRules" @close="showRules = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { Settings, LogOut, ChevronRight, Sparkles, Check } from 'lucide-vue-next'
import { getTogetherDays } from '../composables/useTogether'
import { useFeed } from '../composables/useFeed'
import { usePetition } from '../composables/usePetition'
import { USE_MOCK } from '../lib/dataSource'
import MilkteaCard from '../components/MilkteaCard.vue'
import MilkteaDetail from '../components/MilkteaDetail.vue'
import PhotoWall from '../components/PhotoWall.vue'
import RulesPanel from '../components/RulesPanel.vue'
import KissBlock from '../components/KissBlock.vue'
import { actorLabel } from '../lib/eventLabels'

const router = useRouter()
const { events, myProfile, loading, loadEvents, resetFeed } = useFeed()
const { wishList, kissDebt, pendingKisses, pendingRequests, loadPetition, resetPetition } =
  usePetition()

/* —— 待办：别人递过来、还等他回的事 —— */
interface Todo {
  key: string
  text: string
  panel: string
}
const todos = computed<Todo[]>(() => {
  const out: Todo[] = []
  for (const k of pendingKisses.value) {
    out.push({ key: `k${k.id}`, text: `${actorLabel(k.requester, myProfile.value?.id ?? '', myProfile.value?.gender)} 想亲你，等你的回话`, panel: 'kiss' })
  }
  for (const r of pendingRequests.value) {
    out.push({ key: `m${r.id}`, text: `${actorLabel(r.requester, myProfile.value?.id ?? '', myProfile.value?.gender)} 想讨一杯奶茶，等你回`, panel: 'milktea' })
  }
  return out
})
function openTodo(t: Todo) {
  router.push({ path: '/petition', query: { panel: t.panel } })
}

const showMilkteaDetail = ref(false)
const showRules = ref(false)

const days = getTogetherDays()
const displayName = computed(() => myProfile.value?.display_name || '我的账号')
const initial = computed(() => displayName.value.trim().charAt(0) || '青')

// —— 从统一动态里挑出照片与心愿 ——
interface PhotoItem {
  id: string
  url: string
  caption: string
  createdAt: string
}
interface WishItem {
  id: string
  content: string
  wantAt: string
  done: boolean
}

const photos = computed<PhotoItem[]>(() => {
  const items: PhotoItem[] = []
  // 不分出处：随笔的随手拍、照片动态，只要有图就收进照片墙
  for (const ev of events.value) {
    if (!ev.photo_urls?.length) continue
    for (const url of ev.photo_urls) {
      items.push({
        id: `${ev.id}-${url}`,
        url,
        caption: ev.content || '',
        createdAt: ev.created_at
      })
    }
  }
  return items
})

/* 照片墙：这里只放一个入口，点开才是详细展示（保存到本地在弹层里） */
const showWall = ref(false)
/** 入口上预览最近 4 张 */
const previewPhotos = computed(() => photos.value.slice(0, 4))

// 心愿单以请愿页维护的那份为准（可以标记完成）
const wishes = computed<WishItem[]>(() =>
  wishList.value.map((w) => ({
    id: w.id,
    content: w.content,
    wantAt: formatWantAt(w.want_at || ''),
    done: w.done
  }))
)

const photoCount = computed(() => photos.value.length)
const wishCount = computed(() => wishes.value.length)
const eventCount = computed(() => events.value.length)

/** 心愿时间 'YYYY-MM-DD' -> '2026年11月1日' */
function formatWantAt(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 图片加载失败时换成暖色占位，避免破图 */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3ead4"/><g fill="none" stroke="#98663a" stroke-width="2"><rect x="165" y="112" width="70" height="52"/><circle cx="180" cy="128" r="5"/><path d="M165 164 L190 134 L215 164"/></g><text x="200" y="205" font-family="serif" font-size="15" fill="#b3a588" text-anchor="middle">暂无图片</text></svg>`
  )
function onImgError(e: Event) {
  const img = e.currentTarget as HTMLImageElement
  if (img.src !== PLACEHOLDER) img.src = PLACEHOLDER
}

const handleLogout = async () => {
  if (!USE_MOCK) {
    await supabase.auth.signOut()
  }
  // 关键：清掉内存里的单例，否则换账号进来还是上一个人的档案
  resetFeed()
  resetPetition()
  router.replace('/login')
}

onMounted(() => {
  // 直入本页（例如刷新在 /profile）时，也保证有数据可展示
  if (!events.value.length) loadEvents()
  if (!wishList.value.length) loadPetition()
})
</script>

<style scoped>
.profile-page {
  padding: 22px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* —— 名片 —— */
.id-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 18px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}

.tape {
  position: absolute;
  top: -11px;
  left: 40px;
  width: 56px;
  height: 20px;
  transform: rotate(-5deg);
  background-color: var(--tape);
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 6px,
    rgba(255, 255, 255, 0.35) 6px,
    rgba(255, 255, 255, 0.35) 12px
  );
}

.avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--paper-deep);
  border: var(--border);
  border-radius: var(--r-sm);
  color: var(--caramel);
  font-family: var(--font-hand);
  font-size: 30px;
  line-height: 1;
}

.id-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-family: var(--font-song);
  font-size: var(--fs-lg);
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--ink);
}

.sub {
  margin-top: 4px;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--muted);
}

/* 欠亲亲：名字下面那一行小字 */
.debt {
  margin: 5px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--brick);
}

/* 天数印章：暗砖红，斜斜盖上去 */
.stamp {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 8px 10px;
  border: 1.5px solid var(--brick);
  border-radius: var(--r-md);
  color: var(--brick);
  transform: rotate(8deg);
  box-shadow: inset 0 0 0 2px var(--photo), inset 0 0 0 3px var(--brick);
}
.stamp-num {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  font-weight: 700;
  line-height: 1;
}
.stamp-unit {
  margin-top: 2px;
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
}

/* —— 统计 —— */
.stats {
  display: flex;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 6px;
}
.stat + .stat {
  border-left: var(--border-dashed);
}
.stat-num {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}
.stat-label {
  font-family: var(--font-song);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--muted);
}

/* —— 分区标题 —— */
.section {
  display: flex;
  flex-direction: column;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: var(--border-dashed);
}
.section-title {
  margin: 0;
  font-family: var(--font-hand);
  font-size: var(--fs-lg);
  font-weight: 400;
  letter-spacing: 2px;
  color: var(--ink);
}
.section-note {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--faint);
}

/* —— 照片墙入口：一排预览 + 查看全部（详细展示在弹层里）—— */
.wall-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 13px;
  text-align: left;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.wall-entry:active {
  transform: scale(0.985);
}

.wall-strip {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.strip-cell {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: var(--border);
  border-radius: var(--r-sm);
  background-color: var(--paper-deep);
}
.strip-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.strip-empty {
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--faint);
}
.strip-more {
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  color: var(--faint);
}

.wall-go {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--caramel);
}

.skeleton-row {
  animation: pulse 1.5s ease infinite;
}

/* —— 待办 —— */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.todo {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 13px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}
.todo:active {
  transform: scale(0.988);
}
.todo-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--brick);
  animation: pulse 1.8s ease infinite;
}
.todo-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-song);
  font-size: var(--fs-sm);
  color: var(--ink);
}
.todo-arrow {
  flex-shrink: 0;
  color: var(--faint);
}

/* —— 心愿单 —— */
.wish-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wish-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 14px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
}
.wish-check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--line-strong);
  border-radius: var(--r-sm);
  background-color: var(--paper);
  color: var(--photo);
}
.wish-check.on {
  background-color: var(--caramel);
  border-color: var(--caramel);
}
.wish-item.done .wish-text {
  color: var(--faint);
  text-decoration: line-through;
}
.wish-item.done .wish-date {
  color: var(--faint);
}
.wish-body {
  flex: 1;
  min-width: 0;
}
.wish-text {
  margin: 0;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  line-height: 1.7;
  color: var(--ink);
  word-break: break-word;
}
.wish-date {
  margin: 5px 0 0;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  color: var(--caramel);
}

.wish-item.skeleton-row {
  height: 58px;
  border-style: dashed;
}

/* —— 空状态 —— */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 16px;
  border: var(--border-dashed);
  border-radius: var(--r-sm);
}
.empty-icon {
  color: var(--faint);
}
.empty-text {
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  letter-spacing: 1px;
  color: var(--faint);
  text-align: center;
}

/* —— 菜单清单 —— */
.menu {
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--line);
}
.menu-item:last-child {
  border-bottom: none;
}
.mi-icon {
  color: var(--muted);
}
.mi-text {
  flex: 1;
  font-family: var(--font-song);
  font-size: var(--fs-base);
  color: var(--ink);
}
.mi-arrow {
  color: var(--faint);
}
.logout {
  color: var(--brick);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
</style>

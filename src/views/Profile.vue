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

    <!-- 她的奶茶卡：本周还能喝几杯（他管） -->
    <MilkteaCard compact />

    <!-- 照片墙 -->
    <section class="section">
      <header class="section-head">
        <h2 class="section-title">照片墙</h2>
        <span class="section-note">共 {{ photos.length }} 张</span>
      </header>

      <div v-if="loading && !photos.length" class="photo-wall">
        <div v-for="i in 4" :key="'sk-' + i" class="polaroid skeleton"></div>
      </div>

      <div v-else-if="photos.length" class="photo-wall">
        <figure
          v-for="(p, i) in photos"
          :key="p.id"
          class="polaroid"
          :class="tapeSide(i)"
          :style="{ transform: `rotate(${rotate(i)}deg)` }"
        >
          <span class="tape"></span>
          <div class="polaroid-img">
            <img :src="p.url" :alt="p.caption || '照片'" loading="lazy" @error="onImgError" />
          </div>
          <figcaption v-if="p.caption" class="polaroid-cap">{{ p.caption }}</figcaption>
        </figure>
      </div>

      <div v-else class="empty">
        <Images :size="30" :stroke-width="1.2" class="empty-icon" />
        <span class="empty-text">还没有照片，去「记录」发第一张吧</span>
      </div>
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
      <div class="menu-item">
        <Settings :size="18" :stroke-width="1.5" class="mi-icon" />
        <span class="mi-text">设置</span>
        <ChevronRight :size="18" :stroke-width="1.5" class="mi-arrow" />
      </div>
      <div class="menu-item" @click="handleLogout">
        <LogOut :size="18" :stroke-width="1.5" class="mi-icon logout" />
        <span class="mi-text logout">退出登录</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { Settings, LogOut, ChevronRight, Images, Sparkles, Check } from 'lucide-vue-next'
import { getTogetherDays } from '../composables/useTogether'
import { useFeed } from '../composables/useFeed'
import { usePetition } from '../composables/usePetition'
import { USE_MOCK } from '../lib/dataSource'
import MilkteaCard from '../components/MilkteaCard.vue'

const router = useRouter()
const { events, myProfile, loading, loadEvents } = useFeed()
const { wishList, kissDebt, loadPetition } = usePetition()

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
  for (const ev of events.value) {
    if (ev.type !== 'photo' || !ev.photo_urls?.length) continue
    for (const url of ev.photo_urls) {
      items.push({ id: `${ev.id}-${url}`, url, caption: ev.content || '', createdAt: ev.created_at })
    }
  }
  return items
})

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

// —— 照片墙的「手贴」姿态：用下标做稳定的小角度旋转与胶带位置 ——
const ROTATIONS = [-2.4, 1.7, -1.2, 2.6, -2.9, 1.3, -1.8, 2.2]
function rotate(i: number): number {
  return ROTATIONS[i % ROTATIONS.length] ?? 0
}
function tapeSide(i: number): string {
  const mod = i % 3
  if (mod === 1) return 'tape-left'
  if (mod === 2) return 'tape-right'
  return 'tape-center'
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

/* —— 照片墙 —— */
.photo-wall {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 12px;
  padding-top: 6px;
}

.polaroid {
  position: relative;
  margin: 0;
  padding: 8px 8px 0;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  transition: transform 0.25s ease;
}
.polaroid:active {
  transform: scale(1.03) !important;
}

.polaroid .tape {
  top: -9px;
  width: 44px;
  height: 16px;
  z-index: 1;
}
.polaroid.tape-left .tape {
  left: 12px;
  transform: rotate(-7deg);
}
.polaroid.tape-right .tape {
  left: auto;
  right: 12px;
  transform: rotate(6deg);
}
.polaroid.tape-center .tape {
  left: 50%;
  transform: translateX(-50%) rotate(-3deg);
}

.polaroid-img {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: var(--paper-deep);
  border: var(--border);
  border-radius: var(--r-sm);
}
.polaroid-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.polaroid-cap {
  margin: 0;
  padding: 8px 2px 10px;
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--ink-soft);
  text-align: center;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.polaroid.skeleton {
  aspect-ratio: 4 / 5;
  animation: pulse 1.5s ease infinite;
}
.skeleton-row {
  animation: pulse 1.5s ease infinite;
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

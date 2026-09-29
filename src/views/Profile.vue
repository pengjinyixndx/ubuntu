<template>
  <div class="profile-page">
    <!-- 名片 -->
    <div class="id-card">
      <span class="tape"></span>
      <div class="avatar">
        <User :size="28" :stroke-width="1.4" />
      </div>
      <div class="id-info">
        <div class="nickname">我的账号</div>
        <div class="sub">在一起的第 1 天</div>
      </div>
    </div>

    <!-- 菜单清单 -->
    <div class="menu">
      <div class="menu-item">
        <Settings :size="18" :stroke-width="1.5" class="mi-icon" />
        <span class="mi-text">设置</span>
        <ChevronRight :size="18" :stroke-width="1.5" class="mi-arrow" />
      </div>
      <div class="menu-item" @click="handleLogout">
        <LogOut :size="18" :stroke-width="1.5" class="mi-icon logout" />
        <span class="mi-text logout">退出登录</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { User, Settings, LogOut, ChevronRight } from 'lucide-vue-next'

const router = useRouter()

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.replace('/login')
}
</script>

<style scoped>
.profile-page {
  padding: 22px 20px;
}

/* —— 名片 —— */
.id-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 20px;
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
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--paper-deep);
  border: var(--border);
  border-radius: var(--r-sm);
  color: var(--caramel);
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
  font-size: var(--fs-md);
  color: var(--muted);
}

/* —— 菜单清单 —— */
.menu {
  margin-top: 20px;
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
</style>

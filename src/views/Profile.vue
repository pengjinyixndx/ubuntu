<template>
  <div class="profile-page">
    <div class="user-card">
      <div class="avatar">👤</div>
      <div class="user-info">
        <div class="nickname">我的账号</div>
        <div class="desc">在一起的第 1 天</div>
      </div>
    </div>

    <div class="menu-list">
      <div class="menu-item">
        <span>设置</span>
        <span class="arrow">›</span>
      </div>
      <div class="menu-item" @click="handleLogout">
        <span class="logout">退出登录</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'


const router = useRouter()

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.replace('/login')
}

</script>

<style scoped>
.profile-page {
  padding: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #ffe4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.user-info .nickname {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.user-info .desc {
  font-size: 13px;
  color: #999;
}

.menu-list {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f7f8fa;
  font-size: 15px;
  color: #333;
}

.menu-item:last-child {
  border-bottom: none;
}

.arrow {
  color: #ccc;
  font-size: 18px;
}

.logout {
  color: #ff4d4f;
  width: 100%;
  text-align: center;
}
</style>

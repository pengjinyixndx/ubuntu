<template>
  <div class="home">
    <h1>欢迎来到你们两人的专属空间</h1>
    <button @click="logout">退出登录</button>
  </div>
</template>

<script setup lang="ts">
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
const router = useRouter()

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="login-wrap">
    <div class="card">
      <h2>双人私密空间登录</h2>
      <input
        v-model="email"
        type="email"
        placeholder="邮箱"
      />
      <input
        v-model="password"
        type="password"
        placeholder="密码"
      />
      <button @click="handleLogin">登录</button>
      <p v-if="msg" class="msg">{{ msg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const msg = ref('')

const handleLogin = async () => {
  msg.value = ''
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (error) {
    msg.value = error.message
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f5;
}
.card {
  width: 320px;
  padding: 32px;
  background: white;
  border-radius: 16px;
}
input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin:12px 0;
  padding:12px;
  border:1px solid #ddd;
  border-radius:8px;
}
button {
  width:100%;
  padding:12px;
  background:#42b983;
  color:white;
  border:none;
  border-radius:8px;
  cursor:pointer;
}
.msg {
  color:red;
  text-align:center;
}
</style>

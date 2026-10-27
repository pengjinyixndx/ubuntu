<template>
  <div class="login-wrap">
    <div class="postcard">
      <span class="tape"></span>

      <div class="card-head">
        <h1 class="title-zh">青桃</h1>
        <div class="title-en">PRIVATE&nbsp;LETTER</div>
      </div>

      <div class="card-rule"></div>

      <form @submit.prevent="handleLogin">
        <div class="field">
          <label class="field-label" for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请填写邮箱"
            autocomplete="username"
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请填写密码"
            autocomplete="current-password"
          />
        </div>

        <button class="btn-stamp" type="submit" :disabled="submitting">
          {{ submitting ? '正在登录…' : '登 录' }}
        </button>

        <p v-if="msg" class="msg" role="alert">{{ msg }}</p>
      </form>

      <div class="card-foot">只属于两个人的信</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import { useFeed } from '../composables/useFeed'
import { usePetition } from '../composables/usePetition'

const router = useRouter()
const { resetFeed } = useFeed()
const { resetPetition } = usePetition()
const email = ref('')
const password = ref('')
const msg = ref('')
const submitting = ref(false)

/** 把 Supabase 的英文错误翻成人话；认不出来时给一句能重试的提示 */
function loginErrorText(error: { message?: string; status?: number } | null): string {
  const raw = (error?.message ?? '').toLowerCase()
  if (raw.includes('invalid login credentials') || raw.includes('invalid_grant')) {
    return '邮箱或密码不对，再核对一下'
  }
  if (raw.includes('email not confirmed')) {
    return '邮箱还没验证，去邮件里点一下确认链接'
  }
  if (raw.includes('too many') || raw.includes('rate limit') || error?.status === 429) {
    return '试得太频繁了，过一会儿再来'
  }
  if (raw.includes('fetch') || raw.includes('network') || raw.includes('load failed')) {
    return '连不上服务器，检查一下网络'
  }
  return '登录没成功，再试一次'
}

const handleLogin = async () => {
  if (submitting.value) return
  msg.value = ''

  const mail = email.value.trim()
  if (!mail || !password.value) {
    msg.value = '把邮箱和密码都填上吧'
    return
  }

  submitting.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: mail,
      password: password.value
    })
    if (error) {
      msg.value = loginErrorText(error)
      return
    }
    // 换账号登录前先清干净，否则还是上一个人的档案（两个账号会指向同一个人）
    resetFeed()
    resetPetition()
    await router.push('/')
  } catch {
    msg.value = '连不上服务器，检查一下网络'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
@supports (min-height: 100dvh) {
  .login-wrap {
    min-height: 100dvh;
  }
}

/* —— 明信片 —— */
.postcard {
  position: relative;
  width: 300px;
  padding: 32px 28px 24px;
  background-color: var(--photo);
  border: var(--border);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-card);
  transform: rotate(-1deg);
}

.tape {
  position: absolute;
  top: -11px;
  left: 50%;
  width: 64px;
  height: 22px;
  transform: translateX(-50%) rotate(-3deg);
  background-color: var(--tape);
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 6px,
    rgba(255, 255, 255, 0.35) 6px,
    rgba(255, 255, 255, 0.35) 12px
  );
  box-shadow: 0 1px 2px rgba(84, 62, 30, 0.12);
}

.card-head {
  text-align: center;
}

.title-zh {
  font-family: var(--font-song);
  font-size: var(--fs-xxl);
  letter-spacing: 8px;
  text-indent: 8px;
  color: var(--ink);
}

.title-en {
  margin-top: 6px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 3px;
  color: var(--muted);
}

.card-rule {
  margin: 20px 0 18px;
  border-top: var(--border-dashed);
}

/* —— 信笺横线输入 —— */
.field {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  margin-bottom: 2px;
  font-family: var(--font-typewriter);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--muted);
}

.field input {
  width: 100%;
  padding: 8px 2px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line-strong);
  font-family: var(--font-typewriter);
  font-size: var(--fs-base);
  color: var(--ink);
  transition: border-color 0.2s ease;
}

.field input::placeholder {
  color: var(--faint);
}

.field input:focus {
  border-bottom-color: var(--caramel);
}

/* —— 墨印按钮 —— */
.btn-stamp {
  width: 100%;
  margin-top: 8px;
  padding: 13px;
  background-color: var(--ink);
  color: var(--paper);
  font-family: var(--font-typewriter);
  font-size: var(--fs-base);
  letter-spacing: 8px;
  text-indent: 8px;
  border-radius: var(--r-sm);
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-stamp:hover {
  background-color: var(--caramel);
}

.btn-stamp:disabled,
.btn-stamp:disabled:hover {
  background-color: var(--faint);
  cursor: not-allowed;
  transform: none;
}

.btn-stamp:active {
  transform: translateY(1px);
}

.msg {
  margin-top: 14px;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  text-align: center;
  color: var(--brick);
}

.card-foot {
  margin-top: 20px;
  text-align: center;
  font-family: var(--font-hand);
  font-size: var(--fs-md);
  color: var(--muted);
}
</style>

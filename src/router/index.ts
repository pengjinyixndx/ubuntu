import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { User } from '@supabase/supabase-js'
import MainLayout from '../layouts/MainLayout.vue'
import { USE_MOCK } from '../lib/dataSource'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { title: '首页', requiresAuth: true }
      },
      {
        path: 'record',
        name: 'Record',
        component: () => import('../views/Record.vue'),
        meta: { title: '记录', requiresAuth: true }
      },
      {
        path: 'petition',
        name: 'Petition',
        component: () => import('../views/Petition.vue'),
        meta: { title: '请愿', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '我的', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 登录态缓存。
 * 之前每次切 Tab 都调用 supabase.auth.getUser()，而 getUser() 每次都会向
 * /auth/v1/user 发一次网络请求去校验会话（见 @supabase/auth-js 源码），
 * 这是底部导航「响应很慢」的主因。现在只校验一次并缓存，会话变化时再同步。
 */
let cachedUser: User | null = null
let checked = false

async function getCachedUser(): Promise<User | null> {
  if (checked) return cachedUser
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase.auth.getUser()
  cachedUser = data.user ?? null
  checked = true
  return cachedUser
}

// 登录 / 登出 / 刷新 token 时同步缓存，避免「退出后仍认为已登录」
if (!USE_MOCK) {
  import('../lib/supabase').then(({ supabase }) => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        cachedUser = null
        checked = true
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        cachedUser = session?.user ?? null
        checked = true
      }
    })
  })
}

// 全局前置守卫：使用 Supabase 官方接口校验登录态
router.beforeEach(async (to) => {
  // 本地演示模式下没有账号体系，直接放行
  if (USE_MOCK) return true

  const user = await getCachedUser()
  const isLoggedIn = !!user

  if (to.meta.requiresAuth && !isLoggedIn) return '/login'
  if (to.path === '/login' && isLoggedIn) return '/home'
  return true
})

export default router

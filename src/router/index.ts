import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
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

// 全局前置守卫：使用 Supabase 官方接口校验登录态
router.beforeEach(async (to, _from, next) => {
  // 本地演示模式下没有账号体系，直接放行
  if (USE_MOCK) {
    next()
    return
  }

  // 调用 getUser 获取当前登录用户，自动校验会话有效性
  const { supabase } = await import('../lib/supabase')
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && isLoggedIn) {
    next('/home')
  } else {
    next()
  }
})

export default router

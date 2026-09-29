import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import { supabase } from '../lib/supabase' // 引入你的 supabase 实例

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
        path: 'diary',
        name: 'Diary',
        component: () => import('../views/Diary.vue'),
        meta: { title: '日记', requiresAuth: true }
      },
      {
        path: 'album',
        name: 'Album',
        component: () => import('../views/Album.vue'),
        meta: { title: '相册', requiresAuth: true }
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
  // 调用 getUser 获取当前登录用户，自动校验会话有效性
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

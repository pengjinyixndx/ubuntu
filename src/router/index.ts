import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import { USE_MOCK } from '../lib/dataSource'
import { ensureAuthReady, session } from '../lib/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    // 管理后台：独立账号、独立登录，跟两人那套完全不是一个逻辑。
    // 这里不加 requiresAuth，它的门槛由页面自己把（后台账号标记 is_admin）。
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminPage.vue'),
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

// 全局前置守卫：读内存里的会话镜像，瞬时、零网络、不阻塞切页
router.beforeEach(async (to) => {
  // 管理后台自成一套，不走这里的登录判断
  if (to.path.startsWith('/admin')) return true

  // 本地演示模式下没有账号体系，直接放行
  if (USE_MOCK) return true

  // 冷启动首次会等 SDK 从 localStorage 恢复会话；之后都是瞬时
  await ensureAuthReady()
  const isLoggedIn = !!session.value

  if (to.meta.requiresAuth && !isLoggedIn) return '/login'
  if (to.path === '/login' && isLoggedIn) return '/home'
  return true
})

export default router

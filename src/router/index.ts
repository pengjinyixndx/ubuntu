import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

// 页面组件
const Login = () => import('../views/Login.vue')
const Home = () => import('../views/Home.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/',
      name: 'home',
      component: Home,
      // 路由守卫：未登录强制跳登录页
      beforeEnter: async (to, from, next) => {
        const { data } = await supabase.auth.getSession()
        if (data.session) next()
        else next('/login')
      }
    }
  ]
})

export default router

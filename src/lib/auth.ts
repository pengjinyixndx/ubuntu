/* ============================================================
   青桃 · 会话管理（单一数据源镜像）

   登录态由 Supabase SDK 持久化在 localStorage，本模块只做两件事：
   1) 用 onAuthStateChange 把 SDK 的会话状态实时镜像到内存 ref；
   2) 提供 ensureAuthReady()，供路由守卫在判断前确保初始化完成。

   原则：绝不自己臆断「已登录 / 未登录」，完全跟随 SDK 发出的事件。
   ============================================================ */

import { ref } from 'vue'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { USE_MOCK } from './dataSource'

/** 当前会话（null = 未登录），始终与 SDK 同步 */
export const session = ref<Session | null>(null)
/** SDK 是否已完成初始化并给出首个会话状态 */
export const authReady = ref(false)

let clientPromise: Promise<SupabaseClient> | null = null
let registered = false

function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('./supabase').then((m) => m.supabase)
  }
  return clientPromise
}

/**
 * 确保会话监听已注册、SDK 已初始化完成。
 * 路由守卫在判断登录态前必须先调用它。
 */
export async function ensureAuthReady(): Promise<void> {
  if (USE_MOCK) return

  const supabase = await getClient()

  // 注册会话监听（幂等）。处理 SDK 发出的所有会话事件，包括
  // INITIAL_SESSION（=「从 localStorage 恢复会话了」，冷启动的关键信号）。
  if (!registered) {
    registered = true
    supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        session.value = null
        authReady.value = true
      } else if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        session.value = s
        authReady.value = true
      }
    })
  }

  // 冷启动首次判断：SDK 可能还没初始化完，这里触发一次初始化并等它恢复会话
  if (!authReady.value) {
    const { data } = await supabase.auth.getSession()
    session.value = data.session ?? null
    authReady.value = true
  }
}

/**
 * 页面回到前台时「预热」会话：getSession() 内部只在快过期 / 已过期时
 * 才真的联网刷新，其余时候只读本地、零成本。这样用户动手时 token 已经是新的。
 */
export function startAuthWarmup(): void {
  if (USE_MOCK) return

  const warm = () => {
    if (document.visibilityState === 'visible') {
      void getClient().then((supabase) => supabase.auth.getSession())
    }
  }

  document.addEventListener('visibilitychange', warm)
  window.addEventListener('focus', warm)
  window.addEventListener('pageshow', warm)
}

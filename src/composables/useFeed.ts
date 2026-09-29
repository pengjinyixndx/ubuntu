import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { CoupleEvent, Profile } from '../types/domain'

// 模块级单例：记录页、首页共享同一份数据
const events = ref<CoupleEvent[]>([])
const myProfile = ref<Profile | null>(null)
const loading = ref(false)

/** 确保拿到当前登录用户的档案（id + gender） */
async function ensureMe(): Promise<Profile | null> {
  if (myProfile.value) return myProfile.value

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  myProfile.value = data as Profile
  return myProfile.value
}

/** 拉取动态流（最新在前） */
async function loadEvents(): Promise<void> {
  loading.value = true
  await ensureMe()
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  events.value = (data ?? []) as CoupleEvent[]
  loading.value = false
}

/** 发布一条动态（actor_id 必须是自己，RLS 也会校验） */
async function publishEvent(input: {
  type: CoupleEvent['type']
  content?: string
  photo_urls?: string[]
  meta?: Record<string, unknown>
}): Promise<{ error: unknown }> {
  const me = await ensureMe()
  if (!me) return { error: '未登录' }

  const { error } = await supabase.from('events').insert({
    actor_id: me.id,
    type: input.type,
    content: input.content ?? null,
    photo_urls: input.photo_urls ?? null,
    meta: input.meta ?? null
  })

  if (!error) {
    // 立即把新动态插到列表最前，保证当前页数据最新
    await loadEvents()
  }
  return { error }
}

export function useFeed() {
  return { events, myProfile, loading, ensureMe, loadEvents, publishEvent }
}

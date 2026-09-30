/* ============================================================
   青桃 · Supabase 数据源（线上真实读写）
   ============================================================ */

import { supabase } from './supabase'
import type { CoupleEvent, Profile } from '../types/domain'
import type { FeedSource, LoadResult, PublishInput } from './feedSource'

export const supabaseSource: FeedSource = {
  async getMe(): Promise<Profile | null> {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (error) {
      console.error('[青桃] 读取档案失败：', error)
      return null
    }
    return data as Profile
  },

  async listEvents(limit: number): Promise<LoadResult> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) console.error('[青桃] 读取动态失败：', error)
    return { data: (data ?? []) as CoupleEvent[], error }
  },

  async addEvent(input: PublishInput): Promise<{ error: unknown }> {
    const me = await this.getMe()
    if (!me) return { error: '未登录' }

    const { error } = await supabase.from('events').insert({
      actor_id: me.id,
      type: input.type,
      content: input.content ?? null,
      photo_urls: input.photo_urls ?? null,
      meta: input.meta ?? null
    })

    if (error) console.error('[青桃] 写入动态失败：', error)
    return { error }
  }
}

/* ============================================================
   青桃 · 可选项定义（日记的天气/心情、奶茶的口味/甜度）
   ============================================================ */

import type { Component } from 'vue'
import { Sun, Cloud, CloudRain, CloudSnow, Smile, Meh, Frown } from 'lucide-vue-next'

export interface Option {
  key: string
  label: string
  icon: Component
}

/** 日记可选：天气 */
export const WEATHERS: Option[] = [
  { key: 'sunny', label: '晴', icon: Sun },
  { key: 'cloudy', label: '阴', icon: Cloud },
  { key: 'rainy', label: '雨', icon: CloudRain },
  { key: 'snowy', label: '雪', icon: CloudSnow }
]

/** 日记可选：心情 */
export const MOODS: Option[] = [
  { key: 'happy', label: '开心', icon: Smile },
  { key: 'calm', label: '平淡', icon: Meh },
  { key: 'sad', label: '难过', icon: Frown }
]

/** 奶茶：口味 */
export const TEA_FLAVORS: string[] = ['珍珠', '奶盖', '芋泥', '椰果', '布丁']

/** 奶茶：甜度 */
export const TEA_SWEETNESS: string[] = ['无糖', '三分糖', '半糖', '全糖']

/** 从 key 取中文标签（取不到返回空串） */
export function labelOfKey(list: Option[], key: unknown): string {
  if (typeof key !== 'string') return ''
  return list.find((o) => o.key === key)?.label ?? ''
}

/** 从 key 取图标组件（取不到返回 null） */
export function iconOfKey(list: Option[], key: unknown): Component | null {
  if (typeof key !== 'string') return null
  return list.find((o) => o.key === key)?.icon ?? null
}

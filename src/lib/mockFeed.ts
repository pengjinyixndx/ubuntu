/* ============================================================
   青桃 · 本地演示数据（仅开发用）

   用途：在没有网络 / 无法连上 Supabase 的环境里，也能把首页、
   记录页真实渲染出来，方便纯前端调样式与交互手感。
   开关：.env.local 里设 VITE_USE_MOCK=1（生产构建不受影响）。
   注意：这不是假数据业务逻辑，只是把 events 表的内容照搬成内存数组。
   ============================================================ */

import type { CoupleEvent, Profile } from '../types/domain'
import {
  MOCK_PHOTO_BOOK,
  MOCK_PHOTO_DAISY,
  MOCK_PHOTO_DUSK,
  MOCK_PHOTO_TEA
} from './mockPhotos'

// 小螃蟹（他）先注册，银杏叶（她）后注册——App 就靠这个先后定谁是谁
export const MOCK_ME: Profile = {
  id: 'me-0000',
  email: 'me@local',
  gender: 'male',
  display_name: '小螃蟹',
  created_at: '2026-06-24T00:00:00Z'
}

export const MOCK_PARTNER: Profile = {
  id: 'her-0000',
  email: 'her@local',
  gender: 'female',
  display_name: '银杏叶',
  created_at: '2026-06-25T00:00:00Z'
}

/** 相对「现在」往前推 n 分钟，生成一条时间可读的动态 */
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

/**
 * 演示动态：覆盖全部 6 种类型，且长短文本、单图多图都有，
 * 用来检验卡片在极端内容下的排版是否稳。
 */
export const MOCK_EVENTS: CoupleEvent[] = [
  {
    id: 'e-01',
    actor_id: MOCK_ME.id,
    type: 'note',
    content: '今天路过那家店，又想起你上次说想喝的那杯，下次一起去。',
    photo_urls: [MOCK_PHOTO_TEA],
    meta: null,
    created_at: ago(8)
  },
  {
    id: 'e-09',
    actor_id: MOCK_PARTNER.id,
    type: 'milktea_redeem',
    content: '今天这杯特别甜，下次带你喝同一家。',
    photo_urls: null,
    meta: { source: 'free', flavor: '珍珠', sweetness: '半糖' },
    created_at: ago(24)
  },
  {
    id: 'e-02',
    actor_id: MOCK_PARTNER.id,
    type: 'diary',
    content:
      '今天下班早，天还没黑透就到家了。路上买了一把小雏菊，插在窗台的玻璃瓶里，白色的花瓣有点卷，看着很安静。\n\n做饭的时候把盐放多了，自己笑得不行，想起你上次也是这样，还硬说很好吃。后来我把剩下的一半留起来了，想着你来了可以尝尝，虽然大概率还是咸的。\n\n晚上看了会儿书，风从窗户进来，把书页吹得哗哗响。忽然觉得这样的日子也很好，不吵不闹，慢一点也没关系。等你回来。',
    photo_urls: null,
    meta: { weather: 'sunny', mood: 'happy' },
    created_at: ago(52)
  },
  {
    id: 'e-03',
    actor_id: MOCK_PARTNER.id,
    type: 'photo',
    content: '窗台上的小雏菊',
    photo_urls: [MOCK_PHOTO_DAISY, MOCK_PHOTO_BOOK, MOCK_PHOTO_DUSK],
    meta: null,
    created_at: ago(140)
  },
  {
    id: 'e-04',
    actor_id: MOCK_ME.id,
    type: 'milktea_issue',
    content: '珍珠奶茶券 · 一张',
    photo_urls: null,
    meta: { count: 1, reason: '这周辛苦了' },
    created_at: ago(300)
  },
  {
    id: 'e-05',
    actor_id: MOCK_PARTNER.id,
    type: 'milktea_redeem',
    content: '用券换了一杯，奶盖很厚。',
    photo_urls: null,
    meta: { source: 'voucher', flavor: '奶盖', sweetness: '三分糖' },
    created_at: ago(430)
  },
  {
    id: 'e-10',
    actor_id: MOCK_ME.id,
    type: 'milktea_issue',
    content: '奶盖奶茶券 · 一张',
    photo_urls: null,
    meta: { count: 1, reason: '这周表现好' },
    created_at: ago(1200)
  },
  {
    id: 'e-06',
    actor_id: MOCK_PARTNER.id,
    type: 'wish',
    content: '想在秋天去看一次银杏，要一起捡一片最完整的夹在书里。',
    photo_urls: null,
    meta: { want_at: '2026-11-01' },
    created_at: ago(1500)
  },
  {
    id: 'e-07',
    actor_id: MOCK_ME.id,
    type: 'note',
    content: '晚安。',
    photo_urls: null,
    meta: null,
    created_at: ago(2600)
  },
  {
    id: 'e-08',
    actor_id: MOCK_PARTNER.id,
    type: 'photo',
    content: '傍晚的天空',
    photo_urls: [MOCK_PHOTO_DUSK],
    meta: null,
    created_at: ago(4300)
  }
]

/* ============================================================
   青桃 · 一个会走的「现在」

   PWA 挂在后台过夜时，setInterval 会被冻结 / 节流：
   凡是只读 new Date() 的 computed，第一次求值后就会一直用旧结果
   （天数停在昨天、每日一句不换、每周免费券的纸色不变）。

   这里把「现在」做成一个单例 ref，每 60 秒跳一次；
   回到前台时再立刻对齐一次，避免要等下一个整分钟。
   ============================================================ */

import { ref, type Ref } from 'vue'

/** 当前时间（毫秒）。全站共用，不要直接改它 */
export const now = ref(Date.now())

let timer: number | null = null
let listening = false

function tick(): void {
  now.value = Date.now()
}

function ensure(): void {
  if (typeof window === 'undefined' || timer !== null) return
  tick()
  timer = window.setInterval(tick, 60_000)

  if (listening) return
  listening = true
  // 后台定时器会被冻住；回到前台先补一次，页面不会停在上一次的时间
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick()
  })
  window.addEventListener('focus', tick)
  window.addEventListener('pageshow', tick)
}

/** 在 computed / 模板里读它，就会随每 60 秒的 tick 一起更新 */
export function useNow(): Ref<number> {
  ensure()
  return now
}

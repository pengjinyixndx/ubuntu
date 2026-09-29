/* ============================================================
   青桃 · 关系设定与在一起天数计算
   ============================================================ */

// 内置：在一起的起始日期
export const TOGETHER_START_DATE = '2026-06-24'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 在一起第 N 天。
 * 口径：在一起当天算第 1 天（起始日 elapsed=0 -> 1）。
 * 按本地时区计算，跨天自动 +1。
 */
export function getTogetherDays(now: Date = new Date()): number {
  const start = new Date(`${TOGETHER_START_DATE}T00:00:00`)
  const elapsed = now.getTime() - start.getTime()
  return Math.floor(elapsed / MS_PER_DAY) + 1
}

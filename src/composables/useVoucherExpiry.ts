/* ============================================================
   青桃 · 「这张券到哪天为止」的唯一来源

   以前面板（MilkteaPanel）用表单里选的日期，弹窗（KissAskModal）
   自己另初始化「今天 + 7 天」——同一个「同意」，两条路写进去的
   到期日可能不一样。现在两边读写同一个值：

   - 没人手动改过：永远等于「今天 + 7 天」（过夜也不会停在旧日期）；
   - 任何一边改了：另一边立刻跟着变。
   ============================================================ */

import { computed, ref, type WritableComputedRef } from 'vue'
import { useNow } from './useNow'

const DAY = 86_400_000
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 本地时区的「今天 + 7 天」，YYYY-MM-DD */
export function defaultVoucherExpiry(nowMs: number = Date.now()): string {
  const d = new Date(nowMs + 7 * DAY)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 用户手动选过的日期；空 = 还没选过，用动态默认值 */
const manual = ref('')
const edited = ref(false)

export function useVoucherExpiry(): { expiresAt: WritableComputedRef<string> } {
  const now = useNow()
  const expiresAt = computed({
    get: () => (edited.value ? manual.value : defaultVoucherExpiry(now.value)),
    set: (value: string) => {
      edited.value = true
      manual.value = value
    }
  })
  return { expiresAt }
}

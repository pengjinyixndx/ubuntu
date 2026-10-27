/* ============================================================
   青桃 · 弹层的 Esc 关闭

   弹层可以叠（面板里再开确认框、面板里再开明细），
   所以只让「最上面那一层」响应 Esc，避免一下子全关掉。

   谁在上面，按 z-index 判断（110 面板 < 320 确认框 < 430 请求弹窗 < 460 和好页）；
   同一层（例如面板里再开面板）按「谁后打开」算。
   这样一直挂载、靠 v-if 显隐的 KissAskModal 也不会排错位置。
   ============================================================ */

import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from 'vue'

interface Entry {
  id: symbol
  z: number
  /** 后打开的更大；同一 z 时用它分先后 */
  order: number
  active: () => boolean
  onEscape: () => void
}

const entries: Entry[] = []
let seq = 0

/** 当前最上面、仍然可见的那一层 */
function topEntry(): Entry | null {
  let top: Entry | null = null
  for (const e of entries) {
    if (!e.active()) continue
    if (!top || e.z > top.z || (e.z === top.z && e.order > top.order)) top = e
  }
  return top
}

/**
 * @param active   这一层现在是不是可见（隐藏着就不要吞掉 Esc）
 * @param onEscape Esc 时做什么（关闭 / 当作「待会儿」）
 * @param z        这一层的 z-index（和 CSS 里保持一致）
 */
export function useEscapeKey(
  active: MaybeRefOrGetter<boolean>,
  onEscape: () => void,
  z = 0
): void {
  const id = Symbol('qt-dialog')
  const entry: Entry = { id, z, order: 0, active: () => toValue(active), onEscape }
  let mounted = false

  const sync = (on: boolean) => {
    const i = entries.indexOf(entry)
    if (on) {
      if (i < 0) entries.push(entry)
      entry.order = ++seq
    } else if (i >= 0) {
      entries.splice(i, 1)
    }
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' && event.key !== 'Esc') return
    const top = topEntry()
    if (!top || top.id !== id) return
    // 关掉这一层就够了。关的动作可能同步让下一层变成「最上面」，
    // 所以必须拦住同一个 Esc 继续传给下一个监听器，否则会连着关两层。
    event.preventDefault()
    event.stopImmediatePropagation()
    onEscape()
  }

  onMounted(() => {
    mounted = true
    sync(toValue(active))
    window.addEventListener('keydown', onKey)
  })

  // 一直挂着、条件显示的弹层：重新露出来时也要排到当前最上面
  const stop = watch(
    () => toValue(active),
    (on) => {
      if (mounted) sync(on)
    }
  )

  onBeforeUnmount(() => {
    stop()
    sync(false)
    window.removeEventListener('keydown', onKey)
  })
}

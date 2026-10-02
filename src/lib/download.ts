/* ============================================================
   青桃 · 把网上的图片存到本地

   直接给 <a download> 一个跨域地址是没用的（浏览器会忽略 download，变成打开图片），
   所以先 fetch 成 blob，再用本地 objectURL 触发下载。
   取不回来（对方不允许跨域读取）就退化成打开原图，让用户长按保存。
   ============================================================ */

export async function saveImage(url: string, nameHint: string): Promise<'saved' | 'opened'> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(String(res.status))

    const blob = await res.blob()
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const href = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = href
    a.download = `${nameHint}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 5000)
    return 'saved'
  } catch {
    // 取不回来就打开原图，让用户长按保存
    window.open(url, '_blank')
    return 'opened'
  }
}

/** 用时间戳拼一个像样的文件名 */
export function photoFileName(createdAt: string, id: string): string {
  const day = createdAt.slice(0, 10)
  return `青桃-${day}-${id.slice(-6)}`
}

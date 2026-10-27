/* ============================================================
   青桃 · 把网上的图片存到本地

   直接给 <a download> 一个跨域地址是没用的（浏览器会忽略 download，变成打开图片），
   所以先 fetch 成 blob，再用本地 objectURL 触发下载。
   取不回来（对方不允许跨域读取）就退化成打开原图，让用户长按保存。
   ============================================================ */

/** Windows / 手机都不认的文件名字符，统一去掉 */
function safeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim()
  return cleaned || '青桃照片'
}

/** 兜底：打开原图（新标签页被拦时再退成当前页跳转） */
function openDirect(url: string): 'opened' {
  try {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      /* 再不行就只能让用户长按图片了 */
    }
  }
  return 'opened'
}

export async function saveImage(url: string, nameHint: string): Promise<'saved' | 'opened'> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(String(res.status))

    const blob = await res.blob()
    // 有些图床出错时也返回 200，但内容其实是 HTML：别把它存成 .jpg
    // （octet-stream 放行：老图床经常不标 image/*，只要不是文本类就还能当图片存）
    const isTextish =
      blob.type.startsWith('text/') || blob.type.includes('json') || blob.type.includes('html')
    if (isTextish) throw new Error(`not-image:${blob.type}`)

    const fromType = blob.type.startsWith('image/')
      ? (blob.type.split('/')[1] || '').replace('jpeg', 'jpg').replace('+xml', '')
      : ''
    const fromUrl = /\.(jpe?g|png|webp|gif|avif)$/i.exec(url.split('?')[0] ?? '')?.[1]
    const ext = fromType || fromUrl?.toLowerCase() || 'jpg'
    const href = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = href
    a.download = `${safeName(nameHint)}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // 下载是异步的，别立刻 revoke
    setTimeout(() => URL.revokeObjectURL(href), 30000)
    return 'saved'
  } catch (e) {
    console.warn('[青桃] 取不回图片，改成打开原图：', e)
    // 取不回来就打开原图，让用户长按保存
    return openDirect(url)
  }
}

/** 用时间戳拼一个像样的文件名 */
export function photoFileName(createdAt: string, id: string): string {
  const day = createdAt.slice(0, 10)
  return `青桃-${day}-${id.slice(-6)}`
}

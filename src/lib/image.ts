/* ============================================================
   青桃 · 图片处理

   手机直接拍出来的照片动不动 5~10MB，原图直传很容易失败或者转半天，
   所以上传前统一压一道：最长边 1440px、JPEG 质量 0.8，
   通常能压到 200~500KB，成功率高很多。
   ============================================================ */

/** 可画到 canvas 上的东西（ImageBitmap 或 HTMLImageElement） */
interface Drawable {
  source: CanvasImageSource
  width: number
  height: number
  release?: () => void
}

async function loadDrawable(file: File): Promise<Drawable | null> {
  // 优先用 ImageBitmap：解码快，不占 DOM
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        release: () => bmp.close()
      }
    } catch {
      /* 有些浏览器对 HEIC 等格式会失败，落到 <img> 方案 */
    }
  }

  return await new Promise<Drawable | null>((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/**
 * 压图结果缓存。
 * 发布失败后用户会点「重试」，PhotoEditor 会拿同一个 File 再压一次；
 * 如果每次都生成新的 File，上传层就认不出「这是同一张图」，会重复上传。
 * 这里按 (File, 参数) 缓存，重试时拿回**同一个 File 实例**，上传层才能去重。
 */
const shrinkCache = new WeakMap<File, Map<string, Promise<File>>>()

async function doShrink(
  file: File,
  maxSide: number,
  quality: number,
  always: boolean
): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  // 本来就不大，不折腾
  if (!always && file.size <= 700 * 1024) return file

  try {
    const drawable = await loadDrawable(file)
    if (!drawable) return file

    const scale = Math.min(1, maxSide / Math.max(drawable.width, drawable.height))
    const w = Math.max(1, Math.round(drawable.width * scale))
    const h = Math.max(1, Math.round(drawable.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      drawable.release?.()
      return file
    }
    ctx.drawImage(drawable.source, 0, 0, w, h)
    drawable.release?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    // 压完反而更大就用原图
    if (!blob || blob.size >= file.size) return file

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * 压小一张图片。压不了（格式怪、浏览器不支持）就原样返回，绝不让功能卡死。
 * 同一个 File + 同一组参数返回同一个 Promise / File 实例（见 shrinkCache）。
 */
export function shrinkImage(
  file: File,
  maxSide = 1440,
  quality = 0.8,
  always = false
): Promise<File> {
  const key = `${maxSide}|${quality}|${always}`
  let byKey = shrinkCache.get(file)
  if (!byKey) {
    byKey = new Map()
    shrinkCache.set(file, byKey)
  }
  const hit = byKey.get(key)
  if (hit) return hit

  const task = doShrink(file, maxSide, quality, always).catch(() => file)
  byKey.set(key, task)
  return task
}

/**
 * 把上传失败的原始错误翻译成一句人话。
 * （最常见的就是照片存储桶还没建，见 supabase/storage.sql）
 */
export function uploadErrorText(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : ((error as { message?: string } | null | undefined)?.message ?? String(error ?? ''))

  if (/bucket not found|not found/i.test(raw)) {
    return '云端的 photos 存储桶还没建：先在 Supabase 跑一次 supabase/storage.sql'
  }
  if (/row-level security|violates row-level|policy/i.test(raw)) {
    return '没有上传权限：检查 supabase/storage.sql 里的策略有没有执行成功'
  }
  if (/exceeded the maximum|too large|payload too large|entity too large/i.test(raw)) {
    return '照片太大了，换一张小一点的'
  }
  if (/failed to fetch|networkerror|network request failed|timeout/i.test(raw)) {
    return '网络不太好，等一下再传'
  }
  if (/jwt|token|not authenticated|未登录/i.test(raw)) {
    return '登录状态过期了，重新登录一次'
  }
  return '照片没传上去，再试一次'
}

/* ============================================================
   缩略图

   一张图传两份：长边 1440 的原图 + 长边 480 的缩略图。
   约定缩略图放在同一个目录、文件名多一个 -t，这样**不用改数据库**，
   列表和照片墙只要把地址里的 -t 加上就能拿到小图。
   拿不到小图（老照片）会自己退回原图，见 onImageError。
   ============================================================ */

/** 生成缩略图：480 长边、质量 0.72，通常在 25～40KB */
export function makeThumb(file: File): Promise<File> {
  return shrinkImage(file, 480, 0.72, true)
}

/** 上传路径用的图片扩展名：文件名没扩展名（相机/剪贴板）时按 MIME 补，不能再无扩展名 */
export function imageExt(file: File): string {
  const fromName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase()
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'heic', 'heif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  const fromType = /^image\/([a-z0-9.+-]+)$/i.exec(file.type)?.[1]?.toLowerCase()
  if (fromType) {
    if (fromType === 'jpeg') return 'jpg'
    if (fromType === 'svg+xml') return 'svg'
    if (fromType === 'heif') return 'heic'
    if (['jpg', 'png', 'webp', 'gif', 'avif', 'bmp', 'svg', 'heic'].includes(fromType)) return fromType
  }
  // 压图后统一是 jpeg；这里兜底用 jpg，保证 public URL 有扩展名、能拿到正确 MIME
  return 'jpg'
}

/** 由原图的**存储路径**推出缩略图路径，和 thumbUrlOf 的规则一一对应 */
export function thumbPathOf(path: string): string {
  if (/\.(jpe?g|png|webp)$/i.test(path)) {
    return path.replace(/\.(jpe?g|png|webp)$/i, '-t.jpg')
  }
  return `${path}-t.jpg`
}

/** 由原图地址推出缩略图地址；推不出来（不是我们存的、或已经是 -t）就原样返回 */
export function thumbUrlOf(url: string): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return url
  // 地址可能带 ?token= 或 #hash：只替换路径部分，query / hash 原样保留
  const m = /^([^?#]+)([?#][\s\S]*)?$/.exec(url)
  if (!m) return url
  const path = m[1] ?? ''
  const suffix = m[2] ?? ''
  if (/-t\.(jpe?g|png|webp)$/i.test(path)) return url
  const next = path.replace(/\.(jpe?g|png|webp)$/i, '-t.jpg')
  if (next === path) return url
  return next + suffix
}

export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3ead4"/><g fill="none" stroke="#98663a" stroke-width="2"><rect x="165" y="112" width="70" height="52"/><circle cx="180" cy="128" r="5"/><path d="M165 164 L190 134 L215 164"/></g><text x="200" y="205" font-family="serif" font-size="15" fill="#b3a588" text-anchor="middle">暂无图片</text></svg>`
  )

/**
 * 图片加载失败时的统一处理：
 * 先退回原图（老照片没有缩略图），原图也失败才换成占位图。
 * 用法：<img :src="thumbUrlOf(url)" :data-full="url" @error="onImageError" />
 */
export function onImageError(e: Event): void {
  const img = e.currentTarget as HTMLImageElement
  const full = img.dataset.full
  const current = img.getAttribute('src')
  // 只比一次：缩略图失败 → 原图；原图也失败 → 占位图
  if (full && current !== full && img.src !== full) {
    img.src = full
    return
  }
  if (img.src !== IMAGE_PLACEHOLDER) img.src = IMAGE_PLACEHOLDER
}

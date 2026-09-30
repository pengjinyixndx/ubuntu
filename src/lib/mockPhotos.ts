/* ============================================================
   青桃 · 本地演示用的「照片」

   演示数据以前挂的是 Unsplash 外链，国内经常加载不出来，
   照片墙看着就像坏的。这里改成内置的矢量图：
   不联网也一定显示得出来，而且和整体的胶片相纸风一致。
   ============================================================ */

function svg(inner: string, w = 480, h = 360, bg = '#f6efdc'): string {
  const body =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>${inner}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(body)}`
}

/** 一朵小雏菊 */
function daisy(x: number, y: number, s: number): string {
  let petals = ''
  for (let i = 0; i < 8; i++) {
    petals += `<ellipse cx="0" cy="-13" rx="6.5" ry="14" transform="rotate(${i * 45})"/>`
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <g fill="#fdfaf1" stroke="#cdb691" stroke-width="1.4">${petals}</g>
    <circle r="7.5" fill="#e8b95f" stroke="#c99a3f" stroke-width="1.4"/>
  </g>`
}

/** 一片银杏叶 */
function ginkgo(x: number, y: number, s: number, rot: number): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 0 C -26 -22 -34 -58 -16 -84 C -6 -68 -3 -34 0 0 Z" fill="#e8c98a" fill-opacity=".8" stroke="#a8823f" stroke-width="2"/>
    <path d="M2 0 C 26 -24 34 -60 16 -86 C 6 -70 4 -34 2 0 Z" fill="#e8c98a" fill-opacity=".8" stroke="#a8823f" stroke-width="2"/>
    <path d="M0 0 L-14 -76 M0 0 L16 -78 M0 0 L-30 -56 M0 0 L32 -58" stroke="#b5854f" stroke-width="1.8" fill="none"/>
    <path d="M0 2 C 0 16 0 28 2 40" stroke="#a8823f" stroke-width="2.4" fill="none"/>
  </g>`
}

/** 窗台上的小雏菊 */
export const MOCK_PHOTO_DAISY = svg(`
  <rect x="120" y="30" width="240" height="20" rx="4" fill="#e3d5b6" stroke="#c3b189" stroke-width="2"/>
  <g stroke="#7c8c68" stroke-width="3" fill="none">
    <path d="M240 214 C 234 172 222 144 208 118"/>
    <path d="M240 214 C 248 174 262 150 278 126"/>
    <path d="M240 214 C 240 178 240 152 240 122"/>
  </g>
  ${daisy(208, 118, 1)}
  ${daisy(278, 126, 0.85)}
  ${daisy(240, 122, 1.05)}
  <g stroke="#98663a" stroke-width="3" fill="rgba(253,250,241,.65)">
    <path d="M212 300 L212 222 Q212 212 226 210 L254 210 Q268 212 268 222 L268 300 Z"/>
  </g>
  <path d="M204 300 H276" stroke="#98663a" stroke-width="3.5"/>
  <path d="M228 250 H252" stroke="#c3b189" stroke-width="2"/>
`)

/** 一杯奶茶 */
export const MOCK_PHOTO_TEA = svg(`
  <g transform="translate(160 60)">
    <path d="M30 0 H150 L136 214 H44 Z" fill="#eadcbe" stroke="#98663a" stroke-width="3.5"/>
    <path d="M22 -4 H158" stroke="#98663a" stroke-width="4"/>
    <path d="M40 48 H140" stroke="#c9a86f" stroke-width="2"/>
    <g fill="#6b4a2c" opacity=".9">
      <circle cx="76" cy="180" r="11"/><circle cx="104" cy="192" r="11"/>
      <circle cx="58" cy="196" r="9"/><circle cx="88" cy="166" r="8"/>
    </g>
    <path d="M112 -10 L134 -78 L150 -72 L128 -6 Z" fill="#ad4f38" stroke="#8f3f2c" stroke-width="2"/>
  </g>
`)

/** 傍晚的天空 */
export const MOCK_PHOTO_DUSK = svg(
  `
  <defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f7ddb6"/><stop offset="0.62" stop-color="#f0c79b"/>
    <stop offset="1" stop-color="#e2a97c"/></linearGradient></defs>
  <rect width="480" height="360" fill="url(#d)"/>
  <circle cx="326" cy="152" r="46" fill="#f6cf95" opacity=".95"/>
  <g fill="#e5b183" opacity=".8">
    <ellipse cx="126" cy="106" rx="58" ry="17"/><ellipse cx="176" cy="115" rx="40" ry="13"/>
    <ellipse cx="286" cy="232" rx="74" ry="19"/><ellipse cx="358" cy="243" rx="48" ry="14"/>
  </g>
  <path d="M0 296 C 130 274 250 290 480 266 L480 360 L0 360 Z" fill="#c98f66" opacity=".6"/>
  <path d="M0 322 C 140 306 260 318 480 300 L480 360 L0 360 Z" fill="#b57c56" opacity=".5"/>
  <g stroke="#8f5f45" stroke-width="1.6" fill="none" opacity=".8">
    <path d="M96 74 q7 -7 14 0"/><path d="M124 60 q6 -6 12 0"/>
  </g>
  `,
  480,
  360,
  '#f7ddb6'
)

/** 夹在书里的银杏叶 */
export const MOCK_PHOTO_BOOK = svg(`
  <g transform="rotate(-6 240 200)">
    <rect x="80" y="118" width="322" height="204" rx="7" fill="#fdfaf1" stroke="#c3b189" stroke-width="3"/>
    <path d="M241 118 V322" stroke="#e6d9ba" stroke-width="2"/>
    <g stroke="#e6d9ba" stroke-width="2" fill="none">
      <path d="M100 158 H222"/><path d="M100 188 H222"/><path d="M100 218 H202"/>
      <path d="M262 158 H422"/><path d="M262 188 H422"/><path d="M262 218 H392"/>
    </g>
  </g>
  ${ginkgo(330, 268, 1.15, 14)}
  <circle cx="330" cy="252" r="3" fill="#a8823f" opacity=".5"/>
`)

"""生成 iOS 主屏启动图（apple-touch-startup-image）。

设计：整块暖纸色底 + 居中放 App 图标（不带文字，iOS 启动图越干净越好）。
跑法：python scripts/make-splash.py
产物：public/splash/splash-<w>x<h>.png，以及可直接粘进 index.html 的 link 片段。
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAPER = (243, 234, 212)  # --paper #f3ead4

# iPhone 竖屏尺寸（宽, 高, 设备像素比）
DEVICES = [
    (750, 1334, 2),   # SE / 8 / 7 / 6s
    (828, 1792, 2),   # XR / 11
    (1080, 1920, 3),  # 6 Plus / 7 Plus / 8 Plus
    (1125, 2436, 3),  # X / XS / 11 Pro
    (1170, 2532, 3),  # 12 / 13 / 14
    (1179, 2556, 3),  # 15 / 15 Pro / 16
    (1242, 2688, 3),  # XS Max / 11 Pro Max
    (1284, 2778, 3),  # 12 / 13 Pro Max
    (1290, 2796, 3),  # 14 / 15 Pro Max
]


def icon_source() -> Image.Image:
    for name in ("512.png", "192.png"):
        p = ROOT / "public" / "icons" / name
        if p.exists():
            return Image.open(p).convert("RGBA")
    raise SystemExit("找不到 public/icons 下的图标")


def main() -> None:
    out = ROOT / "public" / "splash"
    out.mkdir(parents=True, exist_ok=True)
    src = icon_source()

    links = []
    for w, h, dpr in DEVICES:
        canvas = Image.new("RGB", (w, h), PAPER)
        side = int(w * 0.26)
        mark = src.resize((side, side), Image.LANCZOS)
        canvas.paste(mark, ((w - side) // 2, (h - side) // 2), mark)
        canvas.save(out / f"splash-{w}x{h}.png", optimize=True)

        css_w, css_h = w // dpr, h // dpr
        links.append(
            f'    <link rel="apple-touch-startup-image" '
            f'href="/splash/splash-{w}x{h}.png" '
            f'media="(device-width: {css_w}px) and (device-height: {css_h}px) '
            f'and (-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)" />'
        )

    # 给 index.html 用：默认那条（不匹配任何具体机型时兜底）
    links.append(
        f'    <link rel="apple-touch-startup-image" href="/splash/splash-{DEVICES[4][0]}x{DEVICES[4][1]}.png" />'
    )
    (out / "links.html").write_text("\n".join(links) + "\n", encoding="utf-8")
    print(f"生成 {len(DEVICES)} 张启动图到 public/splash/")
    print("\n".join(links))


if __name__ == "__main__":
    main()

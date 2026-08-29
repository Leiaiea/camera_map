"""阶段三：alpha 膨胀，生成白边贴纸。

只膨胀 alpha 通道，绝不动 RGB。顺序上有几个必须的细节，每一条都有理由，
改动前先看注释：

1. 先扩画布再膨胀。否则贴边主体的白边会被裁掉——这是最常踩的坑。
2. 先平滑再二值化。matting 的锯齿边缘如果直接膨胀，会被放大成锯齿白边。
3. 膨胀用循环 MaxFilter(3) 而不是单次 MaxFilter(2n+1)。前者圆角、接近欧氏
   距离；后者是方角，且 rank filter 随窗口面积增长，明显更慢。
4. 最后一次轻模糊不再二值化，用来做抗锯齿。
5. 白层垫在原图下面，顺带压掉 alpha≈0 处 RGB 的光晕（premultiply 残留）。
"""

from __future__ import annotations

from PIL import Image, ImageFilter, ImageOps

# 扩边留的余量：膨胀 n 像素之外再多留一点，给抗锯齿和阴影用
CANVAS_SLACK = 4


def border_width(size: tuple[int, int], width_ratio: float, min_width: int) -> int:
    """白边宽度随图尺寸缩放，不写死像素值。

    硬编码 8px 在 1280px 图上合适，在 4096px 原图上会细到看不见。
    """
    return max(min_width, round(width_ratio * min(size)))


def dilate_alpha(
    alpha: Image.Image,
    width: int,
    *,
    smooth: float = 1.0,
    antialias: float = 0.8,
) -> Image.Image:
    """把 alpha 掩膜向外膨胀 width 像素，返回 'L' 图。"""
    if alpha.mode != 'L':
        alpha = alpha.convert('L')
    out = alpha
    # 先平滑再二值：不把 matting 的锯齿放大
    if smooth > 0:
        out = out.filter(ImageFilter.GaussianBlur(smooth))
    out = out.point(lambda p: 255 if p > 127 else 0)
    # 循环小核膨胀，得到圆角
    for _ in range(width):
        out = out.filter(ImageFilter.MaxFilter(3))
    # 抗锯齿：这一步刻意不再二值化
    if antialias > 0:
        out = out.filter(ImageFilter.GaussianBlur(antialias))
    return out


def add_sticker_border(
    img: Image.Image,
    *,
    width_ratio: float = 0.02,
    min_width: int = 2,
    color: tuple[int, int, int, int] = (255, 255, 255, 255),
    smooth: float = 1.0,
    antialias: float = 0.8,
    shadow: dict | None = None,
) -> Image.Image:
    """给透明 PNG 加白边，可选投影。返回 RGBA。"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    width = border_width(img.size, width_ratio, min_width)
    pad = width + CANVAS_SLACK
    if shadow and shadow.get('enabled'):
        # 投影需要额外空间：偏移 + 模糊半径
        ox, oy = shadow.get('offset', (0, 0))
        blur = float(shadow.get('blur', 0))
        pad += int(max(abs(ox), abs(oy)) + blur * 2)

    # 关键：先扩画布，否则贴边主体的白边被裁
    canvas = ImageOps.expand(img, border=pad, fill=(0, 0, 0, 0))

    dilated = dilate_alpha(
        canvas.getchannel('A'), width, smooth=smooth, antialias=antialias
    )

    border = Image.new('RGBA', canvas.size, tuple(color))
    border.putalpha(dilated)  # putalpha 原地改，border 是刚建的所以安全

    out = Image.alpha_composite(border, canvas)

    if shadow and shadow.get('enabled'):
        out = _apply_shadow(out, dilated, shadow)
    return out


def _apply_shadow(
    img: Image.Image, silhouette: Image.Image, shadow: dict
) -> Image.Image:
    """在贴纸下方垫一层投影。

    默认参数取自原型现有的 filter:drop-shadow(0 8px 7px #534d4555)，
    保证成品和原型视觉调性同源。
    """
    ox, oy = shadow.get('offset', (0, 8))
    blur = float(shadow.get('blur', 7))
    color = tuple(shadow.get('color', (83, 77, 69, 85)))

    shadow_alpha = silhouette
    if blur > 0:
        shadow_alpha = shadow_alpha.filter(ImageFilter.GaussianBlur(blur))
    # 按投影颜色的 alpha 整体降低不透明度
    opacity = color[3] if len(color) > 3 else 255
    if opacity < 255:
        shadow_alpha = shadow_alpha.point(lambda p: p * opacity // 255)

    layer = Image.new('RGBA', img.size, (color[0], color[1], color[2], 0))
    offset_alpha = Image.new('L', img.size, 0)
    offset_alpha.paste(shadow_alpha, (int(ox), int(oy)))
    layer.putalpha(offset_alpha)

    return Image.alpha_composite(layer, img)


def trim_to_content(img: Image.Image, padding: int = 0) -> Image.Image:
    """按非透明区域裁紧，可留 padding。

    扩画布阶段留的余量多是为了安全，成品尺寸用这一步收回来。
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.getchannel('A').getbbox()
    if bbox is None:
        return img
    left, top, right, bottom = bbox
    if padding:
        left, top = left - padding, top - padding
        right, bottom = right + padding, bottom + padding
    # crop 允许超出边界，会自动填充透明，正好符合需要
    return img.crop((left, top, right, bottom))


def make_sticker(img: Image.Image, config: dict, output: dict | None = None) -> Image.Image:
    """按配方的 sticker 段落跑完整个贴纸阶段。"""
    border_cfg = config.get('border') or {}
    out = add_sticker_border(
        img,
        width_ratio=float(border_cfg.get('width_ratio', 0.02)),
        min_width=int(border_cfg.get('min_width', 2)),
        color=tuple(border_cfg.get('color', (255, 255, 255, 255))),
        smooth=float(border_cfg.get('smooth', 1.0)),
        antialias=float(border_cfg.get('antialias', 0.8)),
        shadow=config.get('shadow'),
    )
    output = output or {}
    if output.get('trim_to_content', True):
        out = trim_to_content(out, padding=int(output.get('padding', 0)))
    return out

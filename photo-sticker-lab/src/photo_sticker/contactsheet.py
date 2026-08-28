"""对比长图拼接。

这是「纯 CLI」形态能好用的关键：不做 GUI，而是把一次扫参的所有结果拼成
一张长图，用系统图片查看器翻着看就能调参。

透明区垫棋盘格，否则白边贴纸在白底上根本看不出边界在哪。
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFont

# 与原型的 --paper #f4f2eb / --ink #202720 同源，看着不跳
PAPER = (244, 242, 235, 255)
INK = (32, 39, 32, 255)
CHECKER_LIGHT = (238, 238, 233, 255)
CHECKER_DARK = (214, 214, 208, 255)
CHECKER_SIZE = 12

LABEL_H = 34
GUTTER = 16


def checkerboard(size: tuple[int, int]) -> Image.Image:
    """棋盘格底，用来衬托透明区域。"""
    w, h = size
    tile = Image.new('RGBA', (CHECKER_SIZE * 2, CHECKER_SIZE * 2), CHECKER_LIGHT)
    draw = ImageDraw.Draw(tile)
    draw.rectangle((0, 0, CHECKER_SIZE - 1, CHECKER_SIZE - 1), fill=CHECKER_DARK)
    draw.rectangle(
        (CHECKER_SIZE, CHECKER_SIZE, CHECKER_SIZE * 2 - 1, CHECKER_SIZE * 2 - 1),
        fill=CHECKER_DARK,
    )
    board = Image.new('RGBA', size, CHECKER_LIGHT)
    for y in range(0, h, tile.height):
        for x in range(0, w, tile.width):
            board.paste(tile, (x, y))
    return board


def _font(size: int = 14) -> ImageFont.ImageFont:
    """尽量用能显示中文的系统字体，失败就退回默认位图字体。"""
    for name in ('msyh.ttc', 'simhei.ttf', 'DengXian.ttf', 'arial.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fit(img: Image.Image, cell: tuple[int, int]) -> Image.Image:
    """等比缩放到格子内，不裁切。"""
    out = img.copy()
    out.thumbnail(cell, Image.LANCZOS)
    return out


def build(
    panels: list[tuple[str, Image.Image]],
    *,
    cell: tuple[int, int] = (420, 560),
    columns: int | None = None,
    title: str = '',
) -> Image.Image:
    """把 (标签, 图) 列表拼成一张对比图。

    columns 为 None 时横向排成一行——扫参通常 3-5 档，一行最好比。
    """
    if not panels:
        raise ValueError('没有可拼的面板')
    cols = columns or len(panels)
    rows = (len(panels) + cols - 1) // cols

    cw, ch = cell
    title_h = 40 if title else 0
    sheet_w = GUTTER + cols * (cw + GUTTER)
    sheet_h = title_h + GUTTER + rows * (ch + LABEL_H + GUTTER)
    sheet = Image.new('RGBA', (sheet_w, sheet_h), PAPER)
    draw = ImageDraw.Draw(sheet)

    if title:
        draw.text((GUTTER, 12), title, font=_font(18), fill=INK)

    label_font = _font(14)
    for idx, (label, img) in enumerate(panels):
        r, c = divmod(idx, cols)
        x = GUTTER + c * (cw + GUTTER)
        y = title_h + GUTTER + r * (ch + LABEL_H + GUTTER)

        board = checkerboard((cw, ch))
        thumb = _fit(img.convert('RGBA'), (cw, ch))
        ox = x + (cw - thumb.width) // 2
        oy = y + (ch - thumb.height) // 2
        sheet.paste(board, (x, y))
        # 用 alpha_composite 而不是 paste，保证半透明边缘正确压到棋盘格上
        region = sheet.crop((ox, oy, ox + thumb.width, oy + thumb.height))
        sheet.paste(Image.alpha_composite(region, thumb), (ox, oy))

        draw.rectangle((x, y, x + cw - 1, y + ch - 1), outline=(0, 0, 0, 40))
        draw.text((x + 2, y + ch + 8), label, font=label_font, fill=INK)

    return sheet

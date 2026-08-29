"""白边阶段测试。

重点守两件事：
1. 贴边主体的白边不能被裁掉（先扩画布那一步）；
2. 白边宽度随图尺寸缩放，且四个方向均匀。
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

LAB_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LAB_ROOT / 'src'))

from photo_sticker.sticker import (  # noqa: E402
    CANVAS_SLACK, add_sticker_border, border_width, dilate_alpha,
    make_sticker, trim_to_content,
)


def _blob(size: int = 64, *, margin: int = 16, color=(200, 60, 40)) -> Image.Image:
    """中间一块不透明主体，四周透明。"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    body = Image.new('RGBA', (size - 2 * margin, size - 2 * margin), (*color, 255))
    img.paste(body, (margin, margin))
    return img


def _edge_blob(size: int = 64) -> Image.Image:
    """主体紧贴左上角——用来抓「白边被画布裁掉」这个经典 bug。"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    body = Image.new('RGBA', (size // 2, size // 2), (40, 90, 200, 255))
    img.paste(body, (0, 0))
    return img


def test_border_width_scales_with_image_size():
    """不能写死像素：小图和大图应得到不同宽度。"""
    small = border_width((1280, 1707), 0.02, 2)
    large = border_width((3072, 4096), 0.02, 2)
    assert small == round(0.02 * 1280)
    assert large == round(0.02 * 3072)
    assert large > small


def test_border_width_respects_minimum():
    assert border_width((40, 40), 0.001, 3) == 3


def test_dilate_alpha_grows_foreground():
    img = _blob()
    alpha = img.getchannel('A')
    before = int((np.asarray(alpha) > 128).sum())
    grown = dilate_alpha(alpha, 4, smooth=0, antialias=0)
    after = int((np.asarray(grown) > 128).sum())
    assert after > before, 'alpha 没有被膨胀'


def test_dilate_alpha_width_is_approximately_correct():
    """膨胀 n 次 MaxFilter(3) 应让边界外扩约 n 像素。"""
    size, margin, width = 80, 20, 5
    img = _blob(size, margin=margin)
    grown = np.asarray(dilate_alpha(img.getchannel('A'), width, smooth=0, antialias=0))
    row = grown[size // 2]
    first = int(np.argmax(row > 128))
    # 原主体左边界在 margin，膨胀后应在 margin-width 附近
    assert abs(first - (margin - width)) <= 1, f'左边界 {first}，期望约 {margin - width}'


def test_edge_touching_subject_keeps_full_border():
    """贴边主体的白边必须完整保留——这是先扩画布那一步的意义。"""
    img = _edge_blob(64)
    out = add_sticker_border(
        img, width_ratio=0.08, min_width=4, antialias=0, shadow=None
    )
    arr = np.asarray(out)
    alpha = arr[..., 3]
    # 左上角外侧应有白边像素，说明没被裁
    ys, xs = np.nonzero(alpha > 128)
    assert xs.min() > 0 and ys.min() > 0, '白边贴到了画布边缘，说明扩边不足'
    # 且最左侧的不透明像素应是白色（白边），不是主体的蓝色
    left_col = xs.min()
    sample = arr[ys[xs == left_col][0], left_col]
    assert sample[0] > 200 and sample[1] > 200 and sample[2] > 200, \
        f'最外侧不是白边而是 {tuple(sample[:3])}'


def test_canvas_expands_by_expected_amount():
    img = _blob(64)
    width = border_width(img.size, 0.05, 2)
    out = add_sticker_border(
        img, width_ratio=0.05, min_width=2, shadow=None, antialias=0
    )
    expected = 64 + 2 * (width + CANVAS_SLACK)
    assert out.size == (expected, expected)


def test_border_color_is_configurable():
    img = _blob()
    out = add_sticker_border(
        img, width_ratio=0.08, min_width=4, color=(0, 255, 0, 255),
        antialias=0, shadow=None,
    )
    arr = np.asarray(out)
    ys, xs = np.nonzero(arr[..., 3] > 128)
    edge = arr[ys.min(), xs[ys == ys.min()][0]]
    assert edge[1] > 200 and edge[0] < 60, f'边框颜色没生效: {tuple(edge[:3])}'


def test_rgb_channels_not_dilated():
    """只膨胀 alpha：主体颜色不应向外糊开。"""
    img = _blob(64, margin=16, color=(220, 30, 30))
    out = add_sticker_border(
        img, width_ratio=0.06, min_width=4, antialias=0, shadow=None
    )
    arr = np.asarray(out)
    # 白边区域必须是纯白，不能带上主体的红
    ys, xs = np.nonzero(arr[..., 3] > 200)
    top = ys.min()
    band = arr[top + 1, xs[ys == top + 1]]
    reds = band[(band[:, 0] > 200) & (band[:, 1] < 100)]
    assert len(reds) == 0, '白边里混进了主体颜色，说明 RGB 被一起膨胀了'


def test_trim_to_content_shrinks_to_bbox():
    img = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
    img.paste(Image.new('RGBA', (10, 10), (255, 0, 0, 255)), (45, 45))
    trimmed = trim_to_content(img, padding=0)
    assert trimmed.size == (10, 10)


def test_trim_to_content_padding():
    img = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
    img.paste(Image.new('RGBA', (10, 10), (255, 0, 0, 255)), (45, 45))
    trimmed = trim_to_content(img, padding=5)
    assert trimmed.size == (20, 20)


def test_trim_handles_fully_transparent():
    """全透明输入不应崩，也不应裁成 0 尺寸。"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    out = trim_to_content(img)
    assert out.size == (32, 32)


def test_shadow_adds_pixels_below_subject():
    img = _blob(64)
    plain = add_sticker_border(img, width_ratio=0.05, min_width=3, shadow=None)
    shadowed = add_sticker_border(
        img, width_ratio=0.05, min_width=3,
        shadow={'enabled': True, 'offset': [0, 8], 'blur': 6, 'color': [83, 77, 69, 85]},
    )
    # 有投影时画布更大，且非透明像素更多
    assert shadowed.size[1] > plain.size[1]
    plain_px = int((np.asarray(plain)[..., 3] > 0).sum())
    shadow_px = int((np.asarray(shadowed)[..., 3] > 0).sum())
    assert shadow_px > plain_px, '投影没有产生额外像素'


def test_make_sticker_respects_output_config():
    img = _blob(64)
    out = make_sticker(
        img,
        {'border': {'width_ratio': 0.05, 'min_width': 3}, 'shadow': {'enabled': False}},
        {'trim_to_content': True, 'padding': 4},
    )
    assert out.mode == 'RGBA'
    # 裁紧后尺寸应小于未裁紧的画布
    untrimmed = make_sticker(
        img,
        {'border': {'width_ratio': 0.05, 'min_width': 3}, 'shadow': {'enabled': False}},
        {'trim_to_content': False},
    )
    assert out.size[0] <= untrimmed.size[0]


def test_output_is_always_rgba():
    rgb = Image.new('RGB', (32, 32), (10, 20, 30))
    out = add_sticker_border(rgb, width_ratio=0.05, min_width=2, shadow=None)
    assert out.mode == 'RGBA'

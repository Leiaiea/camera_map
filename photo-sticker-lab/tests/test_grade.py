"""校色阶段测试。

核心断言只有一条：alpha 通道逐像素不变。这是这一阶段唯一的硬指标——
一旦 LUT 或色阶碰到 A 通道，抠图结果就被悄悄破坏了，而肉眼很难发现。
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

LAB_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LAB_ROOT / 'src'))

from photo_sticker.grade import LUMA, apply_lut, auto_tone, grade  # noqa: E402
from photo_sticker.lut import CubeLUT, read_cube  # noqa: E402


def _cutout_like(size: int = 48) -> Image.Image:
    """造一张类似抠图结果的 RGBA：中间是主体，四周透明，边缘半透明。"""
    rgb = np.zeros((size, size, 3), dtype=np.uint8)
    # 主体偏暗偏蓝，好检验自动校色确实做了事
    rgb[:, :, 0] = 70
    rgb[:, :, 1] = 80
    rgb[:, :, 2] = 130
    # 背景区给一片高亮，验证 measure_on='subject' 时它不参与测光
    rgb[:8, :, :] = 250

    alpha = np.zeros((size, size), dtype=np.uint8)
    alpha[10:-10, 10:-10] = 255
    alpha[9, 10:-10] = 128      # 半透明边缘
    alpha[-10, 10:-10] = 128

    img = Image.fromarray(rgb).convert('RGBA')
    img.putalpha(Image.fromarray(alpha))
    return img


def test_auto_tone_preserves_alpha_exactly():
    img = _cutout_like()
    before = np.asarray(img.getchannel('A'))
    out = auto_tone(img)
    after = np.asarray(out.getchannel('A'))
    assert np.array_equal(before, after), 'auto_tone 改动了 alpha'


def test_apply_lut_preserves_alpha_exactly():
    img = _cutout_like()
    before = np.asarray(img.getchannel('A'))
    lut = read_cube(LAB_ROOT / 'luts' / 'paper-muted.cube')
    out = apply_lut(img, lut)
    after = np.asarray(out.getchannel('A'))
    assert np.array_equal(before, after), 'apply_lut 改动了 alpha'


def test_full_grade_stage_preserves_alpha_exactly():
    """整个阶段串起来跑，alpha 仍必须逐像素相同。"""
    img = _cutout_like()
    before = np.asarray(img.getchannel('A'))
    lut = read_cube(LAB_ROOT / 'luts' / 'paper-deep.cube')
    config = {
        'auto_tone': {'enabled': True, 'measure_on': 'subject', 'strength': 1.0},
        'lut': {'strength': 1.0},
    }
    out = grade(img, config, lut=lut)
    assert out.mode == 'RGBA'
    assert np.array_equal(before, np.asarray(out.getchannel('A')))


def test_measure_on_subject_ignores_background():
    """主体测光与全画幅测光结果应不同，否则 measure_on 是摆设。"""
    img = _cutout_like()
    subj = auto_tone(img, measure_on='subject', strength=1.0)
    full = auto_tone(img, measure_on='full', strength=1.0)
    a = np.asarray(subj.convert('RGB'), dtype=float)
    b = np.asarray(full.convert('RGB'), dtype=float)
    assert not np.allclose(a, b), 'measure_on 没有生效'


def test_target_luma_moves_subject_brightness_toward_target():
    img = _cutout_like()
    target = 0.6
    out = auto_tone(img, measure_on='subject', target_luma=target, strength=1.0)

    mask = np.asarray(img.getchannel('A')) > 200
    def luma_of(im: Image.Image) -> float:
        arr = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
        return float(np.dot(arr[mask].mean(axis=0), LUMA))

    before, after = luma_of(img), luma_of(out)
    assert abs(after - target) < abs(before - target), \
        f'亮度没有向目标靠近: {before:.3f} → {after:.3f}, 目标 {target}'


def test_flat_subject_is_not_crushed_to_black():
    """回归测试：主体色调很平时，自动色阶的百分位跨度接近 0，
    早期实现会除以极小跨度，把主体压成纯黑。纯色冰箱贴、均匀光照的
    墙面都会触发这条路径。"""
    size = 48
    rgb = np.full((size, size, 3), 90, dtype=np.uint8)  # 主体是完全的平色
    alpha = np.zeros((size, size), dtype=np.uint8)
    alpha[10:-10, 10:-10] = 255
    img = Image.fromarray(rgb).convert('RGBA')
    img.putalpha(Image.fromarray(alpha))

    out = auto_tone(img, measure_on='subject', target_luma=0.55, strength=1.0)
    mask = alpha > 200
    arr = np.asarray(out.convert('RGB'), dtype=np.float32)[mask] / 255.0
    luma = float(np.dot(arr.mean(axis=0), LUMA))
    assert 0.15 < luma < 0.95, f'平色主体被压坏了，亮度 {luma:.3f}'


def test_strength_zero_is_noop():
    img = _cutout_like()
    out = auto_tone(img, strength=0.0)
    assert np.array_equal(np.asarray(img), np.asarray(out))


def test_grade_handles_fully_transparent_input():
    """全透明输入不应崩——批量里遇到失败掩膜时会走到这条路径。"""
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    out = auto_tone(img, measure_on='subject')
    assert out.mode == 'RGBA'
    assert np.asarray(out.getchannel('A')).max() == 0


def test_identity_lut_leaves_rgb_essentially_unchanged():
    img = _cutout_like()
    lut = CubeLUT.identity(33)
    out = apply_lut(img, lut)
    a = np.asarray(img.convert('RGB'), dtype=np.int16)
    b = np.asarray(out.convert('RGB'), dtype=np.int16)
    assert np.abs(a - b).max() <= 1

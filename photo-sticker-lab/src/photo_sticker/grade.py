"""阶段二：自动校色 + 风格 LUT。

这一阶段跑在抠图之后，这是本项目最关键的顺序决定。原因有两条：
1. matting 模型在自然图像分布上训练，先重调色会把输入推离该分布、掩膜变差；
2. 更重要的是，抠图之后可以「只按主体像素测光」，天空和杂乱背景不再把
   曝光和白平衡拉偏——这批照片来源混杂（相机原图 + 截图），收益很直接。

硬约束：alpha 通道全程逐像素不变。RGB 拆出来处理，最后原样合回去。
test_grade.py 用 np.array_equal 守这条。
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from PIL import Image

from .lut import CubeLUT, apply_cube

# 判定「属于主体」的 alpha 阈值。取高一点，避免半透明边缘像素参与测光。
SUBJECT_ALPHA = 200
# 参与统计的最少像素数，低于此值退回全画幅测光
MIN_SAMPLE = 64
# Rec.709 亮度权重
LUMA = (0.2126, 0.7152, 0.0722)

# 自动色阶的安全阀。主体色调很平（纯色冰箱贴、均匀光照的墙面）时，
# 百分位上下界会几乎重合，直接除以跨度会把主体压成纯黑/纯白。
# 跨度低于 MIN_LEVEL_SPAN 的通道干脆不拉伸，并且总增益不超过 MAX_LEVEL_GAIN。
MIN_LEVEL_SPAN = 0.05
MAX_LEVEL_GAIN = 4.0

MeasureOn = Literal['subject', 'full']


def _measure_mask(img: Image.Image, measure_on: MeasureOn) -> np.ndarray | None:
    """返回用于统计的布尔掩膜；None 表示用全部像素。"""
    if measure_on == 'full' or img.mode != 'RGBA':
        return None
    alpha = np.asarray(img.getchannel('A'))
    mask = alpha > SUBJECT_ALPHA
    if int(mask.sum()) < MIN_SAMPLE:
        return None
    return mask


def auto_tone(
    img: Image.Image,
    *,
    measure_on: MeasureOn = 'subject',
    gray_world: bool = True,
    clip_percent: float = 0.5,
    target_luma: float | None = 0.55,
    strength: float = 1.0,
) -> Image.Image:
    """自动色阶 + 灰世界白平衡 + 目标亮度。

    「自动」在这里是有明确定义的三步，不是手挥：
    - 自动色阶：每通道取 clip_percent / (100-clip_percent) 百分位做黑白点重映射
    - 灰世界白平衡：把三通道均值拉平
    - 目标亮度：把测光区域的平均亮度推到 target_luma

    strength<1 时与原图线性插值，方便 --sweep 扫参。
    """
    if strength <= 0:
        return img.copy()

    has_alpha = img.mode == 'RGBA'
    alpha = img.getchannel('A') if has_alpha else None
    mask = _measure_mask(img, measure_on)

    rgb = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    original = rgb.copy()
    # 统计样本：(N, 3)
    sample = rgb[mask] if mask is not None else rgb.reshape(-1, 3)

    # 1) 自动色阶：逐通道百分位裁剪
    if clip_percent > 0:
        lo = np.percentile(sample, clip_percent, axis=0)
        hi = np.percentile(sample, 100.0 - clip_percent, axis=0)
        span = hi - lo
        # 主体色调过平时不拉伸该通道，否则会被压成纯黑/纯白。
        # 冰箱贴、均匀光照的墙面这类图很容易触发。
        flat = span < MIN_LEVEL_SPAN
        safe_span = np.where(flat, 1.0, np.maximum(span, 1.0 / MAX_LEVEL_GAIN))
        safe_lo = np.where(flat, 0.0, lo)
        rgb = (rgb - safe_lo) / safe_span
        np.clip(rgb, 0.0, 1.0, out=rgb)
        sample = rgb[mask] if mask is not None else rgb.reshape(-1, 3)

    # 2) 灰世界白平衡：三通道均值拉平到总均值
    if gray_world:
        means = sample.mean(axis=0)
        target = float(means.mean())
        gains = target / np.maximum(means, 1e-4)
        # 限制增益幅度，避免单色照片（如纯天空）被强行扭色
        gains = np.clip(gains, 0.7, 1.4)
        rgb = rgb * gains
        np.clip(rgb, 0.0, 1.0, out=rgb)
        sample = rgb[mask] if mask is not None else rgb.reshape(-1, 3)

    # 3) 目标亮度
    if target_luma is not None:
        luma = float(np.dot(sample.mean(axis=0), LUMA))
        if luma > 1e-4:
            gain = float(np.clip(target_luma / luma, 0.5, 2.0))
            rgb = rgb * gain
            np.clip(rgb, 0.0, 1.0, out=rgb)

    if strength < 1.0:
        rgb = original * (1.0 - strength) + rgb * strength

    out = Image.fromarray((rgb * 255.0 + 0.5).astype(np.uint8))
    if has_alpha and alpha is not None:
        out = out.convert('RGBA')
        out.putalpha(alpha)
    return out


def apply_lut(img: Image.Image, lut: CubeLUT, strength: float = 1.0) -> Image.Image:
    """作用 LUT，alpha 原样保留。"""
    if strength <= 0:
        return img.copy()
    has_alpha = img.mode == 'RGBA'
    alpha = img.getchannel('A') if has_alpha else None
    out = apply_cube(img.convert('RGB'), lut, strength=strength)
    if has_alpha and alpha is not None:
        out = out.convert('RGBA')
        out.putalpha(alpha)
    return out


def grade(img: Image.Image, config: dict, *, lut: CubeLUT | None = None) -> Image.Image:
    """按配方的 grade 段落跑完整个校色阶段。"""
    out = img
    tone = config.get('auto_tone') or {}
    if tone.get('enabled', True):
        out = auto_tone(
            out,
            measure_on=tone.get('measure_on', 'subject'),
            gray_world=tone.get('gray_world', True),
            clip_percent=float(tone.get('clip_percent', 0.5)),
            target_luma=tone.get('target_luma', 0.55),
            strength=float(tone.get('strength', 1.0)),
        )
    if lut is not None:
        lut_cfg = config.get('lut') or {}
        out = apply_lut(out, lut, strength=float(lut_cfg.get('strength', 1.0)))
    return out

"""CSS filter 函数的数值实现，用于把原型里的 filter 链烘焙成 .cube。

原型的 38 个 CSS 文件里已经积累了几十条 filter 链（如
`saturate(.65) contrast(1.03) brightness(.68)`），这些就是既有的视觉调性。
按 W3C Filter Effects 规范把它们实现出来，作用到恒等网格上写成 LUT，
工具的成品就和原型同源，不用凭感觉重新调色。

规范里这些函数都是 sRGB 空间的仿射变换（矩阵或标量），不用猜。
空间性滤镜 blur / drop-shadow 不属于 LUT，由贴纸阶段的 shadow 参数承接。
"""

from __future__ import annotations

import math
import re
from typing import Callable

Vec3 = tuple[float, float, float]
Op = Callable[[Vec3], Vec3]

_FUNC_RE = re.compile(r'([a-z-]+)\s*\(([^)]*)\)', re.IGNORECASE)


class FilterParseError(ValueError):
    """无法解析的 CSS filter 链。"""


def _clamp(v: float) -> float:
    return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)


def _matrix_op(m: tuple[float, ...]) -> Op:
    """3x3 颜色矩阵，逐函数后 clamp（与浏览器逐函数求值的行为一致）。"""
    def apply(c: Vec3) -> Vec3:
        r, g, b = c
        return (
            _clamp(m[0] * r + m[1] * g + m[2] * b),
            _clamp(m[3] * r + m[4] * g + m[5] * b),
            _clamp(m[6] * r + m[7] * g + m[8] * b),
        )
    return apply


def _linear_op(slope: float, intercept: float) -> Op:
    def apply(c: Vec3) -> Vec3:
        return (
            _clamp(c[0] * slope + intercept),
            _clamp(c[1] * slope + intercept),
            _clamp(c[2] * slope + intercept),
        )
    return apply


def op_brightness(amount: float) -> Op:
    return _linear_op(amount, 0.0)


def op_contrast(amount: float) -> Op:
    # 规范：slope = amount, intercept = -(0.5 * amount) + 0.5
    return _linear_op(amount, 0.5 - 0.5 * amount)


def op_invert(amount: float) -> Op:
    # c' = a*(1-c) + (1-a)*c
    return _linear_op(1.0 - 2.0 * amount, amount)


def op_saturate(s: float) -> Op:
    return _matrix_op((
        0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ))


def op_grayscale(amount: float) -> Op:
    # 规范：grayscale(a) 等价于 saturate(1-a)
    return op_saturate(1.0 - amount)


def op_sepia(a: float) -> Op:
    k = 1.0 - a  # 规范里的 (1 - amount)
    return _matrix_op((
        0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
        0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
        0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k,
    ))


def op_hue_rotate(deg: float) -> Op:
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    return _matrix_op((
        0.213 + c * 0.787 - s * 0.213,
        0.715 - c * 0.715 - s * 0.715,
        0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143,
        0.715 + c * 0.285 + s * 0.140,
        0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787,
        0.715 - c * 0.715 + s * 0.715,
        0.072 + c * 0.928 + s * 0.072,
    ))


# 空间性滤镜：合法但对 LUT 无意义，解析时跳过并记录
_SPATIAL = {'blur', 'drop-shadow', 'opacity'}

_BUILDERS: dict[str, Callable[[float], Op]] = {
    'brightness': op_brightness,
    'contrast': op_contrast,
    'saturate': op_saturate,
    'grayscale': op_grayscale,
    'sepia': op_sepia,
    'invert': op_invert,
    'hue-rotate': op_hue_rotate,
}


def _parse_amount(name: str, raw: str) -> float:
    text = raw.strip().lower()
    if not text:
        raise FilterParseError(f'{name}() 缺少参数')
    if name == 'hue-rotate':
        if text.endswith('deg'):
            return float(text[:-3])
        if text.endswith('turn'):
            return float(text[:-4]) * 360.0
        if text.endswith('rad'):
            return math.degrees(float(text[:-3]))
        return float(text)
    if text.endswith('%'):
        return float(text[:-1]) / 100.0
    return float(text)


def parse_chain(css: str) -> tuple[list[Op], list[str]]:
    """解析 CSS filter 链，返回 (逐个函数的运算, 被跳过的空间性滤镜名)。"""
    ops: list[Op] = []
    skipped: list[str] = []
    found = False
    for match in _FUNC_RE.finditer(css):
        name = match.group(1).lower()
        found = True
        if name in _SPATIAL:
            skipped.append(name)
            continue
        builder = _BUILDERS.get(name)
        if builder is None:
            raise FilterParseError(f'不认识的 filter 函数: {name}')
        ops.append(builder(_parse_amount(name, match.group(2))))
    if not found and css.strip() and css.strip().lower() != 'none':
        raise FilterParseError(f'无法解析 filter 链: {css!r}')
    return ops, skipped


def evaluate(css: str, color: Vec3) -> Vec3:
    """对单个 0-1 归一化 RGB 应用整条链，主要给测试用。"""
    ops, _ = parse_chain(css)
    for op in ops:
        color = op(color)
    return color

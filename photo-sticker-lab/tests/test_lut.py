"""LUT 的解析/写出/索引顺序测试。

最重要的是恒等 LUT 那条：它一次性守住了 .cube 数据行排布与 Pillow
Color3DLUT 的 table 排布是否一致。这个索引顺序（R 变化最快）是全项目
最容易搞错的地方，一旦搞反，颜色会发生 R/B 互换这种不易察觉的偏差。
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

LAB_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LAB_ROOT / 'src'))

from photo_sticker import cssfilter  # noqa: E402
from photo_sticker.lut import CubeLUT, CubeError, apply_cube, read_cube, write_cube  # noqa: E402


def _gradient(size: int = 64) -> Image.Image:
    """一张三通道都在变化的测试图，能暴露通道错位。"""
    arr = np.zeros((size, size, 3), dtype=np.uint8)
    ramp = np.linspace(0, 255, size, dtype=np.uint8)
    arr[:, :, 0] = ramp[None, :]           # R 沿 x 变化
    arr[:, :, 1] = ramp[:, None]           # G 沿 y 变化
    arr[:, :, 2] = ramp[::-1][None, :]     # B 反向沿 x
    return Image.fromarray(arr)


def test_identity_lut_is_pixel_exact():
    """恒等 LUT 作用后必须零差异——守住索引顺序约定。"""
    img = _gradient()
    lut = CubeLUT.identity(33)
    out = apply_cube(img, lut)
    before = np.asarray(img, dtype=np.int16)
    after = np.asarray(out, dtype=np.int16)
    # 三线性插值在 33 网格上对恒等表是精确的，容许 1 的舍入
    assert np.abs(before - after).max() <= 1


def test_identity_lut_does_not_swap_channels():
    """专门抓 R/B 互换：单通道纯色过 LUT 后不能跑到别的通道。"""
    lut = CubeLUT.identity(33)
    red = Image.new('RGB', (8, 8), (255, 0, 0))
    out = np.asarray(apply_cube(red, lut))
    assert out[..., 0].min() >= 254, 'R 通道丢失'
    assert out[..., 1].max() <= 1, 'G 通道被污染'
    assert out[..., 2].max() <= 1, 'B 通道被污染（疑似 R/B 索引反了）'


def test_sample_indexing_matches_grid():
    """CubeLUT.sample 的 (r,g,b) 索引应与构造时的循环顺序对应。"""
    size = 5
    lut = CubeLUT.identity(size)
    denom = size - 1
    for r, g, b in ((0, 0, 0), (4, 0, 0), (0, 4, 0), (0, 0, 4), (1, 2, 3)):
        got = lut.sample(r, g, b)
        expected = (r / denom, g / denom, b / denom)
        assert got == pytest.approx(expected), f'网格点 ({r},{g},{b}) 索引错位'


def test_write_read_roundtrip(tmp_path: Path):
    lut = CubeLUT.identity(9, title='roundtrip')
    dest = tmp_path / 'rt.cube'
    write_cube(lut, dest, comment='测试注释\n第二行')
    back = read_cube(dest)
    assert back.size == lut.size
    assert back.title == 'roundtrip'
    assert back.table == pytest.approx(lut.table, abs=1e-6)


def test_read_rejects_missing_size(tmp_path: Path):
    bad = tmp_path / 'bad.cube'
    bad.write_text('0.0 0.0 0.0\n1.0 1.0 1.0\n', encoding='utf-8')
    with pytest.raises(CubeError, match='LUT_3D_SIZE'):
        read_cube(bad)


def test_read_rejects_1d_lut(tmp_path: Path):
    bad = tmp_path / 'bad1d.cube'
    bad.write_text('LUT_1D_SIZE 16\n', encoding='utf-8')
    with pytest.raises(CubeError, match='1D LUT'):
        read_cube(bad)


def test_table_length_validated():
    with pytest.raises(CubeError, match='表长度'):
        CubeLUT(4, [0.0, 0.0, 0.0])


def test_apply_cube_rejects_rgba():
    """alpha 必须由 grade.py 处理，这里刻意不接受 RGBA。"""
    lut = CubeLUT.identity(5)
    with pytest.raises(ValueError, match='只接受 RGB'):
        apply_cube(Image.new('RGBA', (4, 4)), lut)


def test_strength_interpolates():
    img = Image.new('RGB', (8, 8), (200, 100, 50))
    dark = CubeLUT.identity(5)
    # 用一个真实会变暗的 LUT
    ops, _ = cssfilter.parse_chain('brightness(.5)')
    table = []
    for b in range(5):
        for g in range(5):
            for r in range(5):
                c = (r / 4, g / 4, b / 4)
                for op in ops:
                    c = op(c)
                table.extend(c)
    dark = CubeLUT(5, table)
    full = np.asarray(apply_cube(img, dark, strength=1.0), dtype=float).mean()
    half = np.asarray(apply_cube(img, dark, strength=0.5), dtype=float).mean()
    none = np.asarray(apply_cube(img, dark, strength=0.0), dtype=float).mean()
    assert full < half < none, 'strength 没有起插值作用'


def test_baked_luts_exist_and_parse():
    """烘焙产物应可解析；identity.cube 必须真的是恒等。"""
    luts_dir = LAB_ROOT / 'luts'
    files = sorted(luts_dir.glob('*.cube'))
    assert files, '还没烘焙 LUT，先跑 python tools/bake_luts.py'
    for path in files:
        lut = read_cube(path)
        assert lut.size >= 2
    identity = read_cube(luts_dir / 'identity.cube')
    ref = CubeLUT.identity(identity.size)
    assert identity.table == pytest.approx(ref.table, abs=1e-6)

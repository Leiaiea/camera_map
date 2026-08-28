""".cube 3D LUT 的解析与写出。

Pillow 没有内置 .cube 解析，这里自己实现。LUT 是本项目最重要的可移植资产：
同一个 .cube 文件，桌面用 Pillow Color3DLUT，iOS 用 CIColorCube，
Android 用 GPU shader，观感一致。

索引顺序是最容易搞错的地方，这里钉死：
.cube 规范中数据行按「R 变化最快」排列（即 R 是最内层循环），
每行是一个 RGB 输出值。Pillow Color3DLUT 的 table 要求
「先通道，再第一维，再第二维，再第三维」，即 flat[((b*size + g)*size + r)*3 + c]。
两者一致，所以 .cube 的数据行可以直接顺序展开喂给 Color3DLUT。
test_lut.py 里的恒等 LUT 测试就是用来守住这个约定的。
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

# Pillow Color3DLUT 的尺寸限制
MIN_SIZE = 2
MAX_SIZE = 65


class CubeError(ValueError):
    """.cube 文件格式错误。"""


class CubeLUT:
    """一个 3D LUT，可与 Pillow 互转。

    table 为 flat list，长度 size**3 * 3，排布见模块 docstring。
    """

    def __init__(
        self,
        size: int,
        table: list[float],
        *,
        title: str = '',
        domain_min: tuple[float, float, float] = (0.0, 0.0, 0.0),
        domain_max: tuple[float, float, float] = (1.0, 1.0, 1.0),
    ) -> None:
        if not MIN_SIZE <= size <= MAX_SIZE:
            raise CubeError(f'LUT_3D_SIZE 必须在 {MIN_SIZE}-{MAX_SIZE} 之间，得到 {size}')
        expected = size ** 3 * 3
        if len(table) != expected:
            raise CubeError(f'表长度应为 {expected}（size={size}），得到 {len(table)}')
        self.size = size
        self.table = table
        self.title = title
        self.domain_min = domain_min
        self.domain_max = domain_max

    def __repr__(self) -> str:
        return f'CubeLUT(size={self.size}, title={self.title!r})'

    @classmethod
    def identity(cls, size: int = 33, *, title: str = 'identity') -> CubeLUT:
        """恒等 LUT：作用后像素零变化。用于测试与烘焙的起点。"""
        table: list[float] = []
        denom = size - 1
        for b in range(size):
            for g in range(size):
                for r in range(size):
                    table.extend((r / denom, g / denom, b / denom))
        return cls(size, table, title=title)

    def to_pillow(self) -> ImageFilter.Color3DLUT:
        """转成 Pillow 滤镜。

        DOMAIN 非 [0,1] 时先归一化——Pillow 只认 0.0-1.0 的输出范围。
        """
        table = self.table
        dmin, dmax = self.domain_min, self.domain_max
        if dmin != (0.0, 0.0, 0.0) or dmax != (1.0, 1.0, 1.0):
            spans = [
                (dmax[i] - dmin[i]) or 1.0
                for i in range(3)
            ]
            table = [
                (table[i] - dmin[i % 3]) / spans[i % 3]
                for i in range(len(table))
            ]
        return ImageFilter.Color3DLUT(self.size, table, channels=3)

    def sample(self, r: int, g: int, b: int) -> tuple[float, float, float]:
        """取一个网格点的输出值，按 (r, g, b) 网格索引。"""
        idx = ((b * self.size + g) * self.size + r) * 3
        return (self.table[idx], self.table[idx + 1], self.table[idx + 2])


def read_cube(path: str | Path) -> CubeLUT:
    """解析 .cube 文件。

    识别 TITLE / LUT_3D_SIZE / DOMAIN_MIN / DOMAIN_MAX，忽略注释与空行。
    LUT_1D_SIZE 不支持（本项目不需要），遇到直接报错而不是静默误读。
    """
    path = Path(path)
    size: int | None = None
    title = ''
    domain_min = (0.0, 0.0, 0.0)
    domain_max = (1.0, 1.0, 1.0)
    table: list[float] = []

    with path.open('r', encoding='utf-8') as fh:
        for lineno, raw in enumerate(fh, 1):
            line = raw.split('#', 1)[0].strip()
            if not line:
                continue
            head, _, rest = line.partition(' ')
            key = head.upper()
            if key == 'TITLE':
                title = rest.strip().strip('"')
            elif key == 'LUT_3D_SIZE':
                size = int(rest.strip())
            elif key == 'LUT_1D_SIZE':
                raise CubeError(f'{path.name}: 本项目不支持 1D LUT')
            elif key == 'DOMAIN_MIN':
                domain_min = _triple(rest, path, lineno)
            elif key == 'DOMAIN_MAX':
                domain_max = _triple(rest, path, lineno)
            else:
                parts = line.split()
                if len(parts) != 3:
                    raise CubeError(f'{path.name}:{lineno} 数据行应有 3 个数值，得到 {len(parts)}')
                try:
                    table.extend(float(p) for p in parts)
                except ValueError as exc:
                    raise CubeError(f'{path.name}:{lineno} 数值解析失败: {line}') from exc

    if size is None:
        raise CubeError(f'{path.name}: 缺少 LUT_3D_SIZE')
    return CubeLUT(
        size, table, title=title or path.stem,
        domain_min=domain_min, domain_max=domain_max,
    )


def write_cube(lut: CubeLUT, path: str | Path, *, comment: str = '') -> None:
    """写出 .cube 文件。comment 用于记录这个 LUT 的来源（如对应的 CSS filter 链）。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    if comment:
        lines.extend(f'# {ln}' for ln in comment.splitlines())
    lines.append(f'TITLE "{lut.title}"')
    lines.append(f'LUT_3D_SIZE {lut.size}')
    lines.append('DOMAIN_MIN {:.6f} {:.6f} {:.6f}'.format(*lut.domain_min))
    lines.append('DOMAIN_MAX {:.6f} {:.6f} {:.6f}'.format(*lut.domain_max))
    lines.append('')
    for i in range(0, len(lut.table), 3):
        lines.append('{:.6f} {:.6f} {:.6f}'.format(*lut.table[i:i + 3]))
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def _triple(text: str, path: Path, lineno: int) -> tuple[float, float, float]:
    parts = text.split()
    if len(parts) != 3:
        raise CubeError(f'{path.name}:{lineno} 期望 3 个数值，得到 {len(parts)}')
    a, b, c = (float(p) for p in parts)
    return (a, b, c)


def apply_cube(img: Image.Image, lut: CubeLUT, strength: float = 1.0) -> Image.Image:
    """把 LUT 作用到 RGB 图上。

    只接受 RGB（不含 alpha）——alpha 的保全由 grade.py 负责，
    这里刻意不处理，避免 alpha 被 LUT 污染这个坑被掩盖。
    strength 用原图与结果的线性插值实现，方便扫参。
    """
    if img.mode != 'RGB':
        raise ValueError(f'apply_cube 只接受 RGB，得到 {img.mode}')
    if strength <= 0:
        return img.copy()
    out = img.filter(lut.to_pillow())
    if strength >= 1:
        return out
    return Image.blend(img, out, strength)

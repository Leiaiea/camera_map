"""编排三个阶段：抠图 → 校色 → 白边。

顺序是本项目最关键的决定，理由写在 grade.py 的模块 docstring 里。
低置信度的图（天空、云）默认跳过，不产出垃圾。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from . import cutout as cutout_mod
from . import grade as grade_mod
from . import sticker as sticker_mod
from .recipe import Recipe

# Pillow 对超大图的解压炸弹保护，这批相机原图 4096px 远低于默认上限，
# 这里不动默认值，只是显式记一笔：如果将来遇到更大的图需要调 MAX_IMAGE_PIXELS。


@dataclass
class StageTiming:
    cutout: float = 0.0
    grade: float = 0.0
    sticker: float = 0.0

    @property
    def total(self) -> float:
        return self.cutout + self.grade + self.sticker


@dataclass
class ProcessReport:
    src: Path
    ok: bool
    out_path: Path | None = None
    coverage: float = 0.0
    edge_softness: float = 0.0
    confident: bool = True
    reason: str = ''
    model: str = ''
    size_in: tuple[int, int] = (0, 0)
    size_out: tuple[int, int] = (0, 0)
    border_px: int = 0
    timing: StageTiming = field(default_factory=StageTiming)
    error: str = ''
    alpha_preserved: bool | None = None

    def summary(self) -> str:
        if self.error:
            return f'✗ {self.src.name}  失败: {self.error}'
        if not self.ok:
            return f'⚠ {self.src.name}  跳过: {self.reason}'
        alpha_note = ''
        if self.alpha_preserved is False:
            alpha_note = '  [警告: 校色阶段改动了 alpha]'
        return (
            f'✓ {self.src.name}  {self.size_in[0]}x{self.size_in[1]}'
            f' → {self.size_out[0]}x{self.size_out[1]}'
            f'  覆盖率 {self.coverage:.1%}  白边 {self.border_px}px'
            f'  {self.timing.total:.1f}s'
            f'（抠图 {self.timing.cutout:.1f} / 校色 {self.timing.grade:.1f}'
            f' / 白边 {self.timing.sticker:.1f}）{alpha_note}'
        )


def run_stages(
    img: Image.Image,
    recipe: Recipe,
    *,
    force: bool = False,
    check_alpha: bool = True,
) -> tuple[Image.Image | None, cutout_mod.CutoutResult, StageTiming, bool | None]:
    """跑三个阶段，返回 (成品或 None, 抠图结果, 计时, alpha 是否保真)。

    抽出来是为了让 compare 模式能复用而不必落盘。
    """
    timing = StageTiming()

    t0 = time.perf_counter()
    cut = cutout_mod.cut_out(
        img,
        model=recipe.cutout.get('model', cutout_mod.DEFAULT_MODEL),
        post_process=recipe.cutout.get('post_process_mask', True),
        alpha_matting=recipe.cutout.get('alpha_matting', False),
        max_side=recipe.cutout.get('inference_max_side'),
        confidence=recipe.cutout.get('confidence'),
    )
    timing.cutout = time.perf_counter() - t0

    if not cut.confident and not force:
        return None, cut, timing, None

    alpha_before = np.asarray(cut.image.getchannel('A')) if check_alpha else None

    t0 = time.perf_counter()
    graded = grade_mod.grade(cut.image, recipe.grade, lut=recipe.lut)
    timing.grade = time.perf_counter() - t0

    alpha_ok: bool | None = None
    if check_alpha and alpha_before is not None:
        alpha_after = np.asarray(graded.getchannel('A'))
        alpha_ok = bool(np.array_equal(alpha_before, alpha_after))

    t0 = time.perf_counter()
    final = sticker_mod.make_sticker(graded, recipe.sticker, recipe.output)
    timing.sticker = time.perf_counter() - t0

    return final, cut, timing, alpha_ok


def process(
    src: Path,
    recipe: Recipe,
    outdir: Path,
    *,
    emit_intermediates: bool = False,
    force: bool = False,
) -> ProcessReport:
    """处理单张照片并落盘。"""
    src = Path(src)
    report = ProcessReport(src=src, ok=False)
    try:
        with Image.open(src) as handle:
            # 相机原图常带 EXIF 方向，不转正的话成品会躺着
            from PIL import ImageOps
            img = ImageOps.exif_transpose(handle)
            img = img.convert('RGB')
        report.size_in = img.size

        final, cut, timing, alpha_ok = run_stages(img, recipe, force=force)
        report.coverage = cut.coverage
        report.edge_softness = cut.edge_softness
        report.confident = cut.confident
        report.reason = cut.reason
        report.model = cut.model
        report.timing = timing
        report.alpha_preserved = alpha_ok

        outdir = Path(outdir)
        outdir.mkdir(parents=True, exist_ok=True)
        stem = src.stem

        if emit_intermediates:
            cut.mask.save(outdir / f'{stem}_mask.png')
            cut.image.save(outdir / f'{stem}_cutout.png')

        if final is None:
            return report

        border_cfg = recipe.sticker.get('border') or {}
        report.border_px = sticker_mod.border_width(
            report.size_in,
            float(border_cfg.get('width_ratio', 0.02)),
            int(border_cfg.get('min_width', 2)),
        )

        if emit_intermediates:
            graded = grade_mod.grade(cut.image, recipe.grade, lut=recipe.lut)
            graded.save(outdir / f'{stem}_graded.png')

        out_path = outdir / f'{stem}_sticker.png'
        final.save(out_path)
        report.out_path = out_path
        report.size_out = final.size
        report.ok = True
    except Exception as exc:
        report.error = f'{type(exc).__name__}: {exc}'
    return report


IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'}


def iter_images(root: Path) -> list[Path]:
    """列出目录里的图片，按名字排序，保证批量结果可复现。"""
    root = Path(root)
    if root.is_file():
        return [root]
    return sorted(
        p for p in root.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
    )

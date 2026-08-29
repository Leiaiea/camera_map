"""把原型里的 CSS filter 链烘焙成 .cube 文件。

为什么这么做：仓库里本来没有任何 .cube，但 photo-map-explorations 的 38 个
CSS 文件里已经有几十条 filter 链，那就是既有的视觉调性。与其凭感觉重调，
不如把它们按规范算成 LUT，工具成品就和原型同源。

可重复运行，覆盖 luts/ 下的输出。

  python tools/bake_luts.py
  python tools/bake_luts.py --size 33 --scan ../photo-map-explorations
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / 'src'))

from photo_sticker import console, cssfilter  # noqa: E402
from photo_sticker.lut import CubeLUT, write_cube  # noqa: E402

# 从原型 CSS 里挑出的、最能代表整体调性的几条链。
# 频次与来源见 luts/README.md；这里的键名就是输出文件名。
PRESETS: dict[str, tuple[str, str]] = {
    'identity': (
        'none',
        '恒等 LUT，作用后像素零变化。用于验证 .cube 解析与索引顺序。',
    ),
    'paper-muted': (
        'saturate(.65) contrast(1.03) brightness(.68)',
        '扫描页调性，低饱和压暗，最接近原型的纸感基调。',
    ),
    'paper-warm': (
        'sepia(.18) saturate(.82) contrast(1.03)',
        '轻微暖调偏黄，接近 --paper #f4f2eb 的纸张感。',
    ),
    'paper-rose': (
        'saturate(.55) sepia(.3) hue-rotate(310deg) contrast(.9) brightness(1.1)',
        '偏玫瑰色的柔和调性，来自撕页染色一类实验。',
    ),
    'paper-deep': (
        'saturate(.72) contrast(1.1) brightness(.62)',
        '更重的压暗高对比，适合需要主体沉下去的场景。',
    ),
}


def bake(css: str, size: int, *, title: str) -> tuple[CubeLUT, list[str]]:
    """把一条 CSS filter 链作用到恒等网格上，得到 LUT。"""
    ops, skipped = cssfilter.parse_chain(css)
    table: list[float] = []
    denom = size - 1
    # 排布必须与 lut.py 的约定一致：R 变化最快
    for b in range(size):
        for g in range(size):
            for r in range(size):
                color = (r / denom, g / denom, b / denom)
                for op in ops:
                    color = op(color)
                table.extend(color)
    return CubeLUT(size, table, title=title), skipped


def scan_css_filters(root: Path) -> list[tuple[int, str]]:
    """统计原型 CSS 里的 filter 链，供人工挑选新预设时参考。"""
    pattern = re.compile(r'filter:\s*([^;}"\']+)')
    counter: Counter[str] = Counter()
    for path in sorted(root.glob('*.css')):
        text = path.read_text(encoding='utf-8', errors='replace')
        for match in pattern.finditer(text):
            chain = ' '.join(match.group(1).split())
            if chain and chain.lower() != 'none':
                counter[chain] += 1
    return [(count, chain) for chain, count in counter.most_common()]


def main(argv: list[str] | None = None) -> int:
    console.setup()
    parser = argparse.ArgumentParser(description='从 CSS filter 链烘焙 .cube LUT')
    parser.add_argument('--size', type=int, default=33,
                        help='LUT 网格边长，默认 33（Pillow 上限 65）')
    parser.add_argument('--out', type=Path, default=REPO_ROOT / 'luts',
                        help='输出目录，默认 luts/')
    parser.add_argument('--scan', type=Path, default=None,
                        help='扫描指定目录下的 CSS，打印 filter 链统计后退出')
    args = parser.parse_args(argv)

    if args.scan:
        rows = scan_css_filters(args.scan)
        if not rows:
            print(f'{args.scan} 下没找到 filter 链')
            return 1
        print(f'{args.scan} 的 filter 链统计（频次 / 链）：')
        for count, chain in rows:
            print(f'  {count:3d}  {chain}')
        return 0

    args.out.mkdir(parents=True, exist_ok=True)
    for name, (css, note) in PRESETS.items():
        lut, skipped = bake(css, args.size, title=name)
        comment = '\n'.join([
            f'由 tools/bake_luts.py 生成，请勿手改。',
            f'来源 CSS filter 链: {css}',
            f'说明: {note}',
        ] + ([f'已跳过空间性滤镜: {", ".join(skipped)}'] if skipped else []))
        dest = args.out / f'{name}.cube'
        write_cube(lut, dest, comment=comment)
        print(f'  写出 {dest.relative_to(REPO_ROOT)}  size={args.size}  <- {css}')
    print(f'完成，共 {len(PRESETS)} 个 LUT。')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

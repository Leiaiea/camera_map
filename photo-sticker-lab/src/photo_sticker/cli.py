"""命令行入口。

设计取向：纯 CLI，调参靠 --sweep 出对比长图，不做 GUI。
子命令：single / batch / compare / fetch-models / inspect
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from . import console, contactsheet, cutout, pipeline, recipe as recipe_mod
from .recipe import RecipeError

LAB_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUT = LAB_ROOT / 'out'


def _parse_sweep(text: str) -> tuple[str, list]:
    """解析 --sweep sticker.border.width_ratio=0.01,0.02,0.04"""
    if '=' not in text:
        raise argparse.ArgumentTypeError(
            '格式应为 路径=值1,值2,值3，例如 sticker.border.width_ratio=0.01,0.02'
        )
    key, _, values = text.partition('=')
    parsed: list = []
    for raw in values.split(','):
        raw = raw.strip()
        if not raw:
            continue
        # 尽量保留原始类型：数字走数字，true/false 走 bool，其余当字符串
        low = raw.lower()
        if low in ('true', 'false'):
            parsed.append(low == 'true')
            continue
        try:
            parsed.append(int(raw) if raw.lstrip('-').isdigit() else float(raw))
        except ValueError:
            parsed.append(raw)
    if not parsed:
        raise argparse.ArgumentTypeError(f'--sweep 没有解析到任何值: {text}')
    return key.strip(), parsed


def _apply_overrides(rec, args) -> None:
    """把 CLI 上的快捷参数覆盖进配方。"""
    if getattr(args, 'model', None):
        rec.cutout['model'] = args.model
    if getattr(args, 'lut', None) is not None:
        rec.grade.setdefault('lut', {})['file'] = args.lut or None
        rec.load_lut()
    if getattr(args, 'border_ratio', None) is not None:
        rec.sticker.setdefault('border', {})['width_ratio'] = args.border_ratio
    if getattr(args, 'no_shadow', False):
        rec.sticker.setdefault('shadow', {})['enabled'] = False
    if getattr(args, 'max_side', None) is not None:
        rec.cutout['inference_max_side'] = args.max_side or None


def cmd_single(args) -> int:
    rec = recipe_mod.load(args.recipe)
    _apply_overrides(rec, args)
    report = pipeline.process(
        args.src, rec, args.out,
        emit_intermediates=args.emit_intermediates,
        force=args.force,
    )
    print(report.summary())
    if report.out_path:
        print(f'  输出: {report.out_path}')
    return 0 if report.ok else 1


def cmd_batch(args) -> int:
    rec = recipe_mod.load(args.recipe)
    _apply_overrides(rec, args)
    paths = pipeline.iter_images(Path(args.src))
    if not paths:
        print(f'{args.src} 下没有找到图片', file=sys.stderr)
        return 1
    if args.limit:
        paths = paths[:args.limit]

    print(f'配方 {rec.name}｜模型 {rec.cutout["model"]}｜共 {len(paths)} 张\n')
    reports = []
    for path in paths:
        report = pipeline.process(
            path, rec, args.out,
            emit_intermediates=args.emit_intermediates,
            force=args.force,
        )
        reports.append(report)
        print(report.summary())

    ok = [r for r in reports if r.ok]
    skipped = [r for r in reports if not r.ok and not r.error]
    failed = [r for r in reports if r.error]
    total = sum(r.timing.total for r in reports)
    print(f'\n成功 {len(ok)}｜跳过 {len(skipped)}｜失败 {len(failed)}')
    if reports:
        print(f'总耗时 {total:.1f}s，均值 {total / len(reports):.1f}s/张')
    bad_alpha = [r for r in ok if r.alpha_preserved is False]
    if bad_alpha:
        print(f'警告：{len(bad_alpha)} 张的 alpha 在校色阶段被改动，这是 bug')
    if skipped:
        print('\n跳过的（低置信度，加 --force 可强制产出）：')
        for r in skipped:
            print(f'  {r.src.name}: {r.reason}')
    return 0 if ok else 1


def cmd_compare(args) -> int:
    """同一张图跑多组参数，拼一张对比长图。调参主力。"""
    base = recipe_mod.load(args.recipe)
    _apply_overrides(base, args)

    src = Path(args.src)
    with Image.open(src) as handle:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(handle).convert('RGB')

    variants: list[tuple[str, object]] = []
    if args.models:
        for name in args.models.split(','):
            name = name.strip()
            if not name:
                continue
            rec = base.copy()
            rec.cutout['model'] = name
            variants.append((f'model={name}', rec))
    elif args.sweep:
        key, values = args.sweep
        for value in values:
            rec = base.copy()
            try:
                rec.set_path(key, value)
            except RecipeError as exc:
                print(f'✗ {exc}', file=sys.stderr)
                return 2
            variants.append((f'{key.split(".")[-1]}={value}', rec))
    else:
        print('需要 --models 或 --sweep 之一', file=sys.stderr)
        return 2

    panels: list[tuple[str, Image.Image]] = []
    for label, rec in variants:
        final, cut, timing, alpha_ok = pipeline.run_stages(img, rec, force=args.force)
        if final is None:
            print(f'⚠ {label}: 跳过（{cut.reason}）')
            continue
        note = f'{label}\n覆盖率 {cut.coverage:.1%}  {timing.total:.1f}s'
        if alpha_ok is False:
            note += '  [alpha 被改动]'
        panels.append((note, final))
        print(f'✓ {label}  覆盖率 {cut.coverage:.1%}  {timing.total:.1f}s')

    if not panels:
        print('没有任何变体产出结果', file=sys.stderr)
        return 1

    sheet = contactsheet.build(panels, title=f'{src.name}｜配方 {base.name}')
    out_path = Path(args.out)
    if out_path.suffix.lower() != '.png':
        out_path.mkdir(parents=True, exist_ok=True)
        out_path = out_path / f'{src.stem}_compare.png'
    else:
        out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    print(f'\n对比图: {out_path}')
    return 0


def cmd_fetch_models(args) -> int:
    names = args.models.split(',') if args.models else [cutout.DEFAULT_MODEL]
    names = [n.strip() for n in names if n.strip()]
    print(f'模型缓存目录: {cutout.MODELS_DIR}')
    print('（已在 .gitignore 中，权重不进 git 历史）\n')
    rc = 0
    for name, ok, note in cutout.fetch_models(names):
        if ok:
            print(f'✓ {name}  {note}')
        else:
            print(f'✗ {name}  {note}', file=sys.stderr)
            rc = 1
    return rc


def cmd_inspect(args) -> int:
    """打印配方最终生效的值（合并默认值之后），排查参数来源。"""
    rec = recipe_mod.load(args.recipe)
    _apply_overrides(rec, args)
    print(json.dumps(rec.data, ensure_ascii=False, indent=2))
    if rec.lut:
        print(f'\nLUT: {rec.lut!r}')
    print('\n可用模型：')
    for name, desc in cutout.KNOWN_MODELS.items():
        mark = '←默认' if name == rec.cutout['model'] else ''
        print(f'  {name:20s} {desc} {mark}')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='photo_sticker',
        description='照片贴纸实验室：抠图 → 自动校色 → 白边贴纸',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例：
  python -m photo_sticker single ../ptoto/教堂.jpg --emit-intermediates
  python -m photo_sticker batch ../ptoto --recipe paper-muted -o out/batch-01
  python -m photo_sticker compare ../ptoto/小狗.jpg --models birefnet-general,isnet-general-use,u2netp
  python -m photo_sticker compare ../ptoto/冰箱贴.jpg --sweep sticker.border.width_ratio=0.01,0.02,0.04
  python -m photo_sticker fetch-models
""",
    )
    sub = parser.add_subparsers(dest='command', required=True)

    def add_common(p: argparse.ArgumentParser) -> None:
        p.add_argument('--recipe', default=None,
                       help='配方路径或 recipes/ 下的名字（如 paper-muted）')
        p.add_argument('--model', default=None, help='覆盖配方里的抠图模型')
        p.add_argument('--lut', default=None,
                       help='覆盖 LUT 路径；传空字符串则关闭 LUT')
        p.add_argument('--border-ratio', type=float, default=None,
                       help='覆盖白边宽度比例')
        p.add_argument('--max-side', type=int, default=None,
                       help='推理前下采样的长边；0 表示不下采样')
        p.add_argument('--no-shadow', action='store_true', help='关闭投影')
        p.add_argument('--force', action='store_true',
                       help='忽略低置信度警告，强制产出')

    p_single = sub.add_parser('single', help='处理单张照片')
    p_single.add_argument('src', type=Path)
    p_single.add_argument('-o', '--out', type=Path, default=DEFAULT_OUT / 'single')
    p_single.add_argument('--emit-intermediates', action='store_true',
                          help='额外写出 _mask.png / _cutout.png / _graded.png')
    add_common(p_single)
    p_single.set_defaults(func=cmd_single)

    p_batch = sub.add_parser('batch', help='批量处理一个目录')
    p_batch.add_argument('src', type=Path)
    p_batch.add_argument('-o', '--out', type=Path, default=DEFAULT_OUT / 'batch')
    p_batch.add_argument('--emit-intermediates', action='store_true')
    p_batch.add_argument('--limit', type=int, default=None, help='只处理前 N 张')
    add_common(p_batch)
    p_batch.set_defaults(func=cmd_batch)

    p_cmp = sub.add_parser('compare', help='扫参并拼对比长图')
    p_cmp.add_argument('src', type=Path)
    p_cmp.add_argument('-o', '--out', type=Path, default=DEFAULT_OUT / 'compare')
    p_cmp.add_argument('--models', default=None,
                       help='逗号分隔的模型名，横向对比抠图质量')
    p_cmp.add_argument('--sweep', type=_parse_sweep, default=None,
                       help='配方字段扫参，如 sticker.border.width_ratio=0.01,0.02')
    add_common(p_cmp)
    p_cmp.set_defaults(func=cmd_compare)

    p_fetch = sub.add_parser('fetch-models', help='预下载模型，之后可离线')
    p_fetch.add_argument('--models', default=None,
                         help=f'逗号分隔；默认只拉 {cutout.DEFAULT_MODEL}')
    p_fetch.set_defaults(func=cmd_fetch_models)

    p_ins = sub.add_parser('inspect', help='打印生效的配方与可用模型')
    add_common(p_ins)
    p_ins.set_defaults(func=cmd_inspect)

    return parser


def main(argv: list[str] | None = None) -> int:
    console.setup()
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except RecipeError as exc:
        print(f'✗ 配方错误: {exc}', file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print('\n已中断', file=sys.stderr)
        return 130


if __name__ == '__main__':
    raise SystemExit(main())

"""配方加载与校验。

配方 JSON 是桌面与手机之间的契约。手机端不跑 Python，但读同一份 JSON、
同一份 .cube，就能把效果对齐。所以所有可调参数都必须落在配方里，
不能散落成代码里的魔法数字。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .cutout import DEFAULT_CONFIDENCE, DEFAULT_MODEL
from .lut import CubeLUT, read_cube

LAB_ROOT = Path(__file__).resolve().parent.parent.parent
RECIPES_DIR = LAB_ROOT / 'recipes'

SCHEMA_VERSION = 1

DEFAULTS: dict[str, Any] = {
    'version': SCHEMA_VERSION,
    'name': 'default',
    'cutout': {
        'model': DEFAULT_MODEL,
        'post_process_mask': True,
        'alpha_matting': False,
        'inference_max_side': 2048,
        'confidence': dict(DEFAULT_CONFIDENCE),
    },
    'grade': {
        'auto_tone': {
            'enabled': True,
            'measure_on': 'subject',
            'gray_world': True,
            'clip_percent': 0.5,
            'target_luma': 0.55,
            'strength': 0.8,
        },
        'lut': {'file': None, 'strength': 1.0},
    },
    'sticker': {
        'border': {
            'width_ratio': 0.02,
            'min_width': 2,
            'color': [255, 255, 255, 255],
            'smooth': 1.0,
            'antialias': 0.8,
        },
        # 默认取自原型现有的 filter:drop-shadow(0 8px 7px #534d4555)
        'shadow': {
            'enabled': True,
            'offset': [0, 8],
            'blur': 7,
            'color': [83, 77, 69, 85],
        },
    },
    'output': {
        'format': 'png',
        'trim_to_content': True,
        'padding': 12,
    },
}


class RecipeError(ValueError):
    """配方内容不合法。"""


def _deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


@dataclass
class Recipe:
    """一份配方，外加解析好的 LUT。"""
    data: dict[str, Any] = field(default_factory=lambda: json.loads(json.dumps(DEFAULTS)))
    path: Path | None = None
    lut: CubeLUT | None = None

    @property
    def name(self) -> str:
        return str(self.data.get('name', 'default'))

    @property
    def cutout(self) -> dict:
        return self.data['cutout']

    @property
    def grade(self) -> dict:
        return self.data['grade']

    @property
    def sticker(self) -> dict:
        return self.data['sticker']

    @property
    def output(self) -> dict:
        return self.data['output']

    def set_path(self, dotted: str, value: Any) -> None:
        """按 'sticker.border.width_ratio' 这样的路径改值，供 --sweep 使用。"""
        parts = dotted.split('.')
        node = self.data
        for part in parts[:-1]:
            if part not in node or not isinstance(node[part], dict):
                raise RecipeError(f'配方里没有这个路径: {dotted}')
            node = node[part]
        if parts[-1] not in node:
            raise RecipeError(f'配方里没有这个字段: {dotted}')
        node[parts[-1]] = value

    def get_path(self, dotted: str) -> Any:
        node: Any = self.data
        for part in dotted.split('.'):
            if not isinstance(node, dict) or part not in node:
                raise RecipeError(f'配方里没有这个路径: {dotted}')
            node = node[part]
        return node

    def copy(self) -> Recipe:
        return Recipe(
            data=json.loads(json.dumps(self.data)),
            path=self.path,
            lut=self.lut,
        )

    def load_lut(self) -> CubeLUT | None:
        """按配方里的相对路径解析 LUT。相对 lab 根目录，便于配方在机器间搬。"""
        lut_cfg = self.grade.get('lut') or {}
        rel = lut_cfg.get('file')
        if not rel:
            self.lut = None
            return None
        candidate = Path(rel)
        if not candidate.is_absolute():
            candidate = LAB_ROOT / candidate
        if not candidate.exists():
            raise RecipeError(
                f'LUT 文件不存在: {candidate}\n'
                f'先跑 python tools/bake_luts.py 生成'
            )
        self.lut = read_cube(candidate)
        return self.lut


def validate(data: dict) -> None:
    version = data.get('version', SCHEMA_VERSION)
    if version != SCHEMA_VERSION:
        raise RecipeError(f'配方版本 {version} 与当前 schema {SCHEMA_VERSION} 不符')
    measure_on = (data.get('grade', {}).get('auto_tone') or {}).get('measure_on', 'subject')
    if measure_on not in ('subject', 'full'):
        raise RecipeError(f"measure_on 只能是 'subject' 或 'full'，得到 {measure_on!r}")
    border = (data.get('sticker', {}).get('border') or {})
    if float(border.get('width_ratio', 0.02)) < 0:
        raise RecipeError('width_ratio 不能为负')
    color = border.get('color', [255, 255, 255, 255])
    if len(color) != 4:
        raise RecipeError(f'border.color 需要 4 个分量 (RGBA)，得到 {len(color)}')


def load(source: str | Path | None = None) -> Recipe:
    """加载配方。source 可以是路径，也可以是 recipes/ 下的名字（不带 .json）。"""
    if source is None:
        recipe = Recipe()
        validate(recipe.data)
        recipe.load_lut()
        return recipe

    path = Path(source)
    if not path.exists() and path.suffix == '':
        path = RECIPES_DIR / f'{source}.json'
    if not path.exists():
        raise RecipeError(f'找不到配方: {source}')

    raw = json.loads(path.read_text(encoding='utf-8'))
    data = _deep_merge(DEFAULTS, raw)
    validate(data)
    recipe = Recipe(data=data, path=path)
    recipe.load_lut()
    return recipe

"""阶段一：抠图（主体分割）。

模型选择不是随便定的。Cloudflare 的独立评测里：
  birefnet-general    IoU 0.87 / Dice 0.92
  isnet-general-use   IoU 0.82 / Dice 0.89
  泛化 U²Net          人像 0.89，但非人像（DIS5K）塌到 0.39

ptoto/ 这批是物体和风景（教堂、金鱼、冰箱贴、公园长椅），不是人像，
所以默认 birefnet-general，不用 rembg 自己的默认 u2net。
u2netp / silueta 保留下来是为了对照未来手机端的体量，不是为了当默认值。

alpha matting 默认关闭：birefnet / isnet 已经输出足够柔和的 alpha，
反射性开 matting 反而会变差（rembg 自己当前也这么建议）。

rembg 的 import 放在函数内部，这样没装依赖时其余模块（LUT、白边）仍可用。
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

# 模型缓存目录：放在工具文件夹内，自包含、换机器好排查；由 .gitignore 收掉
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / 'models'

# 默认值来自上面的评测结论
DEFAULT_MODEL = 'birefnet-general'

# 可选模型及用途说明，供 CLI 的 --help 和 fetch-models 使用
KNOWN_MODELS: dict[str, str] = {
    'birefnet-general': '默认。物体/风景实测最好（IoU 0.87），边缘最干净，最慢',
    'isnet-general-use': '质量与速度的平衡点（IoU 0.82）',
    'u2netp': '轻量约 4.7MB / 约 30ms，作为手机端体量的性能参照',
    'silueta': 'u2net 的 43MB 精简版',
    'u2net': 'rembg 的原始默认值，非人像上明显偏弱，仅作对照',
}

# 掩膜置信度阈值。天空/云一类没有显著前景的照片会落在覆盖率的极端一侧，
# 此时报低置信度并跳过，而不是产出垃圾。
DEFAULT_CONFIDENCE = {
    'min_coverage': 0.02,
    'max_coverage': 0.92,
    'max_edge_softness': 0.35,
}


@dataclass
class CutoutResult:
    """抠图结果与掩膜质量指标。"""
    image: Image.Image          # RGBA，原尺寸
    mask: Image.Image           # 'L'，调试用
    coverage: float             # alpha>128 的像素占比
    edge_softness: float        # 半透明像素占前景的比例
    confident: bool
    reason: str = ''            # confident=False 时说明原因
    model: str = DEFAULT_MODEL


def _ensure_model_home() -> None:
    """把模型缓存指向 models/。

    必须在建 rembg session 之前设置，否则不生效。
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault('U2NET_HOME', str(MODELS_DIR))


_SESSIONS: dict[str, object] = {}


def get_session(model: str = DEFAULT_MODEL):
    """建/取 rembg session 并缓存。

    session 复用很重要：批量处理时每张都新建会反复加载几百 MB 权重。
    """
    if model in _SESSIONS:
        return _SESSIONS[model]
    _ensure_model_home()
    from rembg import new_session  # 延迟导入
    session = new_session(model)
    _SESSIONS[model] = session
    return session


def mask_metrics(mask: Image.Image) -> tuple[float, float]:
    """返回 (coverage, edge_softness)。

    coverage：alpha>128 占全图比例，判断有没有主体、是不是整张都被当成主体。
    edge_softness：半透明像素占前景的比例。天空这类没有清晰边界的图，
    掩膜会大面积处于中间值，这个数会异常高。
    """
    arr = np.asarray(mask.convert('L'))
    total = arr.size
    solid = int((arr > 128).sum())
    coverage = solid / total if total else 0.0
    foreground = int((arr > 0).sum())
    partial = int(((arr > 0) & (arr < 255)).sum())
    edge_softness = partial / foreground if foreground else 0.0
    return coverage, edge_softness


def cut_out(
    img: Image.Image,
    model: str = DEFAULT_MODEL,
    *,
    post_process: bool = True,
    alpha_matting: bool = False,
    max_side: int | None = 2048,
    confidence: dict | None = None,
) -> CutoutResult:
    """跑分割，得到透明 PNG 与掩膜质量指标。

    max_side：先把图缩到这个长边跑推理，再把掩膜放大回原尺寸贴到原图上。
    4096px 原图直接推理在 CPU 上是几十秒级，而掩膜细节收益很小。
    注意最终 alpha 来自放大后的掩膜，RGB 始终是原始像素，不损失分辨率。
    """
    from rembg import remove  # 延迟导入

    src = img.convert('RGB')
    infer_src = src
    if max_side and max(src.size) > max_side:
        scale = max_side / max(src.size)
        new_size = (max(1, round(src.width * scale)), max(1, round(src.height * scale)))
        infer_src = src.resize(new_size, Image.LANCZOS)

    session = get_session(model)
    cut = remove(
        infer_src,
        session=session,
        post_process_mask=post_process,
        alpha_matting=alpha_matting,
        only_mask=False,
    )
    if cut.mode != 'RGBA':
        cut = cut.convert('RGBA')

    mask = cut.getchannel('A')
    if mask.size != src.size:
        mask = mask.resize(src.size, Image.LANCZOS)

    out = src.convert('RGBA')
    out.putalpha(mask)

    coverage, edge_softness = mask_metrics(mask)
    conf = {**DEFAULT_CONFIDENCE, **(confidence or {})}
    reason = ''
    if coverage < conf['min_coverage']:
        reason = f'几乎没找到主体（覆盖率 {coverage:.1%} < {conf["min_coverage"]:.1%}）'
    elif coverage > conf['max_coverage']:
        reason = f'整张图几乎都被当成主体（覆盖率 {coverage:.1%} > {conf["max_coverage"]:.1%}）'
    elif edge_softness > conf['max_edge_softness']:
        reason = f'掩膜边界不清晰（半透明占比 {edge_softness:.1%} > {conf["max_edge_softness"]:.1%}）'

    return CutoutResult(
        image=out,
        mask=mask,
        coverage=coverage,
        edge_softness=edge_softness,
        confident=not reason,
        reason=reason,
        model=model,
    )


def fetch_models(models: list[str] | None = None) -> list[tuple[str, bool, str]]:
    """预下载模型，之后可离线运行。返回 (模型名, 是否成功, 备注)。"""
    _ensure_model_home()
    targets = models or [DEFAULT_MODEL]
    results: list[tuple[str, bool, str]] = []
    for name in targets:
        try:
            get_session(name)
            results.append((name, True, KNOWN_MODELS.get(name, '')))
        except Exception as exc:  # 网络/模型名错误都归到这里
            results.append((name, False, str(exc)))
    return results

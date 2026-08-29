from __future__ import annotations

import os
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import requests
from PIL import Image


APP_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = APP_ROOT.parents[1] / "历史记忆"
OUTPUT_DIR = SOURCE_DIR / "抠图结果"
MAX_EDGE = 1024
API_URL = "https://api.remove.bg/v1.0/removebg"


def read_api_key() -> str:
    for line in (APP_ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("VITE_REMOVEBG_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("未配置 VITE_REMOVEBG_KEY")


def source_images() -> list[Path]:
    images = sorted(path for path in SOURCE_DIR.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if len(images) != 10:
        raise RuntimeError(f"需要恰好 10 张源图，当前找到 {len(images)} 张")
    return images


def create_request_copy(source: Path, directory: Path) -> Path:
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        output = directory / f"{source.stem}.jpg"
        image.save(output, "JPEG", quality=80, optimize=True)
    return output


def create_original_png(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        image.save(destination, "PNG", optimize=True)


def cutout(source: Path, destination: Path, api_key: str) -> None:
    with source.open("rb") as image_file:
        response = requests.post(
            API_URL,
            headers={"X-Api-Key": api_key},
            files={"image_file": (source.name, image_file, "image/jpeg")},
            data={"size": "preview", "format": "png", "crop": "true", "crop_margin": "10%"},
            timeout=30,
        )
    if not response.ok:
        raise RuntimeError(f"remove.bg 返回 {response.status_code}：{response.text[:300]}")
    if not response.content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("remove.bg 未返回有效 PNG")
    destination.write_bytes(response.content)


def main() -> None:
    api_key = read_api_key()
    sources = source_images()
    temp_dir = Path(tempfile.mkdtemp(prefix="removebg-demo-"))
    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        generated: list[Path] = []
        for index, source in enumerate(sources, start=1):
            output = OUTPUT_DIR / f"demo-memory-{index:03d}-sticker.png"
            if index == 1:
                print(f"保留原图 {index}/10：{source.name}")
                create_original_png(source, output)
            else:
                print(f"抠图 {index}/10：{source.name}")
                request_copy = create_request_copy(source, temp_dir)
                try:
                    cutout(request_copy, output, api_key)
                except Exception as error:
                    print(f"抠图失败，改用原图：{error}")
                    create_original_png(source, output)
            generated.append(output)

        print(f"完成：10 张结果已保存到 {OUTPUT_DIR}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"失败：{error}", file=sys.stderr)
        raise SystemExit(1)

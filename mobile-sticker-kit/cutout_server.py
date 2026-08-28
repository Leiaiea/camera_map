"""A deliberately small same-origin cutout API for Mobile Sticker Kit.

It accepts a raw image body at POST /api/cutout and returns a transparent PNG.
The server does not store uploads. It reuses photo-sticker-lab's model and its
confidence checks, but leaves grading and sticker composition to the browser.
"""

from __future__ import annotations

import argparse
import io
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
LAB_SRC = ROOT / "photo-sticker-lab" / "src"
sys.path.insert(0, str(LAB_SRC))

from photo_sticker import cutout, grade, recipe  # noqa: E402

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class Handler(SimpleHTTPRequestHandler):
    model = cutout.DEFAULT_MODEL
    max_side = 2048

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        request = urlparse(self.path)
        if request.path != "/api/cutout":
            self.send_error(404, "Unknown endpoint")
            return
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 < length <= MAX_UPLOAD_BYTES:
            self.send_error(413, "Image must be between 1 byte and 15 MB")
            return
        try:
            with Image.open(io.BytesIO(self.rfile.read(length))) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
            result = cutout.cut_out(image, model=self.model, max_side=self.max_side)
            if not result.confident:
                self.send_error(422, f"No clear subject found: {result.reason}")
                return
            recipe_name = parse_qs(request.query).get("grade", [None])[0]
            if recipe_name:
                selected_recipe = recipe.load(recipe_name)
                result.image = grade.grade(result.image, selected_recipe.grade, lut=selected_recipe.lut)
            output = io.BytesIO()
            result.image.save(output, "PNG", optimize=True)
            data = output.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:  # Do not expose tracebacks or filesystem paths to clients.
            self.send_error(500, f"Cutout failed: {type(exc).__name__}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local cutout API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--model", default=cutout.DEFAULT_MODEL)
    parser.add_argument("--max-side", type=int, default=2048)
    args = parser.parse_args()
    Handler.model, Handler.max_side = args.model, args.max_side
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Cutout API: http://{args.host}:{args.port}/api/cutout  model={args.model}")
    server.serve_forever()


if __name__ == "__main__":
    main()

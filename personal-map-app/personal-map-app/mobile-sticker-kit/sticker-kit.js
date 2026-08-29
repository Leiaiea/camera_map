/**
 * Mobile Sticker Kit
 * Browser-only sticker rendering plus a small adapter for a cutout API.
 * No framework, bundler, Canvas polyfill, or ML model is shipped to phones.
 */

const DEFAULTS = {
  endpoint: '/api/cutout',
  gradeRecipe: 'paper-muted',
  maxInputSide: 2048,
  borderRatio: 0.022,
  minBorder: 3,
  maxBorder: 18,
  shadow: { x: 0, y: 7, blur: 8, color: 'rgba(56, 48, 40, .28)' },
};

export class StickerKit {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options, shadow: { ...DEFAULTS.shadow, ...options.shadow } };
  }

  /** Upload an original image and receive a transparent PNG from the cutout API. */
  async cutout(file, signal) {
    if (!(file instanceof Blob)) throw new TypeError('cutout() needs an image File or Blob');
    const endpoint = new URL(this.options.endpoint, window.location.href);
    if (this.options.gradeRecipe) endpoint.searchParams.set('grade', this.options.gradeRecipe);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
      signal,
    });
    if (!response.ok) throw new Error(`抠图失败（${response.status}）：${await response.text()}`);
    return response.blob();
  }

  /** Convert a transparent cutout PNG to a finished white-outline sticker PNG. */
  async render(cutoutBlob, overrides = {}) {
    const image = await decodeImage(cutoutBlob);
    const settings = {
      ...this.options,
      ...overrides,
      shadow: { ...this.options.shadow, ...overrides.shadow },
    };
    const scale = Math.min(1, settings.maxInputSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const border = clamp(Math.round(Math.min(width, height) * settings.borderRatio), settings.minBorder, settings.maxBorder);
    const padding = border + Math.ceil(settings.shadow.blur * 2 + Math.max(Math.abs(settings.shadow.x), Math.abs(settings.shadow.y)));
    const canvas = document.createElement('canvas');
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // A 16-point alpha silhouette is materially cheaper than reading every pixel,
    // while producing a smooth enough outline at phone display sizes.
    drawShadow(ctx, image, padding, width, height, settings.shadow);
    drawOutline(ctx, image, padding, width, height, border);
    ctx.drawImage(image, padding, padding, width, height);
    return canvasToBlob(canvas);
  }

  /** Convenience method for the usual select photo -> cutout -> sticker flow. */
  async make(file, overrides = {}, signal) {
    return this.render(await this.cutout(file, signal), overrides);
  }

  /** Add a sticker to any position:relative map element. Returns the <img>. */
  place(mapElement, stickerBlob, { x = 50, y = 50, width = 26, alt = '照片贴纸' } = {}) {
    if (!(mapElement instanceof Element)) throw new TypeError('place() needs a map DOM element');
    const node = document.createElement('img');
    node.className = 'mobile-sticker';
    node.alt = alt;
    node.src = URL.createObjectURL(stickerBlob);
    Object.assign(node.style, {
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${width}%`,
      transform: 'translate(-50%, -100%)', touchAction: 'none', userSelect: 'none',
    });
    mapElement.append(node);
    return node;
  }
}

function drawOutline(ctx, image, x, y, width, height, radius) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff';
  const ring = Math.max(12, Math.ceil(radius * 2.5));
  for (let i = 0; i < ring; i += 1) {
    const angle = (i / ring) * Math.PI * 2;
    ctx.drawImage(image, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, width, height);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function drawShadow(ctx, image, x, y, width, height, shadow) {
  ctx.save();
  ctx.filter = `drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color})`;
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

async function decodeImage(blob) {
  if ('createImageBitmap' in window) return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    return image;
  } finally { URL.revokeObjectURL(url); }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 编码失败')), 'image/png'));
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

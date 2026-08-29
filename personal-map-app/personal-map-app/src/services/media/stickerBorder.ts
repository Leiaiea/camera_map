import {
  MAP_STICKER_DISPLAY_PX,
  STAMP_BORDER_WIDTH_RATIO,
  STAMP_HOLE_RADIUS_PX,
  STAMP_HOLE_SPACING_PX,
  STICKER_BORDER_STYLE,
  STICKER_OUTLINE_ALPHA_THRESHOLD,
  STICKER_OUTLINE_BLUR_RATIO,
  STICKER_OUTLINE_RATIO,
  STICKER_OUTLINE_SUPERSAMPLE,
} from '../../config/mapDemoTuning';

export type StickerBorderStyle = 'outline' | 'stamp';
type StickerBorderPreference = StickerBorderStyle | 'auto';

const borderedStickerCache = new Map<string, Promise<string>>();
const ORTHOGONAL_DISTANCE = 1;
const DIAGONAL_DISTANCE = Math.SQRT2;

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('贴纸边框生成失败')), 'image/png'));
}

function updateDistance(distance: Float32Array, index: number, neighbor: number, step: number): void {
  const candidate = distance[neighbor]! + step;
  if (candidate < distance[index]!) distance[index] = candidate;
}

/**
 * 将“最终显示时要看到的边框像素”反算为源图像素。
 * 以最长边适配 112px contain 显示区，因此不同分辨率与长宽比的图片视觉粗细一致。
 */
function toSourceBorderPixels(bitmap: ImageBitmap, displayedPixels: number): number {
  const displaySize = MAP_STICKER_DISPLAY_PX;
  const safeDisplayedPixels = Math.min(displayedPixels, (displaySize - 1) / 2);
  const sourceLongSide = Math.max(bitmap.width, bitmap.height);
  return Math.max(1, Math.round((sourceLongSide * safeDisplayedPixels) / (displaySize - safeDisplayedPixels * 2)));
}

function toDisplayedPixels(ratio: number): number {
  return MAP_STICKER_DISPLAY_PX * ratio;
}

/** 八邻域距离场外扩剪影，得到没有方向性棱角的圆滑轮廓。 */
function createRoundedOutlineMask(alpha: Uint8ClampedArray, width: number, height: number, radius: number): ImageData {
  const distance = new Float32Array(width * height);
  const threshold = STICKER_OUTLINE_ALPHA_THRESHOLD * 255;
  for (let index = 0; index < distance.length; index += 1) distance[index] = alpha[index]! >= threshold ? 0 : Number.POSITIVE_INFINITY;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = y * width + x;
    if (x > 0) updateDistance(distance, index, index - 1, ORTHOGONAL_DISTANCE);
    if (y > 0) updateDistance(distance, index, index - width, ORTHOGONAL_DISTANCE);
    if (x > 0 && y > 0) updateDistance(distance, index, index - width - 1, DIAGONAL_DISTANCE);
    if (x < width - 1 && y > 0) updateDistance(distance, index, index - width + 1, DIAGONAL_DISTANCE);
  }
  for (let y = height - 1; y >= 0; y -= 1) for (let x = width - 1; x >= 0; x -= 1) {
    const index = y * width + x;
    if (x < width - 1) updateDistance(distance, index, index + 1, ORTHOGONAL_DISTANCE);
    if (y < height - 1) updateDistance(distance, index, index + width, ORTHOGONAL_DISTANCE);
    if (x < width - 1 && y < height - 1) updateDistance(distance, index, index + width + 1, DIAGONAL_DISTANCE);
    if (x > 0 && y < height - 1) updateDistance(distance, index, index + width - 1, DIAGONAL_DISTANCE);
  }
  const mask = new ImageData(width, height);
  for (let index = 0; index < distance.length; index += 1) {
    if (distance[index]! > radius) continue;
    const offset = index * 4;
    mask.data[offset] = 255;
    mask.data[offset + 1] = 255;
    mask.data[offset + 2] = 255;
    mask.data[offset + 3] = 255;
  }
  return mask;
}

async function createOutlineBorder(bitmap: ImageBitmap): Promise<Blob> {
  const padding = toSourceBorderPixels(bitmap, toDisplayedPixels(STICKER_OUTLINE_RATIO));
  const supersample = STICKER_OUTLINE_SUPERSAMPLE;
  const scaledPadding = padding * supersample;
  const scaledWidth = (bitmap.width + padding * 2) * supersample;
  const scaledHeight = (bitmap.height + padding * 2) * supersample;
  const silhouette = document.createElement('canvas');
  silhouette.width = scaledWidth;
  silhouette.height = scaledHeight;
  const silhouetteContext = silhouette.getContext('2d');
  if (!silhouetteContext) throw new Error('无法创建贴纸轮廓画布');
  silhouetteContext.filter = `blur(${Math.max(1, padding * STICKER_OUTLINE_BLUR_RATIO * supersample)}px)`;
  silhouetteContext.drawImage(bitmap, scaledPadding, scaledPadding, bitmap.width * supersample, bitmap.height * supersample);
  silhouetteContext.filter = 'none';
  const pixels = silhouetteContext.getImageData(0, 0, scaledWidth, scaledHeight).data;
  const alpha = new Uint8ClampedArray(scaledWidth * scaledHeight);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = pixels[index * 4 + 3]!;
  silhouetteContext.putImageData(createRoundedOutlineMask(alpha, scaledWidth, scaledHeight, scaledPadding), 0, 0);
  const output = document.createElement('canvas');
  output.width = bitmap.width + padding * 2;
  output.height = bitmap.height + padding * 2;
  const context = output.getContext('2d');
  if (!context) throw new Error('无法创建贴纸白边输出画布');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(silhouette, 0, 0, output.width, output.height);
  context.drawImage(bitmap, padding, padding);
  return canvasToPng(output);
}

async function createStampBorder(bitmap: ImageBitmap): Promise<Blob> {
  const padding = toSourceBorderPixels(bitmap, toDisplayedPixels(STAMP_BORDER_WIDTH_RATIO));
  const output = document.createElement('canvas');
  output.width = bitmap.width + padding * 2;
  output.height = bitmap.height + padding * 2;
  const context = output.getContext('2d');
  if (!context) throw new Error('无法创建邮票边框画布');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, output.width, output.height);
  const outputScale = MAP_STICKER_DISPLAY_PX / Math.max(output.width, output.height);
  const radius = Math.max(1, STAMP_HOLE_RADIUS_PX / outputScale);
  const spacing = Math.max(radius * 2, STAMP_HOLE_SPACING_PX / outputScale);
  context.globalCompositeOperation = 'destination-out';
  for (let x = spacing / 2; x < output.width; x += spacing) {
    context.beginPath(); context.arc(x, 0, radius, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(x, output.height, radius, 0, Math.PI * 2); context.fill();
  }
  for (let y = spacing / 2; y < output.height; y += spacing) {
    context.beginPath(); context.arc(0, y, radius, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(output.width, y, radius, 0, Math.PI * 2); context.fill();
  }
  context.globalCompositeOperation = 'source-over';
  context.drawImage(bitmap, padding, padding);
  return canvasToPng(output);
}

async function hasTransparentPixels(bitmap: ImageBitmap): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法读取贴纸透明通道');
  context.drawImage(bitmap, 0, 0);
  const alpha = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  for (let index = 3; index < alpha.length; index += 4) if (alpha[index]! < 250) return true;
  return false;
}

/**
 * 所有展示位置共用的贴纸边框入口。以 Moment id、原图地址与显示尺寸缓存，避免重复 Canvas 处理。
 * auto：透明 PNG 使用轮廓白边；不透明矩形原图使用邮票边框。
 */
export function getBorderedStickerUrl(stickerId: string, sourceUrl: string, preference: StickerBorderPreference = STICKER_BORDER_STYLE): Promise<string> {
  const cacheKey = `${stickerId}|${sourceUrl}|${preference}|${MAP_STICKER_DISPLAY_PX}`;
  const cached = borderedStickerCache.get(cacheKey);
  if (cached) return cached;
  const task = fetch(sourceUrl)
    .then(async (response) => {
      if (!response.ok) throw new Error(`贴纸读取失败（${response.status}）`);
      const bitmap = await createImageBitmap(await response.blob());
      try {
        const style: StickerBorderStyle = preference === 'auto' ? (await hasTransparentPixels(bitmap) ? 'outline' : 'stamp') : preference;
        return URL.createObjectURL(await (style === 'outline' ? createOutlineBorder(bitmap) : createStampBorder(bitmap)));
      } finally {
        bitmap.close();
      }
    });
  borderedStickerCache.set(cacheKey, task);
  return task;
}

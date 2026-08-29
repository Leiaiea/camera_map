import {
  GROUND_TINT_TEXTURE_HUE_SHIFT_DEG,
  GROUND_TINT_TEXTURE_LAYER_COUNT,
  GROUND_TINT_TEXTURE_OFFSET_METERS,
  GROUND_TINT_TEXTURE_SCALE_MAX,
  GROUND_TINT_TEXTURE_SCALE_MIN,
  GROUND_TINT_TEXTURE_CONTRAST,
  GROUND_TINT_DARK_LIGHTNESS_RATIO,
  GROUND_TINT_EDGE_FEATHER_PX,
  GROUND_TINT_EDGE_MIN_ALPHA,
  GROUND_TINT_GRADIENT_ANGLE_MAX_DEG,
  GROUND_TINT_GRADIENT_ANGLE_MIN_DEG,
  TINT_DEBUG_COLORS,
} from '../../config/mapDemoTuning';

const TEXTURE_URLS = [
  '/tints/watercolor-blob-1.png',
  '/tints/watercolor-sweep-2.png',
  '/tints/watercolor-splatter-3.png',
  '/tints/watercolor-cloud-4.png',
] as const;

export type GroundTintTextureLayer = {
  gradientColors: readonly string[];
  gradientAngleDegrees: number;
  textureUrl: string;
  offsetXmeters: number;
  offsetYmeters: number;
  rotationDegrees: number;
  scaleX: number;
  scaleY: number;
};

const rasterCache = new Map<string, Promise<string>>();

/** 用 Moment id 生成稳定随机数：地图刷新、缩放和拖动都不会改变纹理形态。 */
function seededRandom(seedText: string, salt: number): number {
  let value = 2166136261 ^ salt;
  for (let index = 0; index < seedText.length; index += 1) {
    value = Math.imul(value ^ seedText.charCodeAt(index), 16777619);
  }
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507);
  value ^= value >>> 13;
  value = Math.imul(value, 3266489909);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toHsl(color: string): { hue: number; saturation: number; lightness: number } | null {
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
  if (hslMatch) {
    return { hue: Number(hslMatch[1]), saturation: Number(hslMatch[2]), lightness: Number(hslMatch[3]) };
  }
  const hexMatch = color.match(/^#([\da-f]{6})$/i);
  if (!hexMatch) return null;
  const hex = hexMatch[1];
  const channels = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;
  if (maximum === minimum) return { hue: 0, saturation: 0, lightness: lightness * 100 };
  const delta = maximum - minimum;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (maximum === channels[0]) hue = ((channels[1] - channels[2]) / delta) % 6;
  if (maximum === channels[1]) hue = (channels[2] - channels[0]) / delta + 2;
  if (maximum === channels[2]) hue = (channels[0] - channels[1]) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation: saturation * 100, lightness: lightness * 100 };
}

function shiftHue(color: string, degrees: number): string {
  const hsl = toHsl(color);
  if (!hsl) return color;
  return `hsl(${(hsl.hue + degrees + 360) % 360} ${hsl.saturation}% ${hsl.lightness}%)`;
}

/** 每张贴纸得到固定、但彼此不同的 2–3 层真实水彩纹理。 */
export function createGroundTintTextureLayers(momentId: string, palette: readonly string[]): GroundTintTextureLayer[] {
  const count = clamp(Math.round(GROUND_TINT_TEXTURE_LAYER_COUNT), 2, 3);
  return Array.from({ length: count }, (_, index) => {
    const textureIndex = (Math.floor(seededRandom(momentId, 10) * TEXTURE_URLS.length) + index) % TEXTURE_URLS.length;
    const hueOffset = (seededRandom(momentId, 20 + index) * 2 - 1) * GROUND_TINT_TEXTURE_HUE_SHIFT_DEG;
    const offsetXmeters = (seededRandom(momentId, 30 + index) * 2 - 1) * GROUND_TINT_TEXTURE_OFFSET_METERS;
    const offsetYmeters = (seededRandom(momentId, 40 + index) * 2 - 1) * GROUND_TINT_TEXTURE_OFFSET_METERS;
    const scale = GROUND_TINT_TEXTURE_SCALE_MIN + seededRandom(momentId, 50 + index) * (GROUND_TINT_TEXTURE_SCALE_MAX - GROUND_TINT_TEXTURE_SCALE_MIN);
    const rotation = Math.round(seededRandom(momentId, 60 + index) * 360);
    const flipX = seededRandom(momentId, 70 + index) > 0.5 ? -1 : 1;
    const baseColors = TINT_DEBUG_COLORS ?? palette;
    const gradientColors = [0, 1, 2].map((colorIndex) => {
      const baseColor = baseColors[colorIndex % baseColors.length] ?? 'hsl(42 12% 82%)';
      return shiftHue(baseColor, TINT_DEBUG_COLORS ? 0 : hueOffset);
    });
    const gradientAngleDegrees = GROUND_TINT_GRADIENT_ANGLE_MIN_DEG
      + seededRandom(momentId, 80 + index) * (GROUND_TINT_GRADIENT_ANGLE_MAX_DEG - GROUND_TINT_GRADIENT_ANGLE_MIN_DEG);
    return {
      gradientColors,
      gradientAngleDegrees,
      textureUrl: TEXTURE_URLS[textureIndex],
      offsetXmeters,
      offsetYmeters,
      rotationDegrees: rotation,
      scaleX: flipX * scale,
      scaleY: scale,
    };
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法加载水彩纹理：${url}`));
    image.src = url;
  });
}

/**
 * 只拉伸纹理的 RGB 明暗，alpha 完全保留。
 * 素材主体的亮度约在 0.75–1.0；将它映射到「目标下限–1.0」可让 multiply 后的颗粒可见。
 */
function createContrastTexture(texture: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器不支持水彩纹理对比度处理 Canvas');
  context.drawImage(texture, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const sourceFloor = 0.75;
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (imageData.data[index + 3] === 0) continue;
    const red = imageData.data[index] / 255;
    const green = imageData.data[index + 1] / 255;
    const blue = imageData.data[index + 2] / 255;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const normalized = clamp((luminance - sourceFloor) / (1 - sourceFloor), 0, 1);
    const targetLuminance = GROUND_TINT_TEXTURE_CONTRAST + normalized * (1 - GROUND_TINT_TEXTURE_CONTRAST);
    const multiplier = luminance > 0 ? targetLuminance / luminance : 0;
    imageData.data[index] = Math.round(clamp(red * multiplier, 0, 1) * 255);
    imageData.data[index + 1] = Math.round(clamp(green * multiplier, 0, 1) * 255);
    imageData.data[index + 2] = Math.round(clamp(blue * multiplier, 0, 1) * 255);
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const offset = lightness - chroma / 2;
  return [Math.round((red + offset) * 255), Math.round((green + offset) * 255), Math.round((blue + offset) * 255)];
}

function rgbToHsl(red: number, green: number, blue: number): { hue: number; saturation: number; lightness: number } {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  if (maximum === minimum) return { hue: 0, saturation: 0, lightness };
  const delta = maximum - minimum;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (maximum === red) hue = ((green - blue) / delta) % 6;
  if (maximum === green) hue = (blue - red) / delta + 2;
  if (maximum === blue) hue = (red - green) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

function createGradientCanvas(colors: readonly string[], angleDegrees: number, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器不支持水彩渐变 Canvas');
  const angle = (angleDegrees * Math.PI) / 180;
  const radius = Math.hypot(width, height) / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const gradient = context.createLinearGradient(
    centerX - Math.cos(angle) * radius,
    centerY - Math.sin(angle) * radius,
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius,
  );
  const stops = Math.max(colors.length - 1, 1);
  colors.forEach((color, index) => gradient.addColorStop(index / stops, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * 锁定调色板 H、S，仅让纹理亮度调制 L；再仅对 alpha 蒙版羽化。
 * 因此纹理暗部永远是“更深的同一种颜色”，不会在 RGB multiply 中掉成灰黑。
 */
function createHslModulatedTexture(texture: CanvasImageSource, colors: readonly string[], angleDegrees: number, width: number, height: number): HTMLCanvasElement {
  const contrastTexture = createContrastTexture(texture, width, height);
  const contrastContext = contrastTexture.getContext('2d');
  if (!contrastContext) throw new Error('浏览器不支持水彩纹理亮度读取');
  const contrastData = contrastContext.getImageData(0, 0, width, height).data;
  const gradientContext = createGradientCanvas(colors, angleDegrees, width, height).getContext('2d');
  if (!gradientContext) throw new Error('浏览器不支持水彩渐变读取');
  const gradientData = gradientContext.getImageData(0, 0, width, height).data;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorContext = colorCanvas.getContext('2d');
  if (!colorContext) throw new Error('浏览器不支持 HSL 水彩 Canvas');
  const output = colorContext.createImageData(width, height);
  for (let index = 0; index < output.data.length; index += 4) {
    const luminance = (contrastData[index] * 0.2126 + contrastData[index + 1] * 0.7152 + contrastData[index + 2] * 0.0722) / 255;
    const textureLightness = clamp((luminance - GROUND_TINT_TEXTURE_CONTRAST) / (1 - GROUND_TINT_TEXTURE_CONTRAST), 0, 1);
    const lightnessRatio = GROUND_TINT_DARK_LIGHTNESS_RATIO + textureLightness * (1 - GROUND_TINT_DARK_LIGHTNESS_RATIO);
    const base = rgbToHsl(gradientData[index] / 255, gradientData[index + 1] / 255, gradientData[index + 2] / 255);
    const [red, green, blue] = hslToRgb(base.hue, base.saturation, clamp(base.lightness * lightnessRatio, 0, 1));
    output.data[index] = red;
    output.data[index + 1] = green;
    output.data[index + 2] = blue;
    output.data[index + 3] = 255;
  }
  colorContext.putImageData(output, 0, 0);
  const alphaMask = createFeatheredAlphaMask(texture, width, height);
  colorContext.globalCompositeOperation = 'destination-in';
  colorContext.drawImage(alphaMask, 0, 0);
  return colorCanvas;
}

/** 用纹理 alpha 边界的距离场生成宽过渡带；边缘保持最低 alpha 而不是模糊到 0。 */
function createFeatheredAlphaMask(texture: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const alphaMask = document.createElement('canvas');
  alphaMask.width = width;
  alphaMask.height = height;
  const maskContext = alphaMask.getContext('2d');
  if (!maskContext) throw new Error('浏览器不支持水彩边缘羽化 Canvas');
  maskContext.drawImage(texture, 0, 0, width, height);
  const image = maskContext.getImageData(0, 0, width, height);
  const distances = new Float32Array(width * height);
  const infinity = width + height;
  for (let index = 0; index < distances.length; index += 1) distances[index] = image.data[index * 4 + 3] > 0 ? infinity : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (distances[index] === 0) continue;
      if (x > 0) distances[index] = Math.min(distances[index], distances[index - 1] + 1);
      if (y > 0) distances[index] = Math.min(distances[index], distances[index - width] + 1);
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (distances[index] === 0) continue;
      if (x < width - 1) distances[index] = Math.min(distances[index], distances[index + 1] + 1);
      if (y < height - 1) distances[index] = Math.min(distances[index], distances[index + width] + 1);
    }
  }
  for (let index = 0; index < distances.length; index += 1) {
    const sourceAlpha = image.data[index * 4 + 3];
    if (sourceAlpha === 0) continue;
    const progress = Math.max(0, Math.min(1, distances[index] / GROUND_TINT_EDGE_FEATHER_PX));
    const smoothProgress = progress * progress * (3 - 2 * progress);
    const alpha = GROUND_TINT_EDGE_MIN_ALPHA + (1 - GROUND_TINT_EDGE_MIN_ALPHA) * smoothProgress;
    image.data[index * 4] = 255;
    image.data[index * 4 + 1] = 255;
    image.data[index * 4 + 2] = 255;
    image.data[index * 4 + 3] = Math.round(sourceAlpha * alpha);
  }
  maskContext.putImageData(image, 0, 0);
  return alphaMask;
}

/**
 * HSL 水彩染色管线：先生成三色线性渐变，再由纹理亮度调制每个像素的同色相明度，alpha 单独羽化。
 */
export function rasterizeGroundTintTexture(textureUrl: string, gradientColors: readonly string[], gradientAngleDegrees: number, width: number, height: number, transform?: Pick<GroundTintTextureLayer, 'rotationDegrees' | 'scaleX' | 'scaleY'>): Promise<string> {
  const transformKey = transform ? `${transform.rotationDegrees}|${transform.scaleX}|${transform.scaleY}` : 'default';
  const cacheKey = `${textureUrl}|${gradientColors.join(',')}|angle:${gradientAngleDegrees}|${width}x${height}|${transformKey}|contrast:${GROUND_TINT_TEXTURE_CONTRAST}|dark:${GROUND_TINT_DARK_LIGHTNESS_RATIO}|feather:${GROUND_TINT_EDGE_FEATHER_PX}|edge-alpha:${GROUND_TINT_EDGE_MIN_ALPHA}`;
  const cached = rasterCache.get(cacheKey);
  if (cached) return cached;
  const pending = loadImage(textureUrl).then((texture) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持水彩纹理 Canvas');
    const hslTexture = createHslModulatedTexture(texture, gradientColors, gradientAngleDegrees, width, height);
    const drawTexture = (source: CanvasImageSource) => {
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(((transform?.rotationDegrees ?? 0) * Math.PI) / 180);
      context.scale(transform?.scaleX ?? 1, transform?.scaleY ?? 1);
      context.drawImage(source, -width / 2, -height / 2, width, height);
      context.restore();
    };
    drawTexture(hslTexture);
    return canvas.toDataURL('image/png');
  });
  rasterCache.set(cacheKey, pending);
  return pending;
}

/** 将已染色的 PNG data URL 放回可控 Canvas；用于高德 CanvasLayer 的正片叠底地面渲染。 */
export async function createGroundTintCanvas(dataUrl: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器不支持水彩地面 Canvas');
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

/** 开发环境离屏红色自检：确认三步管线实际产生了带透明边缘的 PNG。 */
export async function verifyGroundTintVisibility(): Promise<boolean> {
  const result = await rasterizeGroundTintTexture(TEXTURE_URLS[0], ['#ff0000', '#ff0000', '#ff0000'], 0, 252, 252);
  return result.startsWith('data:image/png;base64,');
}

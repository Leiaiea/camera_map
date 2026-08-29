import { TINT_COLOR_LIBRARY } from '../../config/mapDemoTuning';

export type GroundTintPalette = readonly [string, string, string];

const STORAGE_KEY = 'personal-map.ground-tint-palettes.v2';
const SAMPLE_SIZE = 50;
const NEUTRAL_GROUND_TINT_PALETTE: GroundTintPalette = ['#A8A8A8', '#A8A8A8', '#A8A8A8'];

let palettes: Record<string, GroundTintPalette> | undefined;

function loadPalettes(): Record<string, GroundTintPalette> {
  if (palettes) return palettes;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    palettes = stored ? JSON.parse(stored) as Record<string, GroundTintPalette> : {};
  } catch {
    palettes = {};
  }
  return palettes;
}

function persistPalettes(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loadPalettes()));
  } catch {
    // 调色板是派生视觉数据；不可写入时可安全退回中性默认色。
  }
}

export function getGroundTintPalette(momentId: string): GroundTintPalette {
  return loadPalettes()[momentId] ?? NEUTRAL_GROUND_TINT_PALETTE;
}

export function hasGroundTintPalette(momentId: string): boolean {
  return Boolean(loadPalettes()[momentId]);
}

export function saveGroundTintPalette(momentId: string, palette: GroundTintPalette): void {
  loadPalettes()[momentId] = palette;
  persistPalettes();
}

export function deleteGroundTintPalette(momentId: string): void {
  delete loadPalettes()[momentId];
  persistPalettes();
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return [((hue * 60) + 360) % 360, saturation, lightness];
}

function colorLibraryIndex(color: string): number {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const [hue] = rgbToHsl(red, green, blue);
  return TINT_COLOR_LIBRARY.reduce((closestIndex, candidate, index) => {
    const toHue = (value: string) => rgbToHsl(Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16))[0];
    const distance = (left: number, right: number) => Math.min(Math.abs(left - right), 360 - Math.abs(left - right));
    return distance(toHue(candidate), hue) < distance(toHue(TINT_COLOR_LIBRARY[closestIndex]!), hue) ? index : closestIndex;
  }, 0);
}
function paletteFromMainIndex(mainIndex: number): GroundTintPalette {
  const length = TINT_COLOR_LIBRARY.length;
  return [TINT_COLOR_LIBRARY[mainIndex]!, TINT_COLOR_LIBRARY[(mainIndex - 1 + length) % length]!, TINT_COLOR_LIBRARY[(mainIndex + 1) % length]!];
}
function paletteForSample(red: number, green: number, blue: number): GroundTintPalette {
  const [, saturation] = rgbToHsl(red, green, blue);
  const warmFallbackIndex = TINT_COLOR_LIBRARY.indexOf('#FBDA74');
  return paletteFromMainIndex(saturation < 0.12 ? warmFallbackIndex : colorLibraryIndex(`#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`));
}

/** 将照片缩至 50×50，排除近黑/近白后挑选彼此有区分度的 2–3 个主色。 */
export async function extractGroundTintPalette(imageUrl: string): Promise<GroundTintPalette | undefined> {
  const response = await fetch(imageUrl);
  if (!response.ok) return undefined;
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return undefined;
  }
  context.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  bitmap.close();
  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();
  const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const red = pixels[offset]!;
    const green = pixels[offset + 1]!;
    const blue = pixels[offset + 2]!;
    const alpha = pixels[offset + 3]!;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (alpha < 128 || max > 242 || min < 18) continue;
    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    buckets.set(key, bucket);
  }
  const candidates = [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .map((bucket) => [bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count] as const);
  const primary = candidates[0];
  if (!primary) return paletteFromMainIndex(TINT_COLOR_LIBRARY.indexOf('#FBDA74'));
  return paletteForSample(...primary);
}

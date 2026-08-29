/**
 * 地图 demo 的集中调参区。
 * 仅修改本文件即可调整固定位置、地图贴纸大小与白边厚度。
 */

// ──────────────────── 地图视觉总开关 ────────────────────
/** 是否显示纸张纹理覆盖层；关闭可减少一层屏幕混合。 */
export const PAPER_TEXTURE_ENABLED = true;
/** 是否启用高德底图 CSS 滤镜；关闭可减少底图的滤镜合成。 */
export const MAP_FILTER_ENABLED = true;
/** 是否生成并显示 Moment 周围的水彩 CanvasLayer；关闭可跳过水彩纹理生成与图层绘制。 */
export const GROUND_TINT_ENABLED = true;
/** 是否显示并持续绘制蝴蝶等世界元素；关闭可停止 CustomLayer 的逐帧动画。 */
export const WORLD_ELEMENTS_ENABLED = true;
// ──────────────────────────────────────────────────────

/** demo 阶段固定位置（GCJ-02）；演示结束后设为 false 恢复真实定位。 */
export const USE_FIXED_LOCATION = true;
export const DEMO_FIXED_LOCATION = { lng: 116.39, lat: 40.00 } as const;

/** 固定定位模式下的示例 case 坐标（GCJ-02）；当前为默认位置北方约 200 米。 */
export const DEMO_EXAMPLE_LOCATION = { lng: 116.39, lat: 40.0017966 } as const;

// ──────────────────── 纸质感覆盖层 ────────────────────
export const PAPER_TEXTURE_OPACITY = 0.35; // 纸张纹理透明度（0–1）
export const PAPER_TEXTURE_BLEND_MODE = 'multiply' as const; // 纸张纹理与地图内容的混合模式
// ──────────────────────────────────────────────────────

// ──────────────────── 地图颜色滤镜 ────────────────────
export const MAP_FILTER_PRESETS = {
  warmPaper: 'sepia(0.15) saturate(1.1) contrast(1.03) brightness(1.04)', // 微暖去灰
  softWarm: 'sepia(0.2) saturate(1.15) brightness(1.05)', // 轻柔暖
  fadedPaper: 'sepia(0.22) brightness(1.1) contrast(0.88) saturate(0.9)', // 褪色旧纸
  richWarm: 'sepia(0.3) saturate(1.35) brightness(1.08)', // 明显暖、提对比
  coolClear: 'saturate(1.1) hue-rotate(8deg) brightness(1.03)', // 清透冷调，对照组
} as const;
export const MAP_FILTER_PRESET: keyof typeof MAP_FILTER_PRESETS = 'warmPaper'; // 当前启用的地图滤镜预设
// ──────────────────────────────────────────────────────

// ──────────────────── 世界元素 ────────────────────
/**
 * 世界元素默认显示尺寸 = MAP_STICKER_DISPLAY_PX × 此比例。
 * 某个注册项设置 sizePx 时会覆盖本比例计算出的尺寸。
 */
export const WORLD_ELEMENT_SIZE_RATIO = 0.5; // 世界元素默认尺寸占 Moment 贴纸显示尺寸的比例
/** 出生点相对随机选中的中心点的最大距离（米）。 */
export const WORLD_ELEMENT_SPAWN_RADIUS_METERS = 120; // 出生点相对选中中心的最大随机距离（米）
/**
 * 素材头部朝上时的朝向补偿角（度）。路径切线以东向为 0 度，
 * 此值默认补偿 90 度，使向东飞行时素材朝右。
 */
export const WORLD_ELEMENT_HEADING_OFFSET_DEG = 90; // 蝴蝶头部朝上素材对齐路径切线的补偿角（度）
/** 世界元素演示随机种子；固定后每次打开页面的出生点和环路形态保持一致。 */
export const WORLD_ELEMENT_RANDOM_SEED = 'world-elements-demo-v1'; // 固定出生点与飞行环路形态的演示随机种子
export const WORLD_ELEMENT_DWELL_MS = 300; // 仅保留起步的轻微停顿
export const WORLD_ELEMENT_WAYPOINT_MIN_SPACING_METERS = 40; // 任意两个蝴蝶航点之间的最小间距（米）
export const WORLD_ELEMENT_WAYPOINT_MAX_ATTEMPTS = 20; // 生成满足形状约束的航点时最多重试次数
export const WORLD_ELEMENT_MOVE_SAMPLE_SPACING_METERS = 2; // moveAlong 航线的目标采样间距（米）
export const WORLD_ELEMENT_Z_INDEX = 110; // 世界元素在地图上的层级，需高于 Moment 贴纸的 100
/** 每种已注册世界元素的数量与漫游参数；半径单位米，速度单位米/秒。 */
export const WORLD_ELEMENT_TUNING = {
  butterfly: {
    count: 1, // 同时生成的蝴蝶数量
    roamRadiusMeters: 400, // 蝴蝶飞行环路半径（米）
    speedMetersPerSec: 200, // 蝴蝶沿飞行环路的速度（米/秒）
  },
} as const;
// ──────────────────────────────────────────────────


// ──────────────────── demo贴纸 ────────────────────
export interface DemoMemoryStickerConfig {
  latitude: number; longitude: number; image: string; photo?: string; createdAt?: string; text?: string; city?: string; district?: string; placeName?: string;
}
export const DEMO_MEMORY_STICKERS = [
  { latitude: 40.0025153, longitude: 116.3900000, image: 'demo-memory-001-sticker.png', photo: 'demo-memory-001-photo.jpg', createdAt: '2026-02-13T05:40:50.000Z', text: '外卖竟然也有无人车' },
  { latitude: 40.0026838, longitude: 116.3929397, image: 'demo-memory-002-sticker.png', photo: 'demo-memory-002-sticker.png', createdAt: '2026-01-10T17:07:01.000Z', text: '抽到了黑色的佛小伴，丑萌丑萌的' },
  { latitude: 40.0004126, longitude: 116.3938321, image: 'demo-memory-003-sticker.png', photo: 'demo-memory-003-photo.jpg', createdAt: '2026-04-17T19:27:32.000Z', text: '老远就听到了小火车的声音！太诱人了，坐在上面都很凉爽' },
  { latitude: 39.9972900, longitude: 116.3945279, image: 'demo-memory-004-sticker.png', photo: 'demo-memory-004-sticker.png', createdAt: '2026-04-06T02:33:27.000Z', text: '巨大的花' },
  { latitude: 39.9976644, longitude: 116.3900000, image: 'demo-memory-005-sticker.png', photo: 'demo-memory-005-photo.jpg', createdAt: '2026-03-28T16:28:29.000Z', text: '这个狗狗毛好长' },
  { latitude: 39.9970410, longitude: 116.3867588, image: 'demo-memory-006-sticker.png', photo: 'demo-memory-006-sticker.jpg', createdAt: '2026-02-24T04:35:15.000Z', text: '下次还来' },
  { latitude: 39.9996714, longitude: 116.3859182, image: 'demo-memory-007-sticker.png', photo: 'demo-memory-007-photo.jpg', createdAt: '2026-02-09T19:19:27.000Z', text: '在公园摸鱼，阳光好，心情也好' },
  { latitude: 40.0030026, longitude: 116.3853288, image: 'demo-memory-008-sticker.png', photo: 'demo-memory-008-sticker.png', createdAt: '2026-07-31T19:11:04.000Z', text: '可爱，不知道要织多久' },
  { latitude: 40.0048116, longitude: 116.3922861, image: 'demo-memory-009-sticker.png', photo: 'demo-memory-009-sticker.png', createdAt: '2026-02-03T18:19:43.000Z', text: '他俩快睡着了，今天也太悠哉游哉了~~' },
  { latitude: 39.9950859, longitude: 116.3925918, image: 'demo-memory-010-sticker.png', photo: 'demo-memory-010-photo.jpg', createdAt: '2026-08-18T07:47:20.000Z', text: '凹凸镜，好干净' },
  // { latitude: 39.9992192, longitude: 116.3852980, image: 'demo-memory-011-sticker.png', photo: 'demo-memory-011-photo.jpg', createdAt: '2026-03-26T21:51:13.000Z', text: '踏雪！' },
  // { latitude: 39.9973266, longitude: 116.3910202, image: 'demo-memory-012-sticker.png', photo: 'demo-memory-012-photo.jpg', createdAt: '2026-08-06T23:10:59.000Z', text: '可爱的盘子' },
  // { latitude: 39.9969884, longitude: 116.3914988, image: 'demo-memory-013-sticker.png', photo: 'demo-memory-013-photo.jpg', createdAt: '2026-07-31T15:13:21.000Z', text: '自己调酒，美滋滋' },
  // { latitude: 39.9991952, longitude: 116.3894921, image: 'demo-memory-014-sticker.png', photo: 'demo-memory-014-photo.jpg', createdAt: '2026-04-19T00:55:31.000Z', text: '。。。' },
  // { latitude: 40.0030943, longitude: 116.3850650, image: 'demo-memory-015-sticker.png', photo: 'demo-memory-015-photo.jpg', createdAt: '2026-03-04T00:07:57.000Z', text: '学校的冰激淋，一般' },
  // { latitude: 40.0019814, longitude: 116.3884025, image: 'demo-memory-016-sticker.png', photo: 'demo-memory-016-photo.jpg', createdAt: '2026-03-02T09:10:26.000Z', text: '蝴蝶一样的小草！' },
] as const satisfies readonly DemoMemoryStickerConfig[];

/** 地图上每张 Moment 贴纸的显示区边长。 */
export const MAP_STICKER_DISPLAY_PX = 160;

/** 是否显示 3D 建筑体；默认关闭，保留灰白底图的轻盈感。 */
export const SHOW_BUILDINGS = false;

/** 贴纸接触阴影：真实 Moment、示例 case 与 demo 贴纸共用这一组参数。 */
/** 阴影颜色；建议使用低饱和深灰绿，避免抢走贴纸主体。 */
export const MAP_STICKER_SHADOW_COLOR = '#3D4540';
/** 阴影整体透明度；数值越大，阴影越明显。 */
export const MAP_STICKER_SHADOW_OPACITY = 0.18;
/** 阴影边缘模糊半径（像素）；数值越大，边缘越柔和、扩散范围越大。 */
export const MAP_STICKER_SHADOW_BLUR_PX = 4.5;
/** 阴影向右的偏移距离（像素）；负数会向左移动。 */
export const MAP_STICKER_SHADOW_OFFSET_X_PX = 10;
/** 阴影向下的偏移距离（像素）；负数会向上移动。 */
export const MAP_STICKER_SHADOW_OFFSET_Y_PX = 0;
/** 阴影水平方向的压缩比例；小于 1 会收窄，大于 1 会拉宽。 */
export const MAP_STICKER_SHADOW_SCALE_X = 0.9;
/** 阴影垂直方向的压缩比例；越小越贴地、越扁。 */
export const MAP_STICKER_SHADOW_SCALE_Y = 0.24;
/** 阴影水平方向的倾斜角度；用于模拟落地时的透视方向。 */
export const MAP_STICKER_SHADOW_SKEW_X_DEG = -8;
/** 阴影整体旋转角度；微调可让不同形状的贴纸更自然。 */
export const MAP_STICKER_SHADOW_ROTATION_DEG = -2;
/** 阴影变形所围绕的位置；通常保持主体下缘附近。 */
export const MAP_STICKER_SHADOW_ORIGIN = '50% 88%';
// ──────────────────────────────────────────────────


// ──────────────────── 水彩 ────────────────────
/**
 * 真水彩纹理染色的地理直径（米）。染色是地面涂料，会随地图缩放而同步放大或缩小。
 * 约 200 米适合当前贴纸密度；该数值不受屏幕像素尺寸影响。
 */
export const GROUND_TINT_DIAMETER_METERS = 220;
/** 生成每张水彩 PNG 时的离屏分辨率；只影响纹理清晰度，不影响地图上的地理尺寸。 */
export const GROUND_TINT_TEXTURE_RASTER_PX = 512;
/** 每张贴纸叠加的水彩 PNG 层数；建议保持 2–3 层。 */
export const GROUND_TINT_TEXTURE_LAYER_COUNT = 3;
/** 每层相对中心最多错开的地理距离（米）；越大，色块越发散。 */
export const GROUND_TINT_TEXTURE_OFFSET_METERS = 14;
/** 每层水彩纹理的最小缩放比例。 */
export const GROUND_TINT_TEXTURE_SCALE_MIN = 0.82;
/** 每层水彩纹理的最大缩放比例。 */
export const GROUND_TINT_TEXTURE_SCALE_MAX = 1.18;
/** 水彩整体透明度；normal 混合下 0.35 可保持透亮，让路网从染色下透出。 */
export const GROUND_TINT_TEXTURE_OPACITY = 0.5;
/**
 * 水彩纹理用于 multiply 前的目标最低亮度（0–1）。数值越小，颗粒和洇边的深浅反差越明显。
 * 只影响纹理明暗，不改变 PNG 的透明 alpha 形状；默认 0.1。
 */
export const GROUND_TINT_TEXTURE_CONTRAST = 0.35;
/** 水彩固定色库；照片主色只用于匹配其中最接近的一组。 */
export const TINT_COLOR_LIBRARY = ['#FF7575', '#FB9674', '#FFC67B', '#FBDA74', '#FFF67B', '#DAFB74', '#AEFF7B', '#74FBA1', '#7BFFFD', '#74DAFB', '#7BB9FF', '#7474FB', '#9E7BFF', '#F47BFF', '#FB74CE'] as const;
/** 纹理最暗处保留的基础明度比例；0.55 表示深部仍是同色相的深色，不会变成灰黑。 */
export const GROUND_TINT_DARK_LIGHTNESS_RATIO = 0.55;
/** 水彩边缘向内平滑过渡的宽度（像素）。 */
export const GROUND_TINT_EDGE_FEATHER_PX = 160;
/** 水彩边缘保留的最低 alpha，避免羽化终点完全消失。 */
export const GROUND_TINT_EDGE_MIN_ALPHA = 0.3;
/** 相邻纹理层允许的最大色相偏移（度）；正负范围会由稳定种子随机取值。 */
export const GROUND_TINT_TEXTURE_HUE_SHIFT_DEG = 20;
/** 每层线性渐变方向的最小角度（度）；0 表示从左向右。 */
export const GROUND_TINT_GRADIENT_ANGLE_MIN_DEG = 0;
/** 每层线性渐变方向的最大角度（度）；360 表示任意方向随机。 */
export const GROUND_TINT_GRADIENT_ANGLE_MAX_DEG = 360;
/**
 * 水彩染色三色调试开关：非 null 时，所有贴纸都使用此粉→黄→蓝渐变，仍保留 2–3 层叠加。
 * 验收后改成 null 即恢复每张照片自身的调色板。
 */
export const TINT_DEBUG_COLORS: readonly [string, string, string] | null = null;
/** 照片主色的饱和度保留比例；较低会更像淡水彩。 */
export const GROUND_TINT_SATURATION_RATIO = 0.45;
/** 照片主色转换后的目标明度。 */
export const GROUND_TINT_LIGHTNESS = 0.5;
/** 源图过暗时先提到的明度下限，避免水彩色发灰发闷。 */
export const GROUND_TINT_DARK_SOURCE_LIGHTNESS_FLOOR = 0.5;
// ──────────────────────────────────────────────────



// ──────────────────── 白边 ────────────────────
/**
 * 白边占最终地图显示尺寸的比例；例如 0.12 在 112px 贴纸上约为 13px。
 * 边框生成时会反算到源图像素，保证不同分辨率的贴纸在屏幕上粗细一致。
 */
export const STICKER_OUTLINE_RATIO = 0.06;
/** 边框策略：auto 会按图片 alpha 自动选择轮廓白边或邮票边框。 */
export const STICKER_BORDER_STYLE = 'auto' as const;
/** 邮票白色外框占最终地图显示尺寸的比例。 */
export const STAMP_BORDER_WIDTH_RATIO = 0.08;
/** 邮票边缘半圆打孔的显示半径（px）；默认比旧版本小约 40%。 */
export const STAMP_HOLE_RADIUS_PX = 4;
/** 邮票边缘相邻打孔中心的显示间距（px）；默认比旧版本小约 40%。 */
export const STAMP_HOLE_SPACING_PX = 11.2;

/** 白边轮廓在生成前的 alpha 软化半径，按白边宽度比例计算。 */
export const STICKER_OUTLINE_BLUR_RATIO = 0.2;

/** 软化后的 alpha 达到此比例即视为主体轮廓；0.5 是自然的中间阈值。 */
export const STICKER_OUTLINE_ALPHA_THRESHOLD = 0.5;

/** 轮廓处理倍率。2 倍处理再缩回可消除锯齿并得到圆滑折角。 */
export const STICKER_OUTLINE_SUPERSAMPLE = 2;

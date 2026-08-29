import type { GeoCoordinate } from './types';

// 坐标模糊没有统一行业标准，常见做法有三种：
// 1. 截断小数位（本项目原实现）。实现最简单，但同一格内所有点会重合成一个像素，
//    且格子边界固定，落在边界两侧的两次记录会被推开得比实际更远。
// 2. 网格吸附（snap-to-grid）。把坐标吸到最近的网格中心，误差上界明确，
//    但同样会让同格记录完全重合。
// 3. 半径内随机偏移（geo-fuzzing）。在给定半径内随机移动，保留"大致在这一带"
//    的语义，且同一地点的多次记录不会重合。缺点是同一个地点每次记录位置不同。
//
// 本项目选 3 的确定性变体：偏移量由 seed 决定，所以同一个 Moment 的模糊位置永远一致，
// 但不同 Moment 即使在同一栋楼也会散开。这同时解决了"同地点贴纸互相遮挡"的问题。
// 接入高德后这个策略可以原样保留，只是 blurRadiusMeters 可能按产品需要调整。

export const DEFAULT_BLUR_RADIUS_METERS = 120;

const METERS_PER_DEGREE_LATITUDE = 111_320;

/** 由字符串生成 [0,1) 稳定伪随机数，保证同一 seed 每次结果相同。 */
function seededRandom(seed: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // 转为无符号后归一化
  return ((hash >>> 0) % 100_000) / 100_000;
}

export interface BlurResult extends GeoCoordinate {
  radiusMeters: number;
}

/**
 * 在 radiusMeters 半径内做确定性偏移。
 * seed 相同 → 结果相同；seed 不同 → 即使原始坐标一致也会散开。
 */
export function blurCoordinate(
  coordinate: GeoCoordinate,
  seed: string,
  radiusMeters: number = DEFAULT_BLUR_RADIUS_METERS,
): BlurResult {
  // 面积均匀分布用 sqrt，避免点过度集中在圆心
  const distance = Math.sqrt(seededRandom(seed, 1)) * radiusMeters;
  const angle = seededRandom(seed, 2) * Math.PI * 2;
  const northMeters = Math.sin(angle) * distance;
  const eastMeters = Math.cos(angle) * distance;
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * Math.cos((coordinate.latitude * Math.PI) / 180);
  return {
    latitude: coordinate.latitude + northMeters / METERS_PER_DEGREE_LATITUDE,
    longitude: coordinate.longitude + eastMeters / Math.max(1, metersPerDegreeLongitude),
    radiusMeters,
  };
}

/** 详情页展示用：模糊坐标保留 4 位小数，避免暴露过精确的数字。 */
export function formatBlurredCoordinate(value: number): string {
  return value.toFixed(4);
}

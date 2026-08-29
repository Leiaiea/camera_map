import type { GeoCoordinate } from '../location/types';

// 标准 Web Mercator 投影，和高德/Google/Mapbox 使用的瓦片坐标系一致。
// 现阶段用它给假地图定位贴纸；接入高德后同一套 camera 概念可以直接对应
// AMap 的 center/zoom，贴纸改为 AMap.Marker 或自定义图层即可，上层无需重写。

const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;
export const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;

export const MIN_ZOOM = 12;
export const MAX_ZOOM = 18;
/** 装饰性假地图素材按这一级别绘制，其他缩放级别按比例缩放。 */
export const BASE_ZOOM = 15;

export interface ScreenPoint {
  x: number;
  y: number;
}

export const clampLatitude = (value: number) => Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, value));
export const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

/** 某缩放级别下整个世界的像素宽度 */
export const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

/** 经纬度 → 该缩放级别下的世界像素坐标 */
export function lngLatToWorld(coordinate: GeoCoordinate, zoom: number): ScreenPoint {
  const size = worldSize(zoom);
  const latitude = clampLatitude(coordinate.latitude);
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((coordinate.longitude + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * size,
  };
}

/** 世界像素坐标 → 经纬度 */
export function worldToLngLat(point: ScreenPoint, zoom: number): GeoCoordinate {
  const size = worldSize(zoom);
  const longitude = (point.x / size) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (point.y / size);
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

/** 该纬度和缩放级别下，一个屏幕像素代表多少米。用于比例尺和模糊半径的可视化。 */
export function metersPerPixel(latitude: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_METERS * Math.cos((clampLatitude(latitude) * Math.PI) / 180)) / worldSize(zoom);
}

/** 两点间距离（米），Haversine。 */
export function distanceMeters(a: GeoCoordinate, b: GeoCoordinate): number {
  const radius = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRad(b.latitude - a.latitude);
  const deltaLongitude = toRad(b.longitude - a.longitude);
  const h = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 按米偏移一个经纬度坐标 */
export function offsetByMeters(coordinate: GeoCoordinate, eastMeters: number, northMeters: number): GeoCoordinate {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = metersPerDegreeLatitude * Math.cos((coordinate.latitude * Math.PI) / 180);
  return {
    latitude: clampLatitude(coordinate.latitude + northMeters / metersPerDegreeLatitude),
    longitude: coordinate.longitude + eastMeters / Math.max(1, metersPerDegreeLongitude),
  };
}

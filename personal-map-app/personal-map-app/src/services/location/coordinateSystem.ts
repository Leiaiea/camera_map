import type { CoordinateSystem, GeoCoordinate, TaggedCoordinate } from './types';

// WGS-84 ↔ GCJ-02 转换。国内公开算法，接入高德前就需要，否则设备定位会整体偏移。
const PI = Math.PI;
const SEMI_MAJOR_AXIS = 6378245.0;
const ECCENTRICITY_SQUARED = 0.00669342162296594323;

function outOfChina(latitude: number, longitude: number): boolean {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(x: number, y: number): number {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  value += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  value += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  value += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return value;
}

function transformLongitude(x: number, y: number): number {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  value += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  value += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  value += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
  return value;
}

function offset(latitude: number, longitude: number): GeoCoordinate {
  let deltaLatitude = transformLatitude(longitude - 105, latitude - 35);
  let deltaLongitude = transformLongitude(longitude - 105, latitude - 35);
  const radLatitude = (latitude / 180) * PI;
  let magic = Math.sin(radLatitude);
  magic = 1 - ECCENTRICITY_SQUARED * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  deltaLatitude = (deltaLatitude * 180) / (((SEMI_MAJOR_AXIS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic)) * PI);
  deltaLongitude = (deltaLongitude * 180) / ((SEMI_MAJOR_AXIS / sqrtMagic) * Math.cos(radLatitude) * PI);
  return { latitude: deltaLatitude, longitude: deltaLongitude };
}

export function wgs84ToGcj02({ latitude, longitude }: GeoCoordinate): GeoCoordinate {
  if (outOfChina(latitude, longitude)) return { latitude, longitude };
  const delta = offset(latitude, longitude);
  return { latitude: latitude + delta.latitude, longitude: longitude + delta.longitude };
}

export function gcj02ToWgs84({ latitude, longitude }: GeoCoordinate): GeoCoordinate {
  if (outOfChina(latitude, longitude)) return { latitude, longitude };
  const delta = offset(latitude, longitude);
  return { latitude: latitude - delta.latitude, longitude: longitude - delta.longitude };
}

/** 把任意坐标转到目标坐标系。上层只调这一个函数，不关心具体方向。 */
export function toSystem(coordinate: TaggedCoordinate, target: CoordinateSystem): TaggedCoordinate {
  if (coordinate.system === target) return coordinate;
  const converted = target === 'gcj02' ? wgs84ToGcj02(coordinate) : gcj02ToWgs84(coordinate);
  return { ...converted, system: target };
}

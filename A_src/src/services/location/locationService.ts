import { geoConfig } from './geoConfig';
import { toSystem } from './coordinateSystem';
import { blurCoordinate, DEFAULT_BLUR_RADIUS_METERS } from './blur';
import { INTERNAL_SYSTEM, type LocatedPlace, type LocationProvider, type TaggedCoordinate } from './types';

export type { LocatedPlace } from './types';
export { DEFAULT_BLUR_RADIUS_METERS } from './blur';
export { formatBlurredCoordinate } from './blur';

interface LocateOptions {
  /** 模糊偏移的种子。同一个 Moment 必须传同一个 seed，位置才稳定。 */
  seed: string;
  /** 设备定位失败时使用哪个模拟 provider */
  fallback: LocationProvider;
  blurRadiusMeters?: number;
}

let currentCoordinate: { coordinate: TaggedCoordinate; source: 'device' | 'mock' } | undefined;

async function resolveCoordinate(fallback: LocationProvider): Promise<{ coordinate: TaggedCoordinate; source: 'device' | 'mock' }> {
  try {
    const raw = await geoConfig.locationProvider.locate();
    return { coordinate: toSystem(raw, INTERNAL_SYSTEM), source: 'device' };
  } catch {
    const raw = await fallback.locate();
    return { coordinate: toSystem(raw, INTERNAL_SYSTEM), source: 'mock' };
  }
}

async function resolvePlace(coordinate: TaggedCoordinate) {
  try {
    const place = await geoConfig.geocodingProvider.reverseGeocode(coordinate);
    return { place, placeSource: geoConfig.geocodingProvider.id };
  } catch {
    // 地点名失败不应阻断记录保存，坐标本身已经拿到了。
    return { place: { city: '未知城市', placeName: '地图上的一个点' }, placeSource: 'unavailable' };
  }
}

/** 完成一次定位：坐标 → 内部坐标系 → 逆地理编码 → 模糊。 */
export async function locatePlace({ seed, fallback, blurRadiusMeters = DEFAULT_BLUR_RADIUS_METERS }: LocateOptions): Promise<LocatedPlace> {
  const { coordinate, source } = await resolveCoordinate(fallback);
  const { place, placeSource } = await resolvePlace(coordinate);
  const blurred = blurCoordinate(coordinate, seed, blurRadiusMeters);
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    blurredLatitude: blurred.latitude,
    blurredLongitude: blurred.longitude,
    blurRadiusMeters: blurred.radiusMeters,
    system: coordinate.system,
    city: place.city,
    district: place.district,
    placeName: place.placeName,
    source,
    placeSource,
    capturedAt: new Date().toISOString(),
  };
}

/** 记录页点击「确认」时调用：为即将创建的 Moment 定位。 */
export function locateForMoment(seed: string): Promise<LocatedPlace> {
  if (!currentCoordinate) return locatePlace({ seed, fallback: geoConfig.fallbackLocationProvider });
  return locatePlaceFromCoordinate(currentCoordinate.coordinate, currentCoordinate.source, seed);
}

/** App 启动时调用：确定「我在哪」，用于地图初始视口。 */
export async function locateCurrentPosition(): Promise<LocatedPlace> {
  // 地图初始化只取一次坐标；地址逆解析严格留到 Moment 保存时进行。
  currentCoordinate = await resolveCoordinate(geoConfig.fallbackCurrentLocationProvider);
  const blurred = blurCoordinate(currentCoordinate.coordinate, 'current-position', DEFAULT_BLUR_RADIUS_METERS);
  return {
    latitude: currentCoordinate.coordinate.latitude,
    longitude: currentCoordinate.coordinate.longitude,
    blurredLatitude: blurred.latitude,
    blurredLongitude: blurred.longitude,
    blurRadiusMeters: blurred.radiusMeters,
    system: currentCoordinate.coordinate.system,
    city: currentCoordinate.coordinate.city || '当前城市',
    placeName: '当前位置',
    source: currentCoordinate.source,
    placeSource: 'current-location',
    capturedAt: new Date().toISOString(),
  };
}

async function locatePlaceFromCoordinate(coordinate: TaggedCoordinate, source: 'device' | 'mock', seed: string): Promise<LocatedPlace> {
  const { place, placeSource } = await resolvePlace(coordinate);
  const blurred = blurCoordinate(coordinate, seed, DEFAULT_BLUR_RADIUS_METERS);
  return {
    latitude: coordinate.latitude, longitude: coordinate.longitude,
    blurredLatitude: blurred.latitude, blurredLongitude: blurred.longitude,
    blurRadiusMeters: blurred.radiusMeters, system: coordinate.system,
    city: place.city, district: place.district, placeName: place.placeName,
    source, placeSource, capturedAt: new Date().toISOString(),
  };
}

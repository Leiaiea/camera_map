// 坐标系必须显式标注：浏览器 Geolocation 返回 WGS-84，高德地图使用 GCJ-02。
// 两者在国内相差约 100–700 米，混用会让所有 Moment 整体偏移。
export type CoordinateSystem = 'wgs84' | 'gcj02';

// 产品内部统一使用的坐标系。接入高德后保持 gcj02，无需改动上层。
export const INTERNAL_SYSTEM: CoordinateSystem = 'gcj02';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface TaggedCoordinate extends GeoCoordinate {
  system: CoordinateSystem;
  /** 定位服务随坐标返回的城市名；不触发额外逆地理编码。 */
  city?: string;
}

export interface PlaceInfo {
  city: string;
  district?: string;
  placeName: string;
}

/** 一次定位的完整结果，已转换到 INTERNAL_SYSTEM 并完成模糊。 */
export interface LocatedPlace {
  latitude: number;
  longitude: number;
  blurredLatitude: number;
  blurredLongitude: number;
  blurRadiusMeters: number;
  system: CoordinateSystem;
  city: string;
  district?: string;
  placeName: string;
  /** 坐标来自设备定位、模拟兜底或 demo 固定位置。 */
  source: 'device' | 'mock' | 'fixed';
  /** 地点名来自哪个逆地理编码实现 */
  placeSource: string;
  capturedAt: string;
}

/** 定位实现：设备 Geolocation、模拟数据，未来高德 AMap.Geolocation。 */
export interface LocationProvider {
  readonly id: string;
  locate(): Promise<TaggedCoordinate>;
}

/** 逆地理编码实现：坐标 → 城市与地点名。 */
export interface GeocodingProvider {
  readonly id: string;
  reverseGeocode(coordinate: TaggedCoordinate): Promise<PlaceInfo>;
}

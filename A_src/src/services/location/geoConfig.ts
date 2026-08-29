import type { GeocodingProvider, LocationProvider } from './types';
import { mockCurrentLocationProvider, mockLocationProvider } from './providers/mockLocationProvider';
import { amapGeocodingProvider, amapLocationProvider } from './providers/amapProviders';

/**
 * 定位与地点名的唯一装配点。接入高德时只改这个文件：
 *   locationProvider: amapLocationProvider
 *   geocodingProvider: amapGeocodingProvider
 * 上层（MomentProvider、MapPage、useRecordFlow）不需要任何改动。
 */
export const geoConfig = {
  /** 优先使用真实设备定位 */
  locationProvider: amapLocationProvider as LocationProvider,
  /** 设备定位失败时的兜底，用于新建 Moment：每次返回不同的模拟点 */
  fallbackLocationProvider: mockLocationProvider as LocationProvider,
  /** 设备定位失败时的兜底，用于 App 启动：固定返回"我的当前位置" */
  fallbackCurrentLocationProvider: mockCurrentLocationProvider as LocationProvider,
  /** 坐标 → 城市与地点名 */
  geocodingProvider: amapGeocodingProvider as GeocodingProvider,
};

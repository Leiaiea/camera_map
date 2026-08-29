import type { LocationProvider, TaggedCoordinate } from '../types';

// 浏览器 Geolocation 返回 WGS-84。标注清楚，由上层统一转换。
export const deviceLocationProvider: LocationProvider = {
  id: 'device-geolocation',
  locate(): Promise<TaggedCoordinate> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('当前设备不支持定位'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          system: 'wgs84',
        }),
        (error) => reject(new Error(error.message || '定位失败')),
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 },
      );
    });
  },
};

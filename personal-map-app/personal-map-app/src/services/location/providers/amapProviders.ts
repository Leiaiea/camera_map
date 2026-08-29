import AMapLoader from '@amap/amap-jsapi-loader';
import type { GeocodingProvider, LocationProvider, PlaceInfo, TaggedCoordinate } from '../types';

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

export const AMAP_KEY: string | undefined = import.meta.env.VITE_AMAP_KEY;
const AMAP_SECURITY_CODE: string | undefined = import.meta.env.VITE_AMAP_SECURITY_CODE;

let amapPromise: Promise<any> | undefined;

/**
 * demo 阶段明文方式；正式环境需改为服务端代理（参考高德文档
 * 《JS API 安全密钥使用》Nginx 方案）。
 */
export function loadAMap(): Promise<any> {
  if (amapPromise) return amapPromise;
  if (!AMAP_KEY || !AMAP_SECURITY_CODE) return Promise.reject(new Error('缺少 VITE_AMAP_KEY 或 VITE_AMAP_SECURITY_CODE'));
  // 必须先设置安全密钥配置，再调用 loader，否则高德不会读取该配置。
  window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  amapPromise = AMapLoader.load({ key: AMAP_KEY, version: '2.0', plugins: ['AMap.Geolocation', 'AMap.Geocoder'] });
  return amapPromise;
}

export const amapLocationProvider: LocationProvider = {
  id: 'amap-geolocation',
  async locate(): Promise<TaggedCoordinate> {
    const AMap = await loadAMap();
    return new Promise((resolve, reject) => {
      const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 8000 });
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status !== 'complete' || !result?.position) { reject(new Error(result?.message || '未取得设备定位')); return; }
        const rawCity = result.addressComponent?.city;
        const city = Array.isArray(rawCity) ? result.addressComponent?.province : (rawCity || result.addressComponent?.province);
        resolve({ latitude: result.position.getLat(), longitude: result.position.getLng(), system: 'gcj02', city });
      });
    });
  },
};

export const amapGeocodingProvider: GeocodingProvider = {
  id: 'amap-geocoder',
  async reverseGeocode(coordinate: TaggedCoordinate): Promise<PlaceInfo> {
    const AMap = await loadAMap();
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder();
      geocoder.getAddress([coordinate.longitude, coordinate.latitude], (status: string, result: any) => {
        const address = result?.regeocode;
        if (status !== 'complete' || !address) { reject(new Error(result?.info || '逆地理编码失败')); return; }
        const component = address.addressComponent ?? {};
        const city = Array.isArray(component.city) ? component.province : (component.city || component.province || '未知城市');
        resolve({ city, district: component.district || undefined, placeName: address.formattedAddress || '地图上的一个点' });
      });
    });
  },
};

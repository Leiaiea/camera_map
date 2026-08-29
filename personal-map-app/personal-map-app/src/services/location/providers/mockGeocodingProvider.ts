import type { GeocodingProvider, PlaceInfo, TaggedCoordinate } from '../types';
import { mockSpots } from './mockLocationProvider';

const METERS_PER_DEGREE = 111_320;

function distanceMeters(a: TaggedCoordinate, b: { latitude: number; longitude: number }): number {
  const latitudeMeters = (a.latitude - b.latitude) * METERS_PER_DEGREE;
  const longitudeMeters = (a.longitude - b.longitude) * METERS_PER_DEGREE * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(latitudeMeters, longitudeMeters);
}

/**
 * 模拟逆地理编码：取距离最近的模拟点的地点名。
 * 超出所有模拟点 2 公里时退回粗略描述，避免谎报一个明显不对的地名。
 * 接入高德后由 amapGeocodingProvider 替换，接口不变。
 */
export const mockGeocodingProvider: GeocodingProvider = {
  id: 'mock-nearest-spot',
  async reverseGeocode(coordinate: TaggedCoordinate): Promise<PlaceInfo> {
    let nearest = mockSpots[0]!;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const spot of mockSpots) {
      const distance = distanceMeters(coordinate, spot);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = spot;
      }
    }
    if (nearestDistance > 2000) {
      return { city: '未知城市', placeName: '地图上的一个点' };
    }
    return { city: nearest.city, district: nearest.district, placeName: nearest.placeName };
  },
};

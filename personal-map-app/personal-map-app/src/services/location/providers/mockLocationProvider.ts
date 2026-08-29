import type { LocationProvider, TaggedCoordinate } from '../types';

// 模拟定位数据。所有点使用 GCJ-02，和产品内部坐标系一致，避免二次转换带来偏移。
// 这些点是上海静安—黄浦一带真实存在的位置，彼此相距 300–900 米，
// 保证示例记录与后续新建记录在地图上不会重合。
export interface MockSpot {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  placeName: string;
}

// 这些点集中在上海徐汇—静安交界的梧桐区，彼此相距 250–900 米。
// 刻意选成"走路可达"的密度：新建记录会落在当前位置附近，
// 到达动画结束后贴纸就在视口内，不会飞到屏幕外。
export const mockSpots: MockSpot[] = [
  { id: 'anfu-road', latitude: 31.2137, longitude: 121.4429, city: '上海市', district: '徐汇区', placeName: '安福路 · 街边咖啡店' },
  { id: 'jing-an-temple', latitude: 31.2249, longitude: 121.4478, city: '上海市', district: '静安区', placeName: '静安寺 · 愚园路口' },
  { id: 'wuyuan-road', latitude: 31.2119, longitude: 121.4402, city: '上海市', district: '徐汇区', placeName: '五原路 · 梧桐树下' },
  { id: 'changshu-road', latitude: 31.2158, longitude: 121.4459, city: '上海市', district: '徐汇区', placeName: '常熟路 · 地铁站出口' },
  { id: 'wulumuqi-road', latitude: 31.2145, longitude: 121.4400, city: '上海市', district: '徐汇区', placeName: '乌鲁木齐中路 · 菜场门口' },
  { id: 'hunan-road', latitude: 31.2093, longitude: 121.4415, city: '上海市', district: '徐汇区', placeName: '湖南路 · 街角小花园' },
  { id: 'wukang-road', latitude: 31.2108, longitude: 121.4361, city: '上海市', district: '徐汇区', placeName: '武康路 · 老洋房街角' },
  { id: 'fuxing-west-road', latitude: 31.2079, longitude: 121.4390, city: '上海市', district: '徐汇区', placeName: '复兴西路 · 老公寓门口' },
  { id: 'yueyang-road', latitude: 31.2065, longitude: 121.4463, city: '上海市', district: '徐汇区', placeName: '岳阳路 · 梧桐夹道' },
];

const spotById = (id: string) => mockSpots.find((spot) => spot.id === id)!;

/** 示例 Moment 的固定位置。 */
export const exampleSpot = spotById('jing-an-temple');

/**
 * 打开 App 时的「我的当前位置」。
 * 选安福路：距示例记录（静安寺）约 1.3 公里，在默认缩放下两者同屏可见且不重合。
 */
export const currentUserSpot = spotById('anfu-road');

// 新建记录依次取这些点，逐条散布在当前位置周围，不与示例和当前位置重合。
const newMomentSpots = mockSpots.filter((spot) => spot.id !== exampleSpot.id && spot.id !== currentUserSpot.id);
let cursor = 0;

export function nextMockSpot(): MockSpot {
  const spot = newMomentSpots[cursor % newMomentSpots.length]!;
  cursor += 1;
  return spot;
}

export function resetMockSpotCursor(): void {
  cursor = 0;
}

function toTagged(spot: MockSpot): TaggedCoordinate {
  return { latitude: spot.latitude, longitude: spot.longitude, system: 'gcj02', city: spot.city };
}

/** 每次调用返回下一个模拟点，用于新建 Moment。 */
export const mockLocationProvider: LocationProvider = {
  id: 'mock-rotating',
  async locate() {
    return toTagged(nextMockSpot());
  },
};

/** 固定返回"当前位置"，用于 App 启动时的初始定位。 */
export const mockCurrentLocationProvider: LocationProvider = {
  id: 'mock-current',
  async locate() {
    return toTagged(currentUserSpot);
  },
};

import type { GeoCoordinate } from '../location/types';
import { clampZoom, lngLatToWorld, worldToLngLat, type ScreenPoint } from './projection';

// 地图相机：用「中心经纬度 + 缩放级别」描述视口，而不是像素偏移。
// 这是地图库的通用模型，接入高德后可直接映射到 AMap 的 setCenter/setZoom，
// 因此所有平移缩放逻辑都写在这里，MapCanvas 只负责手势和渲染。

export interface MapCamera {
  center: GeoCoordinate;
  zoom: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const createCamera = (center: GeoCoordinate, zoom: number): MapCamera => ({
  center: { ...center },
  zoom: clampZoom(zoom),
});

/** 经纬度 → 屏幕坐标（相对视口左上角） */
export function project(coordinate: GeoCoordinate, camera: MapCamera, size: ViewportSize): ScreenPoint {
  const target = lngLatToWorld(coordinate, camera.zoom);
  const center = lngLatToWorld(camera.center, camera.zoom);
  return {
    x: target.x - center.x + size.width / 2,
    y: target.y - center.y + size.height / 2,
  };
}

/** 屏幕坐标 → 经纬度 */
export function unproject(point: ScreenPoint, camera: MapCamera, size: ViewportSize): GeoCoordinate {
  const center = lngLatToWorld(camera.center, camera.zoom);
  return worldToLngLat(
    { x: center.x + point.x - size.width / 2, y: center.y + point.y - size.height / 2 },
    camera.zoom,
  );
}

/** 拖动：按屏幕像素平移相机中心 */
export function panByPixels(camera: MapCamera, deltaX: number, deltaY: number, size: ViewportSize): MapCamera {
  const center = lngLatToWorld(camera.center, camera.zoom);
  return {
    ...camera,
    center: worldToLngLat({ x: center.x - deltaX, y: center.y - deltaY }, camera.zoom),
  };
}

/**
 * 以某个屏幕锚点缩放，锚点下的地理位置保持不动。
 * 这是捏合缩放和滚轮缩放手感正确的关键：不补偿中心点，内容会整块滑走。
 */
export function zoomAroundPoint(camera: MapCamera, nextZoom: number, anchor: ScreenPoint, size: ViewportSize): MapCamera {
  const clamped = clampZoom(nextZoom);
  if (clamped === camera.zoom) return camera;
  const anchorCoordinate = unproject(anchor, camera, size);
  const zoomed: MapCamera = { center: camera.center, zoom: clamped };
  const anchorAfter = project(anchorCoordinate, zoomed, size);
  return panByPixels(zoomed, anchor.x - anchorAfter.x, anchor.y - anchorAfter.y, size);
}

/** 缩放但保持视口中心不动，用于 ＋/− 按钮 */
export function zoomAroundCenter(camera: MapCamera, nextZoom: number): MapCamera {
  return { center: camera.center, zoom: clampZoom(nextZoom) };
}

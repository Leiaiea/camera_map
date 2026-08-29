import { project, type MapCamera, type ViewportSize } from '../../services/map/camera';
import { BASE_ZOOM } from '../../services/map/projection';
import type { GeoCoordinate } from '../../services/location/types';

// 假地图的装饰层（河流、道路、街区名）。
//
// 这些素材仍然是 CSS 画的，但整层被锚定在一个真实经纬度上，并按缩放级别整体缩放，
// 所以它会跟着相机平移和缩放，不会和 Moment 贴纸错位。
//
// 接入高德后整个 MapDecor 直接删除，换成 AMap 容器 + 自定义样式即可，
// MapCanvas 的手势、投影和贴纸逻辑都不需要改。

/** 装饰层锚点：素材按 BASE_ZOOM 级别围绕这个坐标绘制。 */
const DECOR_ANCHOR: GeoCoordinate = { latitude: 31.2196, longitude: 121.4478 };

interface MapDecorProps {
  camera: MapCamera;
  size: ViewportSize;
}

export function MapDecor({ camera, size }: MapDecorProps) {
  const anchor = project(DECOR_ANCHOR, camera, size);
  const scale = 2 ** (camera.zoom - BASE_ZOOM);
  return (
    <div
      className="map-decor"
      aria-hidden="true"
      style={{ left: anchor.x, top: anchor.y, transform: `scale(${scale})` }}
    >
      <div className="map-water water-a" />
      <div className="map-water water-b" />
      <div className="map-road-grid road-a" />
      <div className="map-road-grid road-b" />
      <div className="map-road-grid road-c" />
      <span className="map-district district-a">静安</span>
      <span className="map-district district-b">徐汇</span>
      <span className="map-district district-c">我常走的路</span>
    </div>
  );
}

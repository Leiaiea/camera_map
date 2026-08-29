import { interactionImageOf, type Moment } from '../../models/moment';
import { getGroundTintPalette } from '../../services/mapVisual/groundTintPaletteService';

/** 地图层专用显示格式：不向 Moment 领域模型回写任何地图字段。 */
export interface MapMomentDisplay {
  id: string;
  placeName: string;
  isExample: boolean;
  /** 地图落点仅使用隐私模糊后的 GCJ-02 坐标。 */
  latitude: number;
  longitude: number;
  stickerUrl: string;
  /** 从独立派生色板存储读取；取色失败时回退中性默认色。 */
  groundTintColors: readonly [string, string, string];
}

/**
 * 将产品 Moment 收敛为地图所需的最小显示数据。
 * 真实经纬度在这里被刻意忽略，避免地图层绕过隐私模糊设计。
 */
export function toMapMomentDisplay(moment: Moment): MapMomentDisplay {
  if (moment.coordinateSystem !== 'gcj02') {
    throw new Error(`Moment ${moment.id} 的地图坐标必须为 GCJ-02`);
  }

  return {
    id: moment.id,
    placeName: moment.placeName,
    isExample: Boolean(moment.isExample),
    latitude: moment.blurredLatitude,
    longitude: moment.blurredLongitude,
    // 缺少透明贴纸时使用原图；再由既有媒体助手回退到默认图片。
    stickerUrl: interactionImageOf(moment),
    groundTintColors: getGroundTintPalette(moment.id),
  };
}

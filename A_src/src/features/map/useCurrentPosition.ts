import { useEffect, useState } from 'react';
import { locateCurrentPosition } from '../../services/location/locationService';
import type { LocatedPlace } from '../../services/location/types';

/**
 * App 启动时定位一次，用于地图初始视口和当前位置圆点。
 * 这次定位只决定「我在哪」，不参与任何 Moment 的坐标；
 * Moment 的坐标在互动完成后的保存阶段从这里缓存的结果读取。
 */
export function useCurrentPosition(enabled = true) {
  const [place, setPlace] = useState<LocatedPlace>();
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    locateCurrentPosition()
      .then((result) => { if (!cancelled) setPlace(result); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setIsLocating(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { place, isLocating };
}

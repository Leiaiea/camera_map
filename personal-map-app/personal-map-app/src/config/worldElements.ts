/**
 * 世界元素注册表。
 * 它们独立于 Moment：不保存记录、不参与贴纸边框或地面视觉管线。
 */
export interface WorldElementSpec {
  id: string;
  asset: string;
  behavior: 'stationary' | 'roam';
  /** 可选的显示尺寸覆盖值（px）；未设置时使用地图贴纸尺寸比例。 */
  sizePx?: number;
  /** 仅 stationary 使用的 CSS 动效。 */
  cssEffect?: 'bob' | 'sway';
}

export const WORLD_ELEMENTS: readonly WorldElementSpec[] = [
  {
    id: 'butterfly',
    asset: '/world/butterfly.webp',
    behavior: 'roam',
  },
];

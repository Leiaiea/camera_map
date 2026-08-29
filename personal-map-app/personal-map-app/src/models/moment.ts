import type { CoordinateSystem, LocatedPlace } from '../services/location/types';

export type MediaType = 'photo' | 'live-photo' | 'audio' | 'text' | 'mixed';
export type MomentStatus = 'draft' | 'saved' | 'deleted';

/** 仅供明确的纯演示记录使用，不能写入真实采集草稿。 */
export const FALLBACK_INTERACTION_IMAGE = '/church.jpg';
const EMPTY_MEDIA_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';

export interface CapturedAudio {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface Moment {
  id: string;
  createdAt: string;
  updatedAt: string;
  mediaType: MediaType;
  /** 完整原图：详情弹层与媒体保存使用。 */
  photo?: string;
  /** 透明白边贴纸：仅用于互动、到达动画和地图标记。 */
  stickerPhoto?: string;
  livePhotoVideo?: string;
  audio?: Blob;
  audioMimeType?: string;
  audioDurationMs?: number;
  text?: string;
  /** 记录当时的真实坐标 */
  latitude: number;
  longitude: number;
  /** 对外展示与地图定位使用的模糊坐标 */
  blurredLatitude: number;
  blurredLongitude: number;
  blurRadiusMeters: number;
  /** 坐标所属坐标系，避免接入高德后与 WGS-84 数据混用 */
  coordinateSystem: CoordinateSystem;
  city: string;
  district?: string;
  placeName: string;
  /** 地点名来自哪个逆地理编码实现，便于日后区分模拟与真实数据 */
  placeSource: string;
  interactionType: string;
  status: MomentStatus;
  isExample?: boolean;
}

export interface CaptureDraft {
  /** 采集开始时生成，同时作为 Moment id 和坐标模糊种子，保证位置稳定 */
  id: string;
  /** 完整原图：详情弹层与媒体保存使用。 */
  photo?: string;
  /** 透明白边贴纸：仅用于互动、到达动画和地图标记。 */
  stickerPhoto?: string;
  livePhotoVideo?: string;
  audio?: CapturedAudio;
  text: string;
  interactionType: string;
  /** 在采集页点击「确认」时定位并写入 */
  location?: LocatedPlace;
}

export const emptyCaptureDraft = (interactionType = 'paper-plane'): CaptureDraft => ({
  id: crypto.randomUUID(),
  text: '',
  interactionType,
});

/** 采集内容是否足够保存。四种记录方式任一即可，不再依赖默认照片。 */
export function hasCaptureContent(draft: CaptureDraft): boolean {
  return Boolean(draft.photo || draft.livePhotoVideo || draft.audio || draft.text.trim());
}

export function resolveMediaType(draft: CaptureDraft): MediaType {
  const populated = [draft.photo, draft.livePhotoVideo, draft.audio, draft.text.trim()].filter(Boolean).length;
  if (populated > 1) return 'mixed';
  if (draft.livePhotoVideo) return 'live-photo';
  if (draft.audio) return 'audio';
  if (draft.photo) return 'photo';
  return 'text';
}

function warnUnexpectedFallback(context: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[photo-flow] ${context}：真实记录不应使用示例图，请检查采集草稿交接。`);
  }
}

/** 地图与到达动画优先使用本次生成的贴纸，再使用本次原图。 */
export function interactionImageOf(source: { photo?: string; stickerPhoto?: string; isExample?: boolean }): string {
  if (source.stickerPhoto) return source.stickerPhoto;
  if (source.photo && source.photo !== FALLBACK_INTERACTION_IMAGE) return source.photo;
  if (source.photo === FALLBACK_INTERACTION_IMAGE && source.isExample) return FALLBACK_INTERACTION_IMAGE;
  if (source.photo === FALLBACK_INTERACTION_IMAGE) warnUnexpectedFallback('地图/到达动画收到示例图');
  return EMPTY_MEDIA_PLACEHOLDER;
}

/** 互动过渡阶段始终展示本次拍摄的完整原图，不允许静默回退到示例图。 */
export function originalImageOf(source: { photo?: string }): string {
  if (source.photo && source.photo !== FALLBACK_INTERACTION_IMAGE) return source.photo;
  if (source.photo === FALLBACK_INTERACTION_IMAGE) warnUnexpectedFallback('互动页收到示例图');
  else if (import.meta.env.DEV) console.warn('[photo-flow] 互动页缺少用户照片，将显示空白占位而非示例图。');
  return EMPTY_MEDIA_PLACEHOLDER;
}

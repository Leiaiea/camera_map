import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { emptyCaptureDraft, resolveMediaType, type CaptureDraft, type Moment } from '../../models/moment';
import { locateForMoment } from '../../services/location/locationService';
import { blurCoordinate, DEFAULT_BLUR_RADIUS_METERS } from '../../services/location/blur';
import { exampleSpot } from '../../services/location/providers/mockLocationProvider';
import type { GeoCoordinate } from '../../services/location/types';
import { momentRepository } from '../../services/storage';
import { releaseMomentResources, takeStickerPhotoTask } from '../../services/media/mediaService';

interface MomentContextValue {
  moments: Moment[];
  selectedMoment?: Moment;
  selectedId?: string;
  lastLocationSource?: 'device' | 'mock';
  shouldShowExample: boolean;
  createMoment: (draft: CaptureDraft) => Promise<Moment>;
  deleteMoment: (id: string) => Promise<void>;
  selectMoment: (id?: string) => void;
}

const MomentContext = createContext<MomentContextValue | null>(null);

// 示例记录固定在 exampleSpot，模糊后位置稳定，且与「我的当前位置」明显分开。
const exampleBlur = blurCoordinate(exampleSpot, 'example-sunset');

export const exampleMoment: Moment = {
  id: 'example-sunset',
  createdAt: '2026-08-27T10:20:00.000Z',
  updatedAt: '2026-08-27T10:20:00.000Z',
  mediaType: 'mixed',
  photo: '/church.jpg',
  text: '示范案例：傍晚的光落在旧教堂上。',
  latitude: exampleSpot.latitude,
  longitude: exampleSpot.longitude,
  blurredLatitude: exampleBlur.latitude,
  blurredLongitude: exampleBlur.longitude,
  blurRadiusMeters: DEFAULT_BLUR_RADIUS_METERS,
  coordinateSystem: 'gcj02',
  city: exampleSpot.city,
  district: exampleSpot.district,
  placeName: exampleSpot.placeName,
  placeSource: 'mock-example',
  interactionType: 'paper-plane',
  status: 'saved',
  isExample: true,
};

/** 示例贴纸始终位于当前（或默认）定位点正北 200 米。 */
export function createExampleMoment(origin: GeoCoordinate): Moment {
  const latitude = origin.latitude + 200 / 111_320;
  return {
    ...exampleMoment,
    latitude,
    longitude: origin.longitude,
    blurredLatitude: latitude,
    blurredLongitude: origin.longitude,
    blurRadiusMeters: 0,
    placeName: '当前位置北方约 200 米',
    placeSource: 'current-location-example',
  };
}

export function MomentProvider({ children }: { children: ReactNode }) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [lastLocationSource, setLastLocationSource] = useState<'device' | 'mock'>();

  useEffect(() => {
    momentRepository.list().then(setMoments);
  }, []);

  const createMoment = useCallback(async (draft: CaptureDraft) => {
    // 定位与地址解析在互动完成后的保存时刻进行；draft 已有位置时仍兼容读取。
    const location = draft.location ?? await locateForMoment(draft.id);
    const stickerPhoto = draft.stickerPhoto ?? await takeStickerPhotoTask(draft.id);
    setLastLocationSource(location.source);
    const now = new Date().toISOString();
    const moment: Moment = {
      id: draft.id,
      createdAt: now,
      updatedAt: now,
      mediaType: resolveMediaType(draft),
      photo: draft.photo,
      stickerPhoto,
      livePhotoVideo: draft.livePhotoVideo,
      audio: draft.audio?.blob,
      audioMimeType: draft.audio?.mimeType,
      audioDurationMs: draft.audio?.durationMs,
      text: draft.text.trim() || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      blurredLatitude: location.blurredLatitude,
      blurredLongitude: location.blurredLongitude,
      blurRadiusMeters: location.blurRadiusMeters,
      coordinateSystem: location.system,
      city: location.city,
      district: location.district,
      placeName: location.placeName,
      placeSource: location.placeSource,
      interactionType: draft.interactionType,
      status: 'saved',
    };
    await momentRepository.save(moment);
    setMoments((current) => [moment, ...current.filter((item) => item.id !== moment.id)]);
    return moment;
  }, []);

  const deleteMoment = useCallback(async (id: string) => {
    const target = moments.find((item) => item.id === id);
    await momentRepository.delete(id);
    releaseMomentResources(target);
    setMoments((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => current === id ? undefined : current);
  }, [moments]);

  const selectedMoment = useMemo(
    () => (selectedId === exampleMoment.id ? exampleMoment : moments.find((item) => item.id === selectedId)),
    [moments, selectedId],
  );

  const value = useMemo(() => ({
    moments,
    selectedMoment,
    selectedId,
    lastLocationSource,
    shouldShowExample: true,
    createMoment,
    deleteMoment,
    selectMoment: setSelectedId,
  }), [moments, selectedMoment, selectedId, lastLocationSource, createMoment, deleteMoment]);

  return <MomentContext.Provider value={value}>{children}</MomentContext.Provider>;
}

export function useMoments() {
  const context = useContext(MomentContext);
  if (!context) throw new Error('useMoments must be used inside MomentProvider');
  return context;
}

export { emptyCaptureDraft };

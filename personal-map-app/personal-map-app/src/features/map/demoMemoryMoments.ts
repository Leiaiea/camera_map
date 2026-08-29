import type { Moment } from '../../models/moment';
import { DEMO_MEMORY_STICKERS, type DemoMemoryStickerConfig } from '../../config/mapDemoTuning';

function createDemoMemoryMoment(index: number, source: DemoMemoryStickerConfig): Moment {
  const number = String(index + 1).padStart(3, '0');
  const sticker = `/demo-memories/${source.image}`;
  const photo = source.photo ? `/demo-memories/${source.photo}` : sticker;
  return {
    id: `demo-memory-${number}`,
    createdAt: source.createdAt ?? '2026-08-29T00:00:00.000Z',
    updatedAt: source.createdAt ?? '2026-08-29T00:00:00.000Z',
    mediaType: 'photo',
    photo,
    stickerPhoto: sticker,
    latitude: source.latitude,
    longitude: source.longitude,
    blurredLatitude: source.latitude,
    blurredLongitude: source.longitude,
    blurRadiusMeters: 0,
    coordinateSystem: 'gcj02',
    city: source.city ?? '北京市',
    district: source.district ?? '东城区',
    placeName: source.placeName ?? `演示记忆 ${index + 1}`,
    placeSource: 'demo-memory',
    interactionType: 'paper-plane',
    status: 'saved',
    isDemo: true,
    text: source.text,
  };
}

export const demoMemoryMoments = DEMO_MEMORY_STICKERS.map((source, index) => createDemoMemoryMoment(index, source));

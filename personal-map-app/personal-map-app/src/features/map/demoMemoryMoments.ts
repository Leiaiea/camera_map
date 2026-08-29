import type { Moment } from '../../models/moment';
import { DEMO_MEMORY_STICKERS } from '../../config/mapDemoTuning';

function createDemoMemoryMoment(index: number, source: (typeof DEMO_MEMORY_STICKERS)[number]): Moment {
  const number = String(index + 1).padStart(3, '0');
  const sticker = `/demo-memories/${source.image}`;
  return {
    id: `demo-memory-${number}`,
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
    mediaType: 'photo',
    photo: sticker,
    stickerPhoto: sticker,
    latitude: source.latitude,
    longitude: source.longitude,
    blurredLatitude: source.latitude,
    blurredLongitude: source.longitude,
    blurRadiusMeters: 0,
    coordinateSystem: 'gcj02',
    city: '北京市',
    district: '东城区',
    placeName: `演示记忆 ${index + 1}`,
    placeSource: 'demo-memory',
    interactionType: 'paper-plane',
    status: 'saved',
  };
}

export const demoMemoryMoments = DEMO_MEMORY_STICKERS.map((source, index) => createDemoMemoryMoment(index, source));

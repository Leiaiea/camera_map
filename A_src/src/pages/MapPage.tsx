import { useCallback, useState } from 'react';
import type { Moment } from '../models/moment';
import type { InteractionDefinition } from '../interactions/types';
import { MapCanvas } from '../features/map/MapCanvas';
import { useCurrentPosition } from '../features/map/useCurrentPosition';
import { createExampleMoment, useMoments } from '../features/moment/MomentProvider';
import { MomentDetailSheet } from '../features/moment/MomentDetailSheet';
import { InteractionArrivalStage } from '../features/record/InteractionArrivalStage';
import type { GeoCoordinate } from '../services/location/types';

interface MapPageProps {
  onAdd: () => void;
  arriving?: { moment: Moment; interaction: InteractionDefinition };
  onArrivalComplete: () => void;
}

const DEFAULT_CENTER: GeoCoordinate = { latitude: 31.2137, longitude: 121.4429 };

export function MapPage({ onAdd, arriving, onArrivalComplete }: MapPageProps) {
  const { moments, selectedMoment, selectMoment, deleteMoment, lastLocationSource, shouldShowExample } = useMoments();
  const [mapReady, setMapReady] = useState(false);
  const [arrivalTarget, setArrivalTarget] = useState<{ momentId?: string; x: number; y: number }>();
  const current = useCurrentPosition(mapReady);
  const handleMapReady = useCallback(() => setMapReady(true), []);
  const handleArrivalTargetChange = useCallback(
    (target?: { x: number; y: number }) => setArrivalTarget(target ? { ...target, momentId: arriving?.moment.id } : undefined),
    [arriving?.moment.id],
  );
  // 定位尚未返回时也先展示默认位置的示例贴纸，成功后会自动移动到真实位置正北。
  const currentExample = shouldShowExample ? createExampleMoment(current.place ?? DEFAULT_CENTER) : undefined;
  const visibleMoments = currentExample ? [...moments, currentExample] : moments;
  const detailMoment = selectedMoment?.isExample ? currentExample : selectedMoment;
  return (
    <main className="page map-page">
      <MapCanvas
        moments={visibleMoments}
        currentPosition={current.place}
        hiddenMomentId={arriving?.moment.id}
        arrivalMoment={arriving?.moment}
        onArrivalTargetChange={handleArrivalTargetChange}
        onSelect={selectMoment}
        onReady={handleMapReady}
      />
      {current.isLocating && <div className="locating-banner">正在确定你的位置…</div>}
      {!current.isLocating && current.place && (
        <div className="here-banner">
          <b>{current.place.city}</b>
        </div>
      )}
      {(current.place?.source === 'mock' || (lastLocationSource === 'mock' && moments.length > 0)) && <div className="location-banner">未取得设备定位，已显示默认位置</div>}
      <div className="map-side-actions" aria-label="地图工具">
        <button type="button" aria-label="记录列表">☷</button>
        <button type="button" aria-label="个人中心">◯</button>
      </div>
      <button className="add-moment-button" onClick={onAdd}><i>＋</i><span>添加此刻</span></button>
      {detailMoment && <MomentDetailSheet moment={detailMoment} onClose={() => selectMoment()} onDelete={() => deleteMoment(detailMoment.id)} />}
      {arriving && <InteractionArrivalStage interaction={arriving.interaction} moment={arriving.moment} target={arrivalTarget?.momentId === arriving.moment.id ? arrivalTarget : undefined} onComplete={onArrivalComplete} />}
    </main>
  );
}

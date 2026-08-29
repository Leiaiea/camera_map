import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import type { CaptureDraft, Moment } from '../models/moment';
import type { InteractionDefinition } from '../interactions/types';
import { MapCanvas } from '../features/map/MapCanvas';
import { demoMemoryMoments } from '../features/map/demoMemoryMoments';
import { WorldElementsLayer } from '../features/world/WorldElementsLayer';
import { useCurrentPosition } from '../features/map/useCurrentPosition';
import { createExampleMoment, useMoments } from '../features/moment/MomentProvider';
import { MomentDetailSheet } from '../features/moment/MomentDetailSheet';
import { InteractionArrivalStage } from '../features/record/InteractionArrivalStage';
import type { GeoCoordinate } from '../services/location/types';
import { WORLD_ELEMENTS_ENABLED } from '../config/mapDemoTuning';

const DevArrivalDebugTools = import.meta.env.DEV
  ? lazy(() => import('../features/map/ArrivalDebugTools').then(({ ArrivalDebugTools }) => ({ default: ArrivalDebugTools })))
  : undefined;

interface MapPageProps {
  onAdd: () => void;
  onCapture: () => void;
  arriving?: { moment: Moment; interaction: InteractionDefinition };
  onArrivalComplete: () => void;
  onDebugConfirmCapture?: (draft: CaptureDraft) => void;
  isActive: boolean;
  captureResetRequest?: number;
  onCaptureResetComplete?: () => void;
}

const DEFAULT_CENTER: GeoCoordinate = { latitude: 31.2137, longitude: 121.4429 };

export function MapPage({ onAdd, onCapture, arriving, onArrivalComplete, onDebugConfirmCapture, isActive, captureResetRequest, onCaptureResetComplete }: MapPageProps) {
  const { moments, selectedMoment, selectedId, selectMoment, deleteMoment, lastLocationSource, shouldShowExample } = useMoments();
  const [arrivalTarget, setArrivalTarget] = useState<{ momentId?: string; x: number; y: number }>();
  const [mapApi, setMapApi] = useState<{ map: any; AMap: any }>();
  // 定位与高德 SDK 初始化同步启动，避免先等定位再开始拉地图瓦片。
  const current = useCurrentPosition();
  const handleMapReady = useCallback(() => undefined, []);
  const handleMapInstanceReady = useCallback((map: any, AMap: any) => setMapApi({ map, AMap }), []);
  const handleArrivalTargetChange = useCallback(
    (target?: { x: number; y: number }) => setArrivalTarget(target ? { ...target, momentId: arriving?.moment.id } : undefined),
    [arriving?.moment.id],
  );
  const handleArrivalComplete = useCallback(() => {
    const completedMoment = arriving?.moment;
    onArrivalComplete();
    if (completedMoment?.id.startsWith('debug-')) void deleteMoment(completedMoment.id);
  }, [arriving?.moment, deleteMoment, onArrivalComplete]);
  // 定位尚未返回时也先展示默认位置的示例贴纸，成功后会自动移动到真实位置正北。
  const currentExample = shouldShowExample ? createExampleMoment(current.place ?? DEFAULT_CENTER) : undefined;
  const visibleMoments = currentExample ? [...moments, currentExample] : moments;
  const selectedDemoMoment = demoMemoryMoments.find((moment) => moment.id === selectedId);
  const detailMoment = selectedDemoMoment ?? (selectedMoment?.isExample ? currentExample : selectedMoment);
  const momentSpawnCenters = useMemo(
    () => moments.map((moment) => ({ latitude: moment.blurredLatitude, longitude: moment.blurredLongitude })),
    [moments],
  );
  return (
    <main className="page map-page" hidden={!isActive} aria-hidden={!isActive}>
      <MapCanvas
        moments={visibleMoments}
        currentPosition={current.place}
        hiddenMomentId={arriving?.moment.id}
        arrivalMoment={arriving?.moment}
        onArrivalTargetChange={handleArrivalTargetChange}
        onSelect={selectMoment}
        onReady={handleMapReady}
        onMapReady={handleMapInstanceReady}
        isVisible={isActive}
        captureResetRequest={captureResetRequest}
        onCaptureResetComplete={onCaptureResetComplete}
      />
      {WORLD_ELEMENTS_ENABLED && mapApi && current.place && (
        <WorldElementsLayer
          map={mapApi.map}
          AMap={mapApi.AMap}
          spawnCenter={{ latitude: current.place.blurredLatitude, longitude: current.place.blurredLongitude }}
          momentSpawnCenters={momentSpawnCenters}
        />
      )}
      {current.isLocating && <div className="locating-banner">正在确定你的位置…</div>}
      {!current.isLocating && current.place && (
        <div className="here-banner">
          <b>{current.place.city}</b>
        </div>
      )}
      {(current.place?.source === 'mock' || (lastLocationSource === 'mock' && moments.length > 0)) && <div className="location-banner">未取得设备定位，已显示默认位置</div>}
      <button className="map-profile-button" type="button" aria-label="我的"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.8-3.4 3.1-5.2 6.5-5.2s5.7 1.8 6.5 5.2" /></svg></button>
      <nav className="map-primary-actions" aria-label="地图操作">
        <div className="map-primary-bridge" />
        <button className="map-primary-action map-guide-action" type="button" onClick={onAdd} aria-label="种子引导"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 18c-2 0-4-1-4-3s2-3 4-3c1 0 2 .3 3 1" /><path d="M14 19c-2 0-4-1-4-3s2-3 4-3c2 0 4 1 4 3s-2 3-4 3" /></svg></button>
        <button className="map-primary-action map-capture-action" type="button" onClick={onCapture} aria-label="拍摄"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="14" r="3.5" /></svg></button>
        <button className="map-primary-action map-archive-action" type="button" aria-label="归档（暂未开放）" aria-disabled="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z" /><path d="M5 8h14M9 4v4M9 13h6M9 17h4" /></svg></button>
      </nav>
      {DevArrivalDebugTools && onDebugConfirmCapture && <Suspense fallback={null}><DevArrivalDebugTools onConfirmCapture={onDebugConfirmCapture} /></Suspense>}
      {detailMoment && <MomentDetailSheet moment={detailMoment} onClose={() => selectMoment()} onDelete={() => deleteMoment(detailMoment.id)} />}
      {arriving && <InteractionArrivalStage interaction={arriving.interaction} moment={arriving.moment} target={arrivalTarget?.momentId === arriving.moment.id ? arrivalTarget : undefined} onComplete={handleArrivalComplete} />}
    </main>
  );
}

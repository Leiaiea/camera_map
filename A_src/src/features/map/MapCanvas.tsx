import { useEffect, useRef, useState } from 'react';
import type { Moment } from '../../models/moment';
import type { GeoCoordinate } from '../../services/location/types';
import { loadAMap } from '../../services/location/providers/amapProviders';
import { toMapMomentDisplay, type MapMomentDisplay } from './momentMapAdapter';
import { StickerGenerationDebugToggle } from './StickerGenerationDebugToggle';

interface MapCanvasProps {
  moments: Moment[];
  currentPosition?: GeoCoordinate;
  hiddenMomentId?: string;
  arrivalMoment?: Moment;
  onArrivalTargetChange?: (target?: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  onReady: () => void;
}

const FALLBACK_CENTER: GeoCoordinate = { latitude: 31.2137, longitude: 121.4429 };
/** 数字越大越近：15 街区 / 17 街道 / 20 特写。 */
const DEFAULT_ZOOM = 17;

/** B 已验证的 3D 镜头曲线：近处低角度、远处更接近俯视。 */
function getPitchForZoom(zoom: number): number {
  const farZoom = 12;
  const nearZoom = 20;
  const farPitch = 18;
  const nearPitch = 58;
  const progress = Math.max(0, Math.min(1, (zoom - farZoom) / (nearZoom - farZoom)));
  return Math.round((farPitch + (nearPitch - farPitch) * progress) * 10) / 10;
}

function createMomentContent(moment: MapMomentDisplay): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `moment-marker ${moment.isExample ? 'is-example' : ''}`;
  button.type = 'button';
  button.setAttribute('aria-label', `查看 ${moment.placeName} 的 Moment`);
  const shadow = document.createElement('img');
  shadow.className = 'sticker-shadow';
  shadow.src = moment.stickerUrl;
  shadow.alt = '';
  shadow.draggable = false;
  const sticker = document.createElement('img');
  sticker.className = 'map-sticker';
  sticker.src = moment.stickerUrl;
  sticker.alt = '';
  sticker.draggable = false;
  sticker.addEventListener('error', () => { sticker.hidden = true; shadow.hidden = true; });
  button.append(shadow, sticker);
  return button;
}

function createGroundTintContent(moment: MapMomentDisplay): HTMLElement {
  const tint = document.createElement('i');
  tint.className = 'ground-tint';
  tint.setAttribute('aria-hidden', 'true');
  tint.style.setProperty('--ground-tint-color-1', moment.groundTintColors[0]);
  tint.style.setProperty('--ground-tint-color-2', moment.groundTintColors[1]);
  tint.style.setProperty('--ground-tint-color-3', moment.groundTintColors[2]);
  return tint;
}

export function MapCanvas({ moments, currentPosition, hiddenMomentId, arrivalMoment, onArrivalTargetChange, onSelect, onReady }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(undefined);
  const AMapRef = useRef<any>(undefined);
  const markersRef = useRef<any[]>([]);
  const tintMarkersRef = useRef<any[]>([]);
  const currentPositionMarkerRef = useRef<any>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let mapTone: HTMLDivElement | undefined;
    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        AMapRef.current = AMap;
        const map = new AMap.Map(containerRef.current, {
          center: [FALLBACK_CENTER.longitude, FALLBACK_CENTER.latitude],
          zoom: DEFAULT_ZOOM,
          viewMode: '3D',
          pitch: getPitchForZoom(DEFAULT_ZOOM),
          rotation: 0,
          pitchEnable: false,
          rotateEnable: false,
          skyColor: '#DCE8EC',
          mapStyle: 'amap://styles/whitesmoke',
          showLabel: false,
          showIndoorMap: false,
          showBuildingBlock: true,
          buildingAnimation: false,
          roofColor: '#E8E8EA',
          wallColor: '#D8D8DC',
          features: ['bg', 'road', 'building'],
        });
        const syncPitchToZoom = () => map.setPitch(getPitchForZoom(map.getZoom()));
        map.on('zoomchange', syncPitchToZoom);
        map.on('complete', () => map.setMapStyle('amap://styles/whitesmoke'));
        mapTone = document.createElement('div');
        mapTone.className = 'map-tone';
        mapTone.setAttribute('aria-hidden', 'true');
        containerRef.current.append(mapTone);
        mapRef.current = map;
        setIsReady(true);
        onReady();
      })
      .catch((error: unknown) => { if (!cancelled) setMapError(error instanceof Error ? error.message : '地图加载失败'); });
    return () => { cancelled = true; currentPositionMarkerRef.current?.setMap(null); mapTone?.remove(); mapRef.current?.destroy(); mapRef.current = undefined; };
  }, [onReady]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !AMapRef.current) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    tintMarkersRef.current.forEach((marker) => marker.setMap(null));
    const AMap = AMapRef.current;
    const displays = moments.filter((moment) => moment.id !== hiddenMomentId).map(toMapMomentDisplay);
    tintMarkersRef.current = displays.map((display) => {
      const marker = new AMap.Marker({
        position: [display.longitude, display.latitude],
        content: createGroundTintContent(display),
        offset: new AMap.Pixel(-118, -82),
        zIndex: 80,
        clickable: false,
      });
      marker.setMap(mapRef.current);
      return marker;
    });
    markersRef.current = displays.map((display) => {
      const marker = new AMap.Marker({ position: [display.longitude, display.latitude], content: createMomentContent(display), offset: new AMap.Pixel(-28, -28), zIndex: 100 });
      marker.on('click', () => onSelect(display.id));
      marker.setMap(mapRef.current);
      return marker;
    });
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      tintMarkersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [hiddenMomentId, isReady, moments, onSelect]);

  useEffect(() => {
    if (isReady && mapRef.current && currentPosition) mapRef.current.setCenter([currentPosition.longitude, currentPosition.latitude]);
  }, [currentPosition, isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || !arrivalMoment || !onArrivalTargetChange) return;
    const longitude = arrivalMoment.blurredLongitude;
    const latitude = arrivalMoment.blurredLatitude;
    if (longitude == null || latitude == null) return;
    const position = [longitude, latitude];
    let frame = 0;
    const publishTarget = () => {
      const pixel = map.lngLatToContainer(position);
      onArrivalTargetChange({ x: pixel.getX(), y: pixel.getY() });
    };
    const publishAfterCameraMove = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(publishTarget);
    };
    map.on('moveend', publishAfterCameraMove);
    map.on('zoomend', publishAfterCameraMove);
    map.setZoomAndCenter(DEFAULT_ZOOM, position, false, 700);
    window.setTimeout(publishAfterCameraMove, 750);
    return () => {
      window.cancelAnimationFrame(frame);
      map.off('moveend', publishAfterCameraMove);
      map.off('zoomend', publishAfterCameraMove);
    };
  }, [arrivalMoment, isReady, onArrivalTargetChange]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !AMapRef.current || !currentPosition) return;
    currentPositionMarkerRef.current?.setMap(null);
    const point = document.createElement('div');
    point.className = 'current-position';
    point.setAttribute('aria-label', '我的当前位置');
    point.innerHTML = '<i></i><b></b>';
    currentPositionMarkerRef.current = new AMapRef.current.Marker({
      position: [currentPosition.longitude, currentPosition.latitude],
      content: point,
      offset: new AMapRef.current.Pixel(0, 0),
    });
    currentPositionMarkerRef.current.setMap(mapRef.current);
    return () => currentPositionMarkerRef.current?.setMap(null);
  }, [currentPosition, isReady]);

  const zoomBy = (delta: number) => { const map = mapRef.current; if (map) map.setZoom(map.getZoom() + delta); };
  const recenter = () => { if (mapRef.current && currentPosition) mapRef.current.setCenter([currentPosition.longitude, currentPosition.latitude]); };

  return <>
    <div className="map-viewport" ref={containerRef} aria-label="可拖动和缩放的高德地图" />
    {mapError && <div className="location-banner">地图暂不可用：{mapError}</div>}
    <StickerGenerationDebugToggle />
    <div className="map-zoom-controls" aria-label="地图缩放">
      <button onClick={() => zoomBy(1)} disabled={!isReady} aria-label="放大地图">＋</button>
      <button onClick={() => zoomBy(-1)} disabled={!isReady} aria-label="缩小地图">−</button>
      {currentPosition && <button className="recenter-button" onClick={recenter} disabled={!isReady} aria-label="回到我的位置">◎</button>}
    </div>
  </>;
}

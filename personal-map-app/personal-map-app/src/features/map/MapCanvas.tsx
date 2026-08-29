import { useEffect, useRef, useState } from 'react';
import type { Moment } from '../../models/moment';
import type { GeoCoordinate } from '../../services/location/types';
import { loadAMap } from '../../services/location/providers/amapProviders';
import {
  MAP_STICKER_DISPLAY_PX,
  MAP_STICKER_SHADOW_BLUR_PX,
  MAP_STICKER_SHADOW_COLOR,
  MAP_STICKER_SHADOW_OFFSET_X_PX,
  MAP_STICKER_SHADOW_OFFSET_Y_PX,
  MAP_STICKER_SHADOW_OPACITY,
  MAP_STICKER_SHADOW_ORIGIN,
  MAP_STICKER_SHADOW_ROTATION_DEG,
  MAP_STICKER_SHADOW_SCALE_X,
  MAP_STICKER_SHADOW_SCALE_Y,
  MAP_STICKER_SHADOW_SKEW_X_DEG,
  SHOW_BUILDINGS,
  GROUND_TINT_DIAMETER_METERS,
  GROUND_TINT_ENABLED,
  GROUND_TINT_TEXTURE_OPACITY,
  GROUND_TINT_TEXTURE_RASTER_PX,
  TINT_DEBUG_COLORS,
  USE_FIXED_LOCATION,
  PAPER_TEXTURE_BLEND_MODE,
  PAPER_TEXTURE_ENABLED,
  PAPER_TEXTURE_OPACITY,
  MAP_FILTER_ENABLED,
  MAP_FILTER_PRESET,
  MAP_FILTER_PRESETS,
} from '../../config/mapDemoTuning';
import { getBorderedStickerUrl } from '../../services/media/stickerBorder';
import { extractGroundTintPalette, hasGroundTintPalette, saveGroundTintPalette } from '../../services/mapVisual/groundTintPaletteService';
import { createGroundTintTextureLayers, rasterizeGroundTintTexture, verifyGroundTintVisibility } from './groundTintTextures';
import { toMapMomentDisplay, type MapMomentDisplay } from './momentMapAdapter';
import { StickerGenerationDebugToggle } from './StickerGenerationDebugToggle';
import { demoMemoryMoments } from './demoMemoryMoments';

interface MapCanvasProps {
  moments: Moment[];
  currentPosition?: GeoCoordinate;
  hiddenMomentId?: string;
  arrivalMoment?: Moment;
  onArrivalTargetChange?: (target?: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  onReady: () => void;
  /** 地图实例初始化完成后提供给独立图层；调用方不得改变地图视口或样式。 */
  onMapReady?: (map: any, AMap: any) => void;
  /** 地图页隐藏期间不接收交互；重新可见时只 resize，不重建实例。 */
  isVisible: boolean;
  /** 捕获新的请求编号时，将镜头归位到与转场死图一致的视角。 */
  captureResetRequest?: number;
  onCaptureResetComplete?: () => void;
}

const FALLBACK_CENTER: GeoCoordinate = { latitude: 31.2137, longitude: 121.4429 };
/** 数字越大越近：15 街区 / 17 街道 / 20 特写。 */
const DEFAULT_ZOOM = 17;
const MAP_STICKER_HALF_SIZE_PX = MAP_STICKER_DISPLAY_PX / 2;
let hasStartedTintVisibilityCheck = false;

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
  button.style.width = `${MAP_STICKER_DISPLAY_PX}px`;
  button.style.height = `${MAP_STICKER_DISPLAY_PX}px`;
  button.setAttribute('aria-label', `查看 ${moment.placeName} 的 Moment`);
  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  shadow.setAttribute('class', 'sticker-shadow');
  shadow.setAttribute('aria-hidden', 'true');
  shadow.setAttribute('viewBox', `0 0 ${MAP_STICKER_DISPLAY_PX} ${MAP_STICKER_DISPLAY_PX}`);
  shadow.style.position = 'absolute';
  shadow.style.inset = '0';
  shadow.style.display = 'none';
  shadow.style.width = `${MAP_STICKER_DISPLAY_PX}px`;
  shadow.style.height = `${MAP_STICKER_DISPLAY_PX}px`;
  shadow.style.overflow = 'visible';
  shadow.style.opacity = String(MAP_STICKER_SHADOW_OPACITY);
  shadow.style.transformOrigin = MAP_STICKER_SHADOW_ORIGIN;
  shadow.style.transform = `translate(${MAP_STICKER_SHADOW_OFFSET_X_PX}px,${MAP_STICKER_SHADOW_OFFSET_Y_PX}px) skewX(${MAP_STICKER_SHADOW_SKEW_X_DEG}deg) scale(${MAP_STICKER_SHADOW_SCALE_X},${MAP_STICKER_SHADOW_SCALE_Y}) rotate(${MAP_STICKER_SHADOW_ROTATION_DEG}deg)`;
  const filterId = `sticker-shadow-${moment.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', filterId);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');
  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('in', 'SourceAlpha');
  blur.setAttribute('stdDeviation', String(MAP_STICKER_SHADOW_BLUR_PX));
  blur.setAttribute('result', 'blurred-alpha');
  const color = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
  color.setAttribute('flood-color', MAP_STICKER_SHADOW_COLOR);
  color.setAttribute('result', 'shadow-color');
  const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
  composite.setAttribute('in', 'shadow-color');
  composite.setAttribute('in2', 'blurred-alpha');
  composite.setAttribute('operator', 'in');
  filter.append(blur, color, composite);
  defs.append(filter);
  const shadowImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  shadowImage.setAttribute('width', String(MAP_STICKER_DISPLAY_PX));
  shadowImage.setAttribute('height', String(MAP_STICKER_DISPLAY_PX));
  shadowImage.setAttribute('filter', `url(#${filterId})`);
  shadow.append(defs, shadowImage);
  const sticker = document.createElement('img');
  sticker.className = 'map-sticker';
  sticker.alt = '';
  sticker.hidden = true;
  sticker.draggable = false;
  sticker.style.width = `${MAP_STICKER_DISPLAY_PX}px`;
  sticker.style.height = `${MAP_STICKER_DISPLAY_PX}px`;
  sticker.style.transform = 'translateY(-10px) rotate(-1.5deg)';
  sticker.addEventListener('error', () => { sticker.hidden = true; shadow.style.display = 'none'; });
  button.append(shadow, sticker);
  void getBorderedStickerUrl(moment.id, moment.stickerUrl)
    .then((borderedUrl) => {
      sticker.src = borderedUrl;
      shadowImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', borderedUrl);
      sticker.hidden = false;
      shadow.style.display = 'block';
    })
    .catch((error: unknown) => console.warn('[map] 贴纸边框生成失败，隐藏该贴纸以避免裸图闪现。', { momentId: moment.id, error }));
  return button;
}

function offsetCoordinateByMeters(latitude: number, longitude: number, eastMeters: number, northMeters: number) {
  const latitudeDelta = northMeters / 111320;
  const longitudeDelta = eastMeters / (111320 * Math.cos((latitude * Math.PI) / 180));
  return { latitude: latitude + latitudeDelta, longitude: longitude + longitudeDelta };
}

function createGroundTintBounds(AMap: any, latitude: number, longitude: number) {
  const halfDiameter = GROUND_TINT_DIAMETER_METERS / 2;
  const southWest = offsetCoordinateByMeters(latitude, longitude, -halfDiameter, -halfDiameter);
  const northEast = offsetCoordinateByMeters(latitude, longitude, halfDiameter, halfDiameter);
  return new AMap.Bounds([southWest.longitude, southWest.latitude], [northEast.longitude, northEast.latitude]);
}

function addMapLayer(map: any, layer: any) {
  if (typeof map.addLayer === 'function') map.addLayer(layer);
  else map.add(layer);
}

function removeMapLayer(map: any, layer: any) {
  if (typeof map.removeLayer === 'function') map.removeLayer(layer);
  else map.remove(layer);
}

export function MapCanvas({ moments, currentPosition, hiddenMomentId, arrivalMoment, onArrivalTargetChange, onSelect, onReady, onMapReady, isVisible, captureResetRequest, onCaptureResetComplete }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(undefined);
  const AMapRef = useRef<any>(undefined);
  const markersRef = useRef<any[]>([]);
  const tintOverlaysRef = useRef(new Map<string, { signature: string; layers: any[] }>());
  const tintRequestsRef = useRef(new Map<string, string>());
  const currentPositionMarkerRef = useRef<any>(undefined);
  const completedCaptureResetRef = useRef<number | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string>();
  const paletteAttemptsRef = useRef(new Set<string>());
  const [paletteRevision, setPaletteRevision] = useState(0);
  const mapFilter = MAP_FILTER_PRESETS[MAP_FILTER_PRESET];

  useEffect(() => {
    // 静态 demo 与示例图在地图加载时算一次；真实 Moment 在创建流程中取色并写入同一仓库。
    const paletteMoments = [
      ...moments.filter((moment) => moment.isExample),
      ...(USE_FIXED_LOCATION ? demoMemoryMoments : []),
    ];
    paletteMoments.forEach((moment) => {
      if (!moment.photo || hasGroundTintPalette(moment.id) || paletteAttemptsRef.current.has(moment.id)) return;
      paletteAttemptsRef.current.add(moment.id);
      void extractGroundTintPalette(moment.photo).then((palette) => {
        if (!palette) return;
        saveGroundTintPalette(moment.id, palette);
        setPaletteRevision((revision) => revision + 1);
      }).catch(() => undefined);
    });
  }, [moments]);

  useEffect(() => {
    let cancelled = false;
    let mapTone: HTMLDivElement | undefined;
    let paperTexture: HTMLDivElement | undefined;
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
          showBuildingBlock: SHOW_BUILDINGS,
          buildingAnimation: false,
          roofColor: '#E8E8EA',
          wallColor: '#D8D8DC',
          features: SHOW_BUILDINGS ? ['bg', 'road', 'building'] : ['bg', 'road'],
        });
        const syncPitchToZoom = () => map.setPitch(getPitchForZoom(map.getZoom()));
        map.on('zoomchange', syncPitchToZoom);
        map.on('complete', () => {
          map.setMapStyle('amap://styles/whitesmoke');
          if (cancelled) return;
          const baseTileCanvases = containerRef.current?.querySelectorAll<HTMLCanvasElement>('canvas.amap-layer') ?? [];
          baseTileCanvases.forEach((canvas) => { canvas.style.filter = MAP_FILTER_ENABLED ? mapFilter : 'none'; });
          setIsReady(true);
          onMapReady?.(map, AMap);
          onReady();
        });
        mapTone = document.createElement('div');
        mapTone.className = 'map-tone';
        mapTone.setAttribute('aria-hidden', 'true');
        containerRef.current.append(mapTone);
        const overlayRoot = containerRef.current.querySelector('.amap-maps');
        if (overlayRoot && PAPER_TEXTURE_ENABLED) {
          paperTexture = document.createElement('div');
          paperTexture.setAttribute('aria-hidden', 'true');
          Object.assign(paperTexture.style, { position: 'absolute', zIndex: '90', inset: '0', pointerEvents: 'none', backgroundImage: 'url(/textures/paper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', mixBlendMode: PAPER_TEXTURE_BLEND_MODE, opacity: String(PAPER_TEXTURE_OPACITY) });
          overlayRoot.append(paperTexture);
        }
        mapRef.current = map;
      })
      .catch((error: unknown) => { if (!cancelled) setMapError(error instanceof Error ? error.message : '地图加载失败'); });
    return () => { cancelled = true; currentPositionMarkerRef.current?.setMap(null); tintOverlaysRef.current.forEach(({ layers }) => layers.forEach((layer) => removeMapLayer(mapRef.current, layer))); tintOverlaysRef.current.clear(); paperTexture?.remove(); mapTone?.remove(); mapRef.current?.destroy(); mapRef.current = undefined; };
  }, [onMapReady, onReady]);

  useEffect(() => {
    if (!isVisible || !isReady || !mapRef.current) return;
    mapRef.current.resize();
  }, [isReady, isVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || captureResetRequest === undefined || completedCaptureResetRef.current === captureResetRequest) return;
    completedCaptureResetRef.current = captureResetRequest;
    const targetZoom = Math.min(Math.round(map.getZoom()), DEFAULT_ZOOM);
    map.setPitch(0, false, 250);
    map.setRotation(0, false, 250);
    map.setZoom(targetZoom, false, 250);
    const completeTimer = window.setTimeout(() => onCaptureResetComplete?.(), 250);
    return () => window.clearTimeout(completeTimer);
  }, [captureResetRequest, isReady, onCaptureResetComplete]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !AMapRef.current) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    const AMap = AMapRef.current;
    const mapMoments = USE_FIXED_LOCATION ? [...moments, ...demoMemoryMoments] : moments;
    const displays = mapMoments.filter((moment) => moment.id !== hiddenMomentId).map(toMapMomentDisplay);
    let isTintEffectActive = true;
    if (false && GROUND_TINT_ENABLED) {
      // ImageLayer 没有公开容器；CanvasLayer 的 canvas 由我们持有，使用 normal + 低透明度保持底图透出。
      const GroundOverlay = AMap.CanvasLayer;
      console.info('[map][水彩第 1 步] 覆盖物 API 检查', {
        GroundOverlay: Boolean(AMap.GroundOverlay),
        GroundImage: Boolean(AMap.GroundImage),
        ImageLayer: Boolean(AMap.ImageLayer),
        CanvasLayer: Boolean(AMap.CanvasLayer),
        selected: AMap.CanvasLayer ? 'CanvasLayer' : 'none',
        debugColors: TINT_DEBUG_COLORS,
      });
      if (!GroundOverlay) console.warn('[map] 当前高德 JS API 未提供 CanvasLayer，跳过水彩地面层。');
      displays.forEach((display) => {
      createGroundTintTextureLayers(display.id, display.groundTintColors).forEach((layer) => {
        const center = offsetCoordinateByMeters(display.latitude, display.longitude, layer.offsetXmeters, layer.offsetYmeters);
        const bounds = createGroundTintBounds(AMap, center.latitude, center.longitude);
        void rasterizeGroundTintTexture(layer.textureUrl, layer.gradientColors, layer.gradientAngleDegrees, GROUND_TINT_TEXTURE_RASTER_PX, GROUND_TINT_TEXTURE_RASTER_PX, layer)
          .then((canvas) => {
            if (!isTintEffectActive || !GroundOverlay || !mapRef.current) return;
            console.info('[map][水彩第 2 步] Canvas PNG 已生成', {
              momentId: display.id,
              sourceKind: 'canvas',
              gradientColors: layer.gradientColors,
              gradientAngleDegrees: layer.gradientAngleDegrees,
              bounds,
            });
            if (!isTintEffectActive || !mapRef.current) return;
            canvas.style.pointerEvents = 'none';
            const overlay = new GroundOverlay({
              canvas,
              bounds,
              opacity: GROUND_TINT_TEXTURE_OPACITY,
              zIndex: 80,
              zooms: [2, 20],
            });
            addMapLayer(mapRef.current, overlay);
            console.info('[map][水彩第 3 步] 地理水彩覆盖物已添加', {
              momentId: display.id,
              opacity: GROUND_TINT_TEXTURE_OPACITY,
              zIndex: 80,
              debugMode: Boolean(TINT_DEBUG_COLORS),
              blendMode: 'normal',
            });
          })
          .catch((error: unknown) => console.warn('[map] 水彩地面纹理生成失败，保留其他贴纸功能。', error));
      });
      });
      if (import.meta.env.DEV && !hasStartedTintVisibilityCheck) {
        hasStartedTintVisibilityCheck = true;
        void verifyGroundTintVisibility().then((passed) => console.info(`[map] 水彩纹理纯红最大色彩离屏自检：${passed ? '通过' : '失败'}`));
      }
    }
    markersRef.current = displays.map((display) => {
      const marker = new AMap.Marker({ position: [display.longitude, display.latitude], content: createMomentContent(display), offset: new AMap.Pixel(-MAP_STICKER_HALF_SIZE_PX, -MAP_STICKER_HALF_SIZE_PX), zIndex: 100 });
      marker.on('click', () => onSelect(display.id));
      marker.setMap(mapRef.current);
      return marker;
    });
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      isTintEffectActive = false;
    };
  }, [hiddenMomentId, isReady, moments, onSelect, paletteRevision]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!isReady || !map || !AMap || !GROUND_TINT_ENABLED) return;
    const GroundOverlay = AMap.CanvasLayer;
    if (!GroundOverlay) return;
    const mapMoments = USE_FIXED_LOCATION ? [...moments, ...demoMemoryMoments] : moments;
    const displays = mapMoments.filter((moment) => moment.id !== hiddenMomentId).map(toMapMomentDisplay);
    const desired = new Map(displays.map((display) => [display.id, display]));
    tintOverlaysRef.current.forEach(({ layers }, momentId) => {
      if (desired.has(momentId)) return;
      layers.forEach((layer) => removeMapLayer(map, layer));
      tintOverlaysRef.current.delete(momentId);
      tintRequestsRef.current.delete(momentId);
    });
    desired.forEach((display, momentId) => {
      const signature = `${display.groundTintColors.join(',')}|${GROUND_TINT_TEXTURE_RASTER_PX}|${GROUND_TINT_TEXTURE_OPACITY}`;
      if (tintOverlaysRef.current.get(momentId)?.signature === signature || tintRequestsRef.current.get(momentId) === signature) return;
      tintOverlaysRef.current.get(momentId)?.layers.forEach((layer) => removeMapLayer(map, layer));
      tintOverlaysRef.current.delete(momentId);
      tintRequestsRef.current.set(momentId, signature);
      const tintLayers = createGroundTintTextureLayers(momentId, display.groundTintColors);
      void Promise.all(tintLayers.map(async (layer) => {
        const canvas = await rasterizeGroundTintTexture(layer.textureUrl, layer.gradientColors, layer.gradientAngleDegrees, GROUND_TINT_TEXTURE_RASTER_PX, GROUND_TINT_TEXTURE_RASTER_PX, layer);
        const center = offsetCoordinateByMeters(display.latitude, display.longitude, layer.offsetXmeters, layer.offsetYmeters);
        canvas.style.pointerEvents = 'none';
        return new GroundOverlay({ canvas, bounds: createGroundTintBounds(AMap, center.latitude, center.longitude), opacity: GROUND_TINT_TEXTURE_OPACITY, zIndex: 80, zooms: [2, 20] });
      })).then((layers) => {
        if (tintRequestsRef.current.get(momentId) !== signature || !mapRef.current) return;
        layers.forEach((layer) => addMapLayer(mapRef.current, layer));
        tintOverlaysRef.current.set(momentId, { signature, layers });
      }).catch((error: unknown) => console.warn('[map] Watercolor tint generation failed', error));
    });
    if (import.meta.env.DEV && !hasStartedTintVisibilityCheck) {
      hasStartedTintVisibilityCheck = true;
      void verifyGroundTintVisibility();
    }
  }, [hiddenMomentId, isReady, moments, paletteRevision]);

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
    {!isReady && !mapError && <div className="map-loading-placeholder" aria-live="polite"><i /><span>地图正在展开…</span></div>}
    {mapError && <div className="location-banner">地图暂不可用：{mapError}</div>}
    <StickerGenerationDebugToggle />
    <div className="map-zoom-controls" aria-label="地图缩放">
      <button onClick={() => zoomBy(1)} disabled={!isReady} aria-label="放大地图">＋</button>
      <button onClick={() => zoomBy(-1)} disabled={!isReady} aria-label="缩小地图">−</button>
      {currentPosition && <button className="recenter-button" onClick={recenter} disabled={!isReady} aria-label="回到我的位置"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="4" /></svg></button>}
    </div>
  </>;
}

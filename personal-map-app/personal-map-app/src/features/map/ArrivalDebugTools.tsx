import { useCallback, useEffect, useMemo, useState } from 'react';
import { interactions, getInteraction } from '../../interactions/registry';
import { InteractionArrivalStage } from '../record/InteractionArrivalStage';
import { demoMemoryMoments } from './demoMemoryMoments';
import type { InteractionDefinition } from '../../interactions/types';
import type { CaptureDraft, Moment } from '../../models/moment';
import './arrivalDebugTools.css';

type ArrivalPreset = 'left' | 'center' | 'right';
interface DebugArrival { interaction: InteractionDefinition; moment: Moment; target: { x: number; y: number }; preset: ArrivalPreset; runId: number; }
interface ArrivalDebugToolsProps { onConfirmCapture: (draft: CaptureDraft) => void; }

const presetLabels: Record<ArrivalPreset, string> = { left: '左', center: '中', right: '右' };
const presetRatios: Record<ArrivalPreset, { x: number; y: number }> = { left: { x: .24, y: .68 }, center: { x: .5, y: .64 }, right: { x: .76, y: .68 } };

function targetFor(preset: ArrivalPreset) {
  const ratio = presetRatios[preset];
  return { x: Math.round(document.documentElement.clientWidth * ratio.x), y: Math.round(document.documentElement.clientHeight * ratio.y) };
}

function debugMomentFor(type: string): Moment {
  const source = demoMemoryMoments[0];
  return { ...source, id: `debug-preview-${type}`, interactionType: type, isExample: true };
}

function debugDraftFor(type: string): CaptureDraft {
  const source = demoMemoryMoments[0];
  return {
    id: `debug-${type}-${crypto.randomUUID()}`,
    // Use the demo-memory PNG for both images so every Transition gets a real image source.
    photo: source.stickerPhoto,
    stickerPhoto: source.stickerPhoto,
    text: `DEV: ${type}`,
    interactionType: type,
    location: {
      latitude: source.latitude,
      longitude: source.longitude,
      blurredLatitude: source.blurredLatitude,
      blurredLongitude: source.blurredLongitude,
      blurRadiusMeters: source.blurRadiusMeters,
      system: source.coordinateSystem,
      city: source.city,
      district: source.district,
      placeName: source.placeName,
      source: 'fixed',
      placeSource: 'demo-memory-debug',
      capturedAt: new Date().toISOString(),
    },
  };
}

/** Development-only launcher. Primary actions exercise the production RecordFlow. */
export function ArrivalDebugTools({ onConfirmCapture }: ArrivalDebugToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [arrival, setArrival] = useState<DebugArrival>();
  const [lastType, setLastType] = useState<string>();
  const shortcuts = useMemo(() => interactions.slice(0, 9), []);
  const playFullFlow = useCallback((type: string) => {
    setLastType(type);
    onConfirmCapture(debugDraftFor(type));
  }, [onConfirmCapture]);
  const previewArrival = useCallback((type: string, preset: ArrivalPreset = 'center') => {
    const interaction = getInteraction(type);
    setLastType(interaction.type);
    setArrival((current) => ({ interaction, moment: debugMomentFor(interaction.type), target: targetFor(preset), preset, runId: (current?.runId ?? 0) + 1 }));
  }, []);
  const replayPreview = useCallback(() => {
    if (!arrival) return;
    setArrival((current) => current ? { ...current, target: targetFor(current.preset), runId: current.runId + 1 } : current);
  }, [arrival]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'd') { event.preventDefault(); setIsOpen((open) => !open); return; }
      if (key === 'r') { event.preventDefault(); replayPreview(); return; }
      if (/^[1-9]$/.test(key)) {
        const interaction = shortcuts[Number(key) - 1];
        if (interaction) { event.preventDefault(); playFullFlow(interaction.type); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playFullFlow, replayPreview, shortcuts]);

  return <>
    <button type="button" className="arrival-debug-toggle" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label="切换 Arrival 动画调试面板">D</button>
    {isOpen && <aside className="arrival-debug-panel" aria-label="Arrival 动画调试面板">
      <header><div><small>DEV ONLY</small><b>记录流程调试</b></div><button type="button" onClick={() => setIsOpen(false)} aria-label="关闭调试面板">×</button></header>
      <p className="arrival-debug-help">点击条目或数字键：从拍摄完成开始走完整记录流程。D 开关面板 · R 重播“仅到达”预览。</p>
      <div className="arrival-debug-list">{interactions.map((interaction, index) => <section className={`arrival-debug-item${lastType === interaction.type ? ' is-active' : ''}`} key={interaction.type}>
        <button type="button" className="arrival-debug-play" onClick={() => playFullFlow(interaction.type)}><i>{index + 1}</i><span><b>{interaction.name}</b><small>{interaction.type}</small></span><em>{index < 9 ? `${index + 1} = ${interaction.type}` : '完整流程'}</em></button>
        <div className="arrival-debug-controls">
          <button type="button" className="arrival-debug-preview" onClick={() => previewArrival(interaction.type)}>仅到达</button>
          {(Object.keys(presetLabels) as ArrivalPreset[]).map((preset) => <button type="button" key={preset} onClick={() => previewArrival(interaction.type, preset)}>{presetLabels[preset]}</button>)}
          <button type="button" className="arrival-debug-replay" onClick={() => previewArrival(interaction.type, arrival?.interaction.type === interaction.type ? arrival.preset : 'center')}>重播</button>
        </div>
      </section>)}</div>
      {arrival && <footer>仅到达：{arrival.interaction.type} · 落点{presetLabels[arrival.preset]} <button type="button" onClick={replayPreview}>R 重播</button></footer>}
    </aside>}
    {arrival && <InteractionArrivalStage key={arrival.runId} interaction={arrival.interaction} moment={arrival.moment} target={arrival.target} onComplete={() => setArrival(undefined)} />}
  </>;
}

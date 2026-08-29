import { useCallback, useEffect, useMemo, useState } from 'react';
import { interactions, getInteraction } from '../../interactions/registry';
import { InteractionArrivalStage } from '../record/InteractionArrivalStage';
import { demoMemoryMoments } from './demoMemoryMoments';
import type { InteractionDefinition } from '../../interactions/types';
import type { Moment } from '../../models/moment';
import './arrivalDebugTools.css';

type ArrivalPreset = 'left' | 'center' | 'right';
interface DebugArrival { interaction: InteractionDefinition; moment: Moment; target: { x: number; y: number }; preset: ArrivalPreset; runId: number; }
const presetLabels: Record<ArrivalPreset, string> = { left: '左', center: '中', right: '右' };
const presetRatios: Record<ArrivalPreset, { x: number; y: number }> = { left: { x: .24, y: .68 }, center: { x: .5, y: .64 }, right: { x: .76, y: .68 } };

function targetFor(preset: ArrivalPreset) { const ratio = presetRatios[preset]; return { x: Math.round(document.documentElement.clientWidth * ratio.x), y: Math.round(document.documentElement.clientHeight * ratio.y) }; }
function debugMomentFor(type: string): Moment { const source = demoMemoryMoments[0]; return { ...source, id: `arrival-debug-${type}`, interactionType: type, isExample: true }; }

/** Development-only launcher: no product flow state; public Arrival stage owns borders and timing. */
export function ArrivalDebugTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [arrival, setArrival] = useState<DebugArrival>();
  const shortcuts = useMemo(() => interactions.slice(0, 9), []);
  const play = useCallback((type: string, preset: ArrivalPreset = 'center') => {
    const interaction = getInteraction(type);
    setArrival((current) => ({ interaction, moment: debugMomentFor(interaction.type), target: targetFor(preset), preset, runId: (current?.runId ?? 0) + 1 }));
  }, []);
  const replay = useCallback(() => { if (!arrival) return; setArrival((current) => current ? { ...current, target: targetFor(current.preset), runId: current.runId + 1 } : current); }, [arrival]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'd') { event.preventDefault(); setIsOpen((open) => !open); return; }
      if (key === 'r') { event.preventDefault(); replay(); return; }
      if (/^[1-9]$/.test(key)) { const interaction = shortcuts[Number(key) - 1]; if (interaction) { event.preventDefault(); play(interaction.type); } }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [play, replay, shortcuts]);

  return <>
    <button type="button" className="arrival-debug-toggle" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label="切换 Arrival 动画调试面板">D</button>
    {isOpen && <aside className="arrival-debug-panel" aria-label="Arrival 动画调试面板">
      <header><div><small>DEV ONLY</small><b>Arrival 动画</b></div><button type="button" onClick={() => setIsOpen(false)} aria-label="关闭调试面板">×</button></header>
      <p className="arrival-debug-help">D 开关面板 · 数字键播放 · R 重播当前动画</p>
      <div className="arrival-debug-list">{interactions.map((interaction, index) => <section className={`arrival-debug-item${arrival?.interaction.type === interaction.type ? ' is-active' : ''}`} key={interaction.type}>
        <button type="button" className="arrival-debug-play" onClick={() => play(interaction.type)}><i>{index + 1}</i><span><b>{interaction.name}</b><small>{interaction.type}</small></span><em>{index < 9 ? `${index + 1}` : '·'}</em></button>
        <div className="arrival-debug-controls">{(Object.keys(presetLabels) as ArrivalPreset[]).map((preset) => <button type="button" key={preset} onClick={() => play(interaction.type, preset)}>{presetLabels[preset]}</button>)}<button type="button" className="arrival-debug-replay" onClick={() => play(interaction.type, arrival?.interaction.type === interaction.type ? arrival.preset : 'center')}>重播</button></div>
      </section>)}</div>
      {arrival && <footer>当前：{arrival.interaction.type} · 落点{presetLabels[arrival.preset]} <button type="button" onClick={replay}>R 重播</button></footer>}
    </aside>}
    {arrival && <InteractionArrivalStage key={arrival.runId} interaction={arrival.interaction} moment={arrival.moment} target={arrival.target} onComplete={() => setArrival(undefined)} />}
  </>;
}

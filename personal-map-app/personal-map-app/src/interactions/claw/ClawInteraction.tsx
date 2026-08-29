import { useEffect, useState } from 'react';
import { originalImageOf } from '../../models/moment';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import './clawProduct.css';

function ClawTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), 2200); return () => window.clearTimeout(timer); }, []);
  return <section className="claw-transition">
    <img className="claw-transition-photo" src={originalImageOf(draft)} alt="正在被爪子抓住的照片" />
    <div className="claw-transition-rail" /><div className="claw-transition-carriage"><i /><div><b /><b /><b /></div></div>
    <p className="claw-transition-copy">抓住了，正送往地图</p>
    <button className={`claw-transition-continue${ready ? ' claw-transition-ready' : ''}`} disabled={!ready} onClick={onContinue}>送往地图 →</button>
  </section>;
}

function ClawArrival({ stickerUrl }: InteractionArrivalProps) {
  if (!stickerUrl) return null;
  return (
    <div className="claw-stage" aria-hidden="true">
      <div className="claw-machine"><div className="claw-cabinet"><div className="claw-rail" /><div className="claw-carriage"><i className="claw-cable" /><div className="claw-grabber"><i /><i /><i /></div></div></div><i className="claw-base" /></div>
      <img className="claw-sticker" src={stickerUrl} alt="抓娃娃机送达的记忆贴纸" />
    </div>
  );
}

export const clawInteraction: InteractionDefinition = {
  type: 'claw-machine',
  name: '抓取记忆',
  description: '迷你抓娃娃机将这份记忆夹取并送往地图。',
  icon: '⌑',
  accent: '#5e8893',
  arrivalDurationMs: 5200,
  chrome: { transitionTopbarClass: 'claw-topbar', transitionLabel: 'SMART / DEVELOP', arrivalRootClass: 'product-claw claw-map-screen', arrivalPlayingClass: 'claw-playing', arrivalTopbarClass: 'claw-map-topbar', arrivalBackClass: 'claw-map-back', arrivalReplayClass: 'claw-replay', arrivalTitle: '抓娃娃机正在投放', arrivalFooterClass: 'claw-map-footer', arrivalFooter: '被夹住的这一刻，也被好好安放在地图上。' },
  Transition: ClawTransition,
  Arrival: ClawArrival,
};

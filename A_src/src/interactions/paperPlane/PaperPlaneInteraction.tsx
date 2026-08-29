import { useEffect, useRef, useState } from 'react';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import { interactionImageOf, originalImageOf } from '../../models/moment';
import './legacy-paper-plane.css';
import './paperPlaneProduct.css';

function PaperPlaneTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'folding' | 'folded'>('idle');
  const [status, setStatus] = useState('照片已展开，等待折叠');
  const [hint, setHint] = useState('桌上有一张刚刚拍下的照片');
  const timers = useRef<number[]>([]);
  const photo = originalImageOf(draft);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const fold = () => {
    setPhase('folding');
    setHint('照片正在折成一架纸飞机');
    timers.current.push(
      window.setTimeout(() => setStatus('把两个角折向中线'), 260),
      window.setTimeout(() => setStatus('再把两侧收成机翼'), 980),
      window.setTimeout(() => setStatus('沿中线对折，压出折痕'), 1780),
      window.setTimeout(() => {
        setPhase('folded');
        setStatus('纸飞机已经准备出发');
        setHint('让风把照片送到地图上');
      }, 2700),
    );
  };

  return (
    <section className={`product-plane-transition plane-camera-screen ${phase === 'folding' ? 'folding' : ''} ${phase === 'folded' ? 'folded' : ''}`}>
      <div className="plane-studio">
        <div className="desk-paper desk-paper-one"><i /><i /><i /></div>
        <div className="desk-paper desk-paper-two"><span>NOTES<br />FROM TODAY</span></div>
        <div className="desk-paper desk-paper-three" />
        <div className="fold-stage">
          <div className="fold-sheet">
            <div className="photo-paper-face"><img src={photo} alt="印在纸上的教堂照片" /><span>PHOTO / 07</span></div>
            <div className="paper-fold corner-fold corner-fold-left"><img src={photo} alt="" /><b /></div>
            <div className="paper-fold corner-fold corner-fold-right"><img src={photo} alt="" /><b /></div>
            <div className="paper-fold side-fold side-fold-left"><img src={photo} alt="" /><b /></div>
            <div className="paper-fold side-fold side-fold-right"><img src={photo} alt="" /><b /></div>
            <i className="paper-crease crease-left" /><i className="paper-crease crease-right" /><i className="paper-crease crease-center" />
          </div>
          <div className="finished-plane"><div className="plane-white-shell" /><img src={photo} alt="" /><i /><b /></div>
          <div className="fold-status"><span>PHOTO / 07</span><b>{status}</b></div>
        </div>
      </div>
      <div className="plane-controls">
        <p>{hint}</p>
        <button className={`fold-button ${phase !== 'idle' ? 'is-hidden' : ''}`} onClick={fold}><i>◇</i><span>折成纸飞机</span></button>
        <button className={`plane-send ${phase !== 'folded' ? 'is-hidden' : ''}`} onClick={onContinue}>飞往地图 <span>→</span></button>
      </div>
    </section>
  );
}

function PaperPlaneArrival({ moment, target }: InteractionArrivalProps & { target?: { x: number; y: number } }) {
  const photo = interactionImageOf(moment);
  return (
    <div className="plane-map-world">
        <div className="flight-trail" aria-hidden="true">
          {target && <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M -8 18 C 17 4 72 4 ${target.x / window.innerWidth * 100} ${target.y / window.innerHeight * 100}`} />
          </svg>}
        </div>
        <div className="map-paper-plane"><div className="plane-white-shell" /><img src={photo} alt="由照片折成的纸飞机" /><i /><b /></div>
        <div className="plane-landing-shadow" />
        <div className="plane-sparkles"><i /><i /><i /><i /></div>
        <p className="plane-arrival-copy">照片落下，留下被看见的主体</p>
    </div>
  );
}

export const paperPlaneInteraction: InteractionDefinition = {
  type: 'paper-plane',
  name: '纸飞机投递',
  description: '把此刻折起来，让风送进地图。',
  icon: '◇',
  accent: '#5d7f84',
  arrivalDurationMs: 5200,
  chrome: {
    transitionTopbarClass: 'plane-topbar', transitionLabel: 'FOLD / A MEMORY',
    arrivalRootClass: 'product-plane-arrival plane-map-screen', arrivalPlayingClass: 'plane-arriving',
    arrivalTopbarClass: 'plane-map-topbar', arrivalBackClass: 'plane-map-back', arrivalReplayClass: 'plane-replay',
    arrivalTitle: '一架纸飞机正在靠近', arrivalFooterClass: 'plane-map-footer', arrivalFooter: '折痕留在风里，画面留在地图上',
  },
  Transition: PaperPlaneTransition,
  Arrival: PaperPlaneArrival,
};

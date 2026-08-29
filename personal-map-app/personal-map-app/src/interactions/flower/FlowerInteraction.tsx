import { useEffect, useRef, useState } from 'react';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import { interactionImageOf, originalImageOf } from '../../models/moment';
import './flowerProduct.css';

function FlowerTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'closing' | 'ready'>('idle');
  const [hint, setHint] = useState('让景色落在花心里');
  const timer = useRef<number | undefined>(undefined);
  const photo = originalImageOf(draft);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const closeFlower = () => {
    setPhase('closing');
    setHint('花瓣正在把景色轻轻合起来');
    timer.current = window.setTimeout(() => { setPhase('ready'); setHint('这一刻已经收进花苞'); }, 2100);
  };
  return (
    <section className={`product-flower flower-camera-screen ${phase === 'closing' ? 'closing-flower' : ''} ${phase === 'ready' ? 'bud-ready' : ''}`}>
      <div className="flower-garden"><div className="leaf-shadow leaf-shadow-a" /><div className="leaf-shadow leaf-shadow-b" /><div className="flower-frame">{Array.from({ length: 8 }, (_, index) => <div className={`petal p${index + 1}`} key={index} />)}<div className="flower-photo"><img src={photo} alt="花朵取景框里的照片" /></div><div className="flower-heart">✦</div></div><div className="closed-bud"><img src={photo} alt="由照片闭合成的花苞" /><i /><i /><span /></div><div className="flower-readout"><span>FLOWER FRAME / 12</span><b>把这一刻开成一朵花</b></div></div>
      <div className="flower-controls"><p>{hint}</p><button className={`flower-button ${phase !== 'idle' ? 'is-hidden' : ''}`} onClick={closeFlower}><i>✿</i><span>合成花苞</span></button><button className={`flower-send ${phase !== 'ready' ? 'is-hidden' : ''}`} onClick={onContinue}>种进地图 <span>→</span></button></div>
    </section>
  );
}

function FlowerArrival({ moment, stickerUrl }: InteractionArrivalProps) {
  const photo = stickerUrl ?? interactionImageOf(moment);
  return (
    <div className="flower-map-world"><div className="flower-river" /><div className="flower-road flower-road-main" /><div className="flower-road flower-road-cross" /><span className="flower-label flower-label-one">北园</span><span className="flower-label flower-label-two">花径</span><div className="falling-bud"><i /><i /><span /></div><div className="planting-ring" /><div className="map-flower-memory"><div className="memory-stem" /><div className="memory-leaf leaf-left" /><div className="memory-leaf leaf-right" /><div className="memory-bloom"><img src={photo} alt="种在地图上的照片花朵" /><i /></div></div><div className="flower-sparkles"><i /><i /><i /><i /></div><p className="flower-arrival-copy">花苞扎根，重新开出那一刻</p></div>
  );
}

export const flowerInteraction: InteractionDefinition = {
  type: 'flower-bud', name: '花苞收藏', description: '花瓣合拢成花苞，再种进地图。', icon: '✿', accent: '#8d6675', arrivalDurationMs: 3600,
  chrome: { transitionTopbarClass: 'flower-topbar', transitionLabel: 'BLOOM / CAPTURE', arrivalRootClass: 'product-flower flower-map-screen', arrivalPlayingClass: 'flower-planting', arrivalTopbarClass: 'flower-map-topbar', arrivalBackClass: 'flower-map-back', arrivalReplayClass: 'flower-replay', arrivalTitle: '一枚花苞正在落下', arrivalFooterClass: 'flower-map-footer', arrivalFooter: '地图上多了一朵，只属于今天的花' },
  Transition: FlowerTransition, Arrival: FlowerArrival,
};

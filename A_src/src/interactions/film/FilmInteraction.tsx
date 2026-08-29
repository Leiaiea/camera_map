import { useEffect, useRef, useState } from 'react';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import { interactionImageOf, originalImageOf } from '../../models/moment';
import './filmProduct.css';

const Frames = ({ photo, map = false }: { photo: string; map?: boolean }) => <>{Array.from({ length: 3 }, (_, index) => <div className={map ? 'map-film-frame' : 'film-frame'} key={index}><img src={photo} alt={map ? '在地图展开的照片胶片' : '胶片中的照片'} /></div>)}</>;

function FilmTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'shooting' | 'ready'>('idle');
  const [hint, setHint] = useState('复古相机已经对准这一刻');
  const timer = useRef<number | undefined>(undefined);
  const photo = originalImageOf(draft);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const shoot = () => {
    setPhase('shooting'); setHint('胶片正在从相机里显影');
    timer.current = window.setTimeout(() => { setPhase('ready'); setHint('胶片已经卷好，准备出发'); }, 2500);
  };
  return (
    <section className={`product-film film-camera-screen ${phase === 'shooting' ? 'film-shooting' : ''} ${phase === 'ready' ? 'film-ready' : ''}`}>
      <div className="film-studio"><div className="retro-camera"><div className="camera-body"><i /><b /><span>PERSONAL<br />CAMERA</span><em /></div><div className="camera-lens"><i /><b /></div><div className="camera-flash" /><div className="film-slot" /></div><div className="developing-film"><i /><Frames photo={photo} /></div><div className="film-roll"><i /><b /><span /></div><div className="film-caption"><span>FRAME / 14</span><b>让光留在一格胶片里</b></div></div>
      <div className="film-controls"><p>{hint}</p><button className={`film-button ${phase !== 'idle' ? 'is-hidden' : ''}`} onClick={shoot}><i>●</i><span>按下快门</span></button><button className={`film-send ${phase !== 'ready' ? 'is-hidden' : ''}`} onClick={onContinue}>滚向地图 <span>→</span></button></div>
    </section>
  );
}

function FilmArrival({ moment }: InteractionArrivalProps) {
  const photo = interactionImageOf(moment);
  return (
    <div className="film-map-world"><div className="film-river" /><div className="film-road film-road-main" /><div className="film-road film-road-cross" /><span className="film-label film-label-one">北园</span><span className="film-label film-label-two">广场</span><div className="rolling-film"><i /><b /><span /></div><div className="film-track" /><div className="unrolled-film"><i /><Frames photo={photo} map /></div><p className="film-arrival-copy">胶片展开，光把照片留在这里</p></div>
  );
}

export const filmInteraction: InteractionDefinition = {
  type: 'retro-film', name: '胶片滚映', description: '复古相机显影胶片，滚到地图展开。', icon: '●', accent: '#6c5748', arrivalDurationMs: 4400,
  chrome: { transitionTopbarClass: 'film-topbar', transitionLabel: 'ANALOG / FRAME', arrivalRootClass: 'product-film film-map-screen', arrivalPlayingClass: 'film-rolling', arrivalTopbarClass: 'film-map-topbar', arrivalBackClass: 'film-map-back', arrivalReplayClass: 'film-replay', arrivalTitle: '一卷胶片正在滚来', arrivalFooterClass: 'film-map-footer', arrivalFooter: '城市像一台暗房，替你显影每次经过' },
  Transition: FilmTransition, Arrival: FilmArrival,
};

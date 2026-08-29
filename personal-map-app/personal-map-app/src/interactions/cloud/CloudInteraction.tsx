import { useEffect, useState } from 'react';
import { originalImageOf } from '../../models/moment';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import './cloudProduct.css';

function CloudTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), 2100); return () => window.clearTimeout(timer); }, []);
  return <section className="cloud-transition"><div className="cloud-photo"><img src={originalImageOf(draft)} alt="正在被彩云收走的照片" /></div><div className="cloud-take"><i /><i /><i /><b /><b /><b /></div><p className="cloud-copy">彩云正在收集这幅画面的颜色</p><button className={`cloud-continue${ready ? ' cloud-ready' : ''}`} disabled={!ready} onClick={onContinue}>送往地图 →</button></section>;
}
function CloudArrival({ stickerUrl }: InteractionArrivalProps) {
  if (!stickerUrl) return null;
  return <div className="cloud-stage" aria-hidden="true"><div className="cloud-puddle" /><div className="cloud-arrival"><i /><i /><i /><b /><b /><b /></div><div className="cloud-rain">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div><div className="cloud-wash" /><img className="cloud-sticker" src={stickerUrl} alt="彩云送达的记忆贴纸" /></div>;
}
export const cloudInteraction: InteractionDefinition = { type: 'cloud-rain', name: '彩云下雨', description: '把画面的颜色装进彩云，下一场只属于它的雨。', icon: '☁', accent: '#7e83bc', arrivalDurationMs: 4200, chrome: { transitionTopbarClass: 'cloud-topbar', transitionLabel: 'COLOR / CLOUD', arrivalRootClass: 'product-cloud cloud-map-screen', arrivalPlayingClass: 'cloud-playing', arrivalTopbarClass: 'cloud-map-topbar', arrivalBackClass: 'cloud-map-back', arrivalReplayClass: 'cloud-replay', arrivalTitle: '一朵彩云正在降雨', arrivalFooterClass: 'cloud-map-footer', arrivalFooter: '颜色落下，记忆在地图上留下水彩的痕迹。' }, Transition: CloudTransition, Arrival: CloudArrival };

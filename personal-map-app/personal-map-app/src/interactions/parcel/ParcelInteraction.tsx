import { useEffect, useState } from 'react';
import { originalImageOf } from '../../models/moment';
import type { InteractionArrivalProps, InteractionDefinition, InteractionTransitionProps } from '../types';
import './parcelProduct.css';

function ParcelTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), 2100); return () => window.clearTimeout(timer); }, []);
  return <section className="parcel-transition">
    <img className="parcel-transition-photo" src={originalImageOf(draft)} alt="正在装箱的照片" />
    <div className="parcel-transition-box"><i /><i /><b /><b /></div>
    <p className="parcel-transition-copy">正在把这一刻仔细装箱</p>
    <button className={`parcel-transition-continue${ready ? ' parcel-transition-ready' : ''}`} disabled={!ready} onClick={onContinue}>送往地图 →</button>
  </section>;
}

function ParcelArrival({ stickerUrl }: InteractionArrivalProps) {
  if (!stickerUrl) return null;
  return (
    <div className="parcel-stage" aria-hidden="true">
      <div className="parcel-shadow" />
      <img className="parcel-pack-photo" src={stickerUrl} alt="" />
      <div className="parcel-cargo">
        <div className="parcel-box">
          <span className="parcel-tape" />
          <span className="parcel-label">TO<br />MY MAP</span>
          <span className="parcel-lid parcel-lid-left" />
          <span className="parcel-lid parcel-lid-right" />
        </div>
      </div>
      <div className="parcel-parachute"><i /><i /><i /><b /><b /><b /></div>
      <img className="parcel-sticker" src={stickerUrl} alt="落到地图上的记忆贴纸" />
    </div>
  );
}

export const parcelInteraction: InteractionDefinition = {
  type: 'parcel-drop',
  name: '空投包裹',
  description: '先把记忆装箱，再由降落伞投递到地图。',
  icon: '▣',
  accent: '#af784a',
  arrivalDurationMs: 5000,
  chrome: {
    transitionTopbarClass: 'parcel-topbar', transitionLabel: 'SMART / DEVELOP',
    arrivalRootClass: 'product-parcel parcel-map-screen', arrivalPlayingClass: 'parcel-playing',
    arrivalTopbarClass: 'parcel-map-topbar', arrivalBackClass: 'parcel-map-back', arrivalReplayClass: 'parcel-replay',
    arrivalTitle: '一份包裹正在投递', arrivalFooterClass: 'parcel-map-footer', arrivalFooter: '一段记忆，已经抵达它在地图中的位置。',
  },
  Transition: ParcelTransition,
  Arrival: ParcelArrival,
};

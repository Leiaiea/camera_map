import type { InteractionArrivalProps, InteractionDefinition } from '../types';
import { SimpleDevelopTransition } from '../shared/SimpleDevelopTransition';
import './parcelProduct.css';

function ParcelArrival({ stickerUrl }: InteractionArrivalProps) {
  if (!stickerUrl) return null;
  return (
    <div className="parcel-stage" aria-hidden="true">
      <div className="parcel-shadow" />
      <div className="parcel-parachute"><i /><i /><i /><b /><b /><b /></div>
      <div className="parcel-cargo">
        <div className="parcel-box"><span className="parcel-tape" /><span className="parcel-label">TO<br />MY MAP</span><span className="parcel-lid parcel-lid-left" /><span className="parcel-lid parcel-lid-right" /></div>
        <img className="parcel-sticker" src={stickerUrl} alt="落到地图上的记忆贴纸" />
      </div>
    </div>
  );
}

export const parcelInteraction: InteractionDefinition = {
  type: 'parcel-drop',
  name: '空投包裹',
  description: '让一只降落伞把记忆包裹轻轻投递到地图上。',
  icon: '▣',
  accent: '#af784a',
  arrivalDurationMs: 3500,
  chrome: { transitionTopbarClass: 'parcel-topbar', transitionLabel: 'SMART / DEVELOP', arrivalRootClass: 'product-parcel parcel-map-screen', arrivalPlayingClass: 'parcel-playing', arrivalTopbarClass: 'parcel-map-topbar', arrivalBackClass: 'parcel-map-back', arrivalReplayClass: 'parcel-replay', arrivalTitle: '一份包裹正在投递', arrivalFooterClass: 'parcel-map-footer', arrivalFooter: '一段记忆，已经抵达它在地图上的位置。' },
  Transition: SimpleDevelopTransition,
  Arrival: ParcelArrival,
};

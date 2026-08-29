import type { InteractionArrivalProps, InteractionDefinition } from '../types';
import { SimpleDevelopTransition } from '../shared/SimpleDevelopTransition';
import './clawProduct.css';

function ClawArrival({ stickerUrl }: InteractionArrivalProps) {
  if (!stickerUrl) return null;
  return (
    <div className="claw-stage" aria-hidden="true">
      <div className="claw-machine"><div className="claw-rail" /><div className="claw-carriage"><i className="claw-cable" /><div className="claw-grabber"><i /><i /><i /></div></div></div>
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
  arrivalDurationMs: 4500,
  chrome: { transitionTopbarClass: 'claw-topbar', transitionLabel: 'SMART / DEVELOP', arrivalRootClass: 'product-claw claw-map-screen', arrivalPlayingClass: 'claw-playing', arrivalTopbarClass: 'claw-map-topbar', arrivalBackClass: 'claw-map-back', arrivalReplayClass: 'claw-replay', arrivalTitle: '抓娃娃机正在投放', arrivalFooterClass: 'claw-map-footer', arrivalFooter: '被夹住的这一刻，也被好好安放在地图上。' },
  Transition: SimpleDevelopTransition,
  Arrival: ClawArrival,
};

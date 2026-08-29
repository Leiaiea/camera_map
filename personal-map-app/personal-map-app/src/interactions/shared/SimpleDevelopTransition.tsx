import { useEffect, useState } from 'react';
import { originalImageOf } from '../../models/moment';
import type { InteractionTransitionProps } from '../types';
import './simpleDevelopTransition.css';

const developMessages = ['正在分析画面…', '正在分离主体…', '生成贴纸…'];

/** Shared transition only: it visualizes the captured image and delegates flow control to its parent. */
export function SimpleDevelopTransition({ draft, onContinue }: InteractionTransitionProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const photo = originalImageOf(draft);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % developMessages.length);
    }, 760);
    const readyTimer = window.setTimeout(() => setIsReady(true), 2500);
    return () => {
      window.clearInterval(messageTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  return (
    <section className="shared-develop-transition" aria-label="智能显影中">
      <div className="shared-develop-glow shared-develop-glow-a" />
      <div className="shared-develop-glow shared-develop-glow-b" />
      <div className="shared-develop-card">
        <img src={photo} alt="正在智能显影的照片" />
        <div className="shared-develop-beam" aria-hidden="true" />
        <div className="shared-develop-scan" aria-hidden="true" />
        <div className="shared-develop-frame" aria-hidden="true" />
      </div>
      <p className="shared-develop-message" aria-live="polite">{developMessages[messageIndex]}</p>
      <button className={`shared-develop-continue${isReady ? ' is-ready' : ''}`} onClick={onContinue} disabled={!isReady}>
        送往地图 <span>→</span>
      </button>
    </section>
  );
}

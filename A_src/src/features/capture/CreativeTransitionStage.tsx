import type { CSSProperties } from 'react';

export interface CreativeTransitionPayload {
  recordId: string;
  transitionId: string;
  cutoutPath: string;
  subjectBounds: { x: number; y: number; width: number; height: number };
  dominantColor: string;
  targetLatGcj02: number;
  targetLngGcj02: number;
}

interface CreativeTransitionStageProps { payload: CreativeTransitionPayload; photo?: string; onComplete: () => void; onFailed?: () => void; }

export function CreativeTransitionStage({ payload, photo, onComplete, onFailed }: CreativeTransitionStageProps) {
  return <section className="creative-transition-stage" data-transition-id={payload.transitionId} style={{ '--transition-accent': payload.dominantColor } as CSSProperties} aria-label="送走这一刻" onAnimationEnd={(event) => { if (event.animationName === 'creative-transition-out') onComplete(); }}>
    <div className="creative-transition-hole" />
    {photo ? <img className="creative-transition-subject" src={photo} alt="正在送走的这一刻" /> : <div className="creative-transition-placeholder" />}
    <p>这一刻正在去往它的地方</p>
    {onFailed && <button className="sr-only" type="button" onClick={onFailed}>使用默认过渡</button>}
  </section>;
}

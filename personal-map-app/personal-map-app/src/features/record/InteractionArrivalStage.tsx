import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { interactionImageOf, type Moment } from '../../models/moment';
import type { InteractionArrivalProps, InteractionDefinition } from '../../interactions/types';
import { getBorderedStickerUrl } from '../../services/media/stickerBorder';

interface InteractionArrivalStageProps {
  interaction: InteractionDefinition;
  moment: Moment;
  target?: { x: number; y: number };
  onComplete: () => void;
}

export function InteractionArrivalStage({ interaction, moment, target, onComplete }: InteractionArrivalStageProps) {
  const Arrival = interaction.Arrival as ComponentType<InteractionArrivalProps & { target?: { x: number; y: number } }>;
  const [stickerUrl, setStickerUrl] = useState<string>();
  const sourceUrl = interactionImageOf(moment);
  useEffect(() => {
    let cancelled = false;
    setStickerUrl(undefined);
    void getBorderedStickerUrl(moment.id, sourceUrl)
      .then((url) => { if (!cancelled) setStickerUrl(url); })
      .catch((error: unknown) => console.warn('[arrival] 贴纸边框生成失败，已阻止裸图动画。', { momentId: moment.id, error }));
    return () => { cancelled = true; };
  }, [moment.id, sourceUrl]);
  const isTargetReady = Boolean(target && stickerUrl);

  useEffect(() => {
    if (!isTargetReady) return;
    const timer = window.setTimeout(onComplete, interaction.arrivalDurationMs);
    return () => window.clearTimeout(timer);
  }, [interaction.arrivalDurationMs, isTargetReady, onComplete]);

  return (
    <section
      className={`${interaction.chrome.arrivalRootClass} ${isTargetReady ? interaction.chrome.arrivalPlayingClass : ''}`}
      style={target ? { '--arrival-target-x': `${target.x}px`, '--arrival-target-y': `${target.y}px` } as CSSProperties : undefined}
      aria-label={`${interaction.name}到达地图`}
    >
      {stickerUrl && <Arrival moment={moment} stickerUrl={stickerUrl} target={target} />}
    </section>
  );
}

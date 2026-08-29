import { useEffect, type ComponentType, type CSSProperties } from 'react';
import type { Moment } from '../../models/moment';
import type { InteractionArrivalProps, InteractionDefinition } from '../../interactions/types';

interface InteractionArrivalStageProps {
  interaction: InteractionDefinition;
  moment: Moment;
  target?: { x: number; y: number };
  onComplete: () => void;
}

export function InteractionArrivalStage({ interaction, moment, target, onComplete }: InteractionArrivalStageProps) {
  const Arrival = interaction.Arrival as ComponentType<InteractionArrivalProps & { target?: { x: number; y: number } }>;
  const isTargetReady = Boolean(target);

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
      <Arrival moment={moment} target={target} />
    </section>
  );
}

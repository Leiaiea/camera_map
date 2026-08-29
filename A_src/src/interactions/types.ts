import type { ComponentType } from 'react';
import type { CaptureDraft, Moment } from '../models/moment';

export interface InteractionTransitionProps {
  draft: CaptureDraft;
  onContinue: () => void;
}

export interface InteractionArrivalProps {
  moment: Moment;
}

export interface InteractionChrome {
  transitionTopbarClass: string;
  transitionLabel: string;
  arrivalRootClass: string;
  arrivalPlayingClass: string;
  arrivalTopbarClass: string;
  arrivalBackClass: string;
  arrivalReplayClass: string;
  arrivalTitle: string;
  arrivalFooterClass: string;
  arrivalFooter: string;
}

export interface InteractionDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  arrivalDurationMs: number;
  chrome: InteractionChrome;
  Transition: ComponentType<InteractionTransitionProps>;
  Arrival: ComponentType<InteractionArrivalProps>;
}

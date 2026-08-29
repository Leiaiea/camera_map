import type { InteractionDefinition } from './types';
import { paperPlaneInteraction } from './paperPlane/PaperPlaneInteraction';
import { flowerInteraction } from './flower/FlowerInteraction';
import { filmInteraction } from './film/FilmInteraction';
import { parcelInteraction } from './parcel/ParcelInteraction';
import { clawInteraction } from './claw/ClawInteraction';

const interactions: InteractionDefinition[] = [paperPlaneInteraction, flowerInteraction, filmInteraction, parcelInteraction, clawInteraction];

export function getInteraction(type: string): InteractionDefinition {
  return interactions.find((interaction) => interaction.type === type) ?? interactions[0];
}

export function getRandomInteractionType(): string {
  return interactions[Math.floor(Math.random() * interactions.length)].type;
}

export { interactions };

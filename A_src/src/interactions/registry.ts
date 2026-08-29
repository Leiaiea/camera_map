import type { InteractionDefinition } from './types';
import { paperPlaneInteraction } from './paperPlane/PaperPlaneInteraction';
import { flowerInteraction } from './flower/FlowerInteraction';
import { filmInteraction } from './film/FilmInteraction';

const interactions: InteractionDefinition[] = [paperPlaneInteraction, flowerInteraction, filmInteraction];

export function getInteraction(type: string): InteractionDefinition {
  return interactions.find((interaction) => interaction.type === type) ?? interactions[0];
}

export { interactions };

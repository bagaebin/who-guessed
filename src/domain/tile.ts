import { AppearanceCore } from './appearance';

export type CharacterTile = {
  id: string;
  core: AppearanceCore;
  image: string;
  isEliminated: boolean;
};

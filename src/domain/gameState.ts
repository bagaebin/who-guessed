import { AppearanceCore } from './appearance';
import { CharacterTile } from './tile';

export type GamePhase = 'early' | 'mid' | 'late';

export type GameState = {
  tiles: CharacterTile[];
  playerProfile?: AppearanceCore;
  round: number;
  phase: GamePhase;
};

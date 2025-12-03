import { GamePhase } from './gameState';
import { CharacterTile } from './tile';

export function getPhaseByRemaining(remaining: number): GamePhase {
  if (remaining <= 3) return 'late';
  if (remaining <= 8) return 'mid';
  return 'early';
}

export function getEliminationRange(phase: GamePhase): { min: number; max: number } {
  if (phase === 'early') return { min: 3, max: 4 };
  if (phase === 'mid') return { min: 2, max: 3 };
  return { min: 1, max: 2 };
}

export function getRemainingTiles(tiles: CharacterTile[]): CharacterTile[] {
  return tiles.filter((t) => !t.isEliminated);
}

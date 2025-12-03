import { CharacterTile, GamePhase } from '../types/appearance';
import { eliminationRangeForPhase } from './phase';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * LLM이 반환한 제거 ID를
 * 1) 현재 보드에 존재하는 ID로 한정하고
 * 2) 단계별 최소/최대 제거 개수에 맞추며
 * 3) 최소 1장 이상 남도록 보정한다.
 */
export function normalizeEliminations(
  candidateIds: string[],
  phase: GamePhase,
  remainingTiles: CharacterTile[]
): string[] {
  if (remainingTiles.length <= 1) return [];

  const allowedIds = new Set(remainingTiles.map((tile) => tile.id));
  const filtered = candidateIds.filter((id) => allowedIds.has(id));
  const range = eliminationRangeForPhase(phase);

  const maxAllowed = Math.min(range.max, Math.max(0, remainingTiles.length - 1));
  const minAllowed = Math.min(range.min, maxAllowed);

  let result = filtered.slice(0, maxAllowed);
  const missing = Math.max(minAllowed - result.length, 0);

  if (missing > 0) {
    const pool = shuffle(
      remainingTiles
        .map((tile) => tile.id)
        .filter((id) => !result.includes(id))
    );

    result = result.concat(pool.slice(0, missing));
  }

  return result;
}

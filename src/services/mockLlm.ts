import { CharacterTile } from '../domain/tile';
import { LlmResponse } from './llmSchema';
import { getEliminationRange, getPhaseByRemaining } from '../domain/phase';

export function mockInferPlayerAppearance(playerText: string, remainingTiles: CharacterTile[]): LlmResponse {
  const phase = getPhaseByRemaining(remainingTiles.length);
  const { min, max } = getEliminationRange(phase);
  const eliminationTarget = Math.min(
    Math.max(min, Math.ceil(remainingTiles.length * 0.25)),
    max,
    remainingTiles.length - 1
  );

  const eliminatedIds = remainingTiles
    .filter((_, idx) => idx < eliminationTarget)
    .map((tile) => tile.id);

  const fallbackProfile = remainingTiles[0]?.core ?? {
    ageGroup: 'adult',
    skinTone: 'medium',
    bodyShape: 'average',
    skinCondition: 'clear',
    hairLength: 'short',
    hairStyle: 'straight',
    hairColor: 'dark_brown',
    glasses: 'none',
    facialHair: 'none',
    faceShape: 'oval',
    expressionBaseline: 'neutral',
    styleVibe: 'casual',
    makeupLevel: 'none',
    accessoriesPresence: 'none',
  };

  const reasoning = Object.fromEntries(
    eliminatedIds.map((id) => [id, `${playerText.slice(0, 30)}... 와 다른 핵심 특징`])
  );

  return {
    profile: fallbackProfile,
    eliminatedIds,
    reasoning,
  };
}

// phase를 계산하는 유틸 함수들
import { EliminationPhase, GamePhase, GENERATION_PHASES, GenerationPhase } from '../types/appearance';

export function isGenerationPhase(phase: GamePhase): phase is GenerationPhase {
  return GENERATION_PHASES.includes(phase as GenerationPhase);
}

export function getPhaseFromRemaining(remaining: number, initial: number): EliminationPhase {
  const earlyThreshold = Math.max(6, Math.ceil(initial * 0.6));
  const midThreshold = Math.max(3, Math.ceil(initial * 0.3));

  if (remaining > earlyThreshold) return 'early';
  if (remaining > midThreshold) return 'mid';
  return 'late';
}

export function eliminationRangeForPhase(phase: EliminationPhase): { min: number; max: number } {
  switch (phase) {
    case 'early':
      return { min: 3, max: 4 };
    case 'mid':
      return { min: 2, max: 3 };
    case 'late':
      return { min: 1, max: 2 };
  }
}

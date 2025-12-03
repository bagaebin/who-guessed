// phase를 계산하는 유틸 함수들
import { GamePhase } from '../types/appearance';

export function getPhaseFromRemaining(remaining: number, initial: number): GamePhase {
  const earlyThreshold = Math.max(10, Math.ceil(initial * 0.5));
  const midThreshold = Math.max(4, Math.ceil(initial * 0.25));

  if (remaining > earlyThreshold) return 'early';
  if (remaining > midThreshold) return 'mid';
  return 'late';
}

export function eliminationRangeForPhase(phase: GamePhase): { min: number; max: number } {
  switch (phase) {
    case 'early':
      return { min: 3, max: 4 };
    case 'mid':
      return { min: 2, max: 3 };
    case 'late':
      return { min: 1, max: 2 };
  }
}

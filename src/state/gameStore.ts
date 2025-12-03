import { create } from 'zustand';
import { AppearanceCore } from '../domain/appearance';
import { GamePhase } from '../domain/gameState';
import { CharacterTile } from '../domain/tile';
import { initialTiles } from '../data/tiles';
import { getPhaseByRemaining, getRemainingTiles } from '../domain/phase';
import { inferPlayerAppearance } from '../services/llmClient';
import { LlmResponse } from '../services/llmSchema';

type GameStore = {
  tiles: CharacterTile[];
  playerProfile?: AppearanceCore;
  round: number;
  phase: GamePhase;
  isLoading: boolean;
  error?: string;
  lastReasoning?: Record<string, string>;
  submitTurn: (text: string) => Promise<void>;
  applyLlmResponse: (result: LlmResponse) => void;
};

const initialState: Pick<GameStore, 'tiles' | 'playerProfile' | 'round' | 'phase' | 'isLoading'> = {
  tiles: initialTiles,
  playerProfile: undefined,
  round: 1,
  phase: getPhaseByRemaining(initialTiles.length),
  isLoading: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  submitTurn: async (text: string) => {
    set({ isLoading: true, error: undefined });
    const remaining = getRemainingTiles(get().tiles);
    try {
      const result = await inferPlayerAppearance(text, remaining);
      get().applyLlmResponse(result);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
    } finally {
      set({ isLoading: false });
    }
  },
  applyLlmResponse: (result: LlmResponse) => {
    set((state) => {
      const updatedTiles = state.tiles.map((tile) =>
        result.eliminatedIds.includes(tile.id)
          ? { ...tile, isEliminated: true }
          : tile
      );
      const remainingAfter = getRemainingTiles(updatedTiles);
      const nextPhase = getPhaseByRemaining(remainingAfter.length);
      const nextRound = state.round + 1;
      return {
        tiles: updatedTiles,
        playerProfile: state.playerProfile ?? result.profile,
        round: nextRound,
        phase: nextPhase,
        lastReasoning: result.reasoning,
      };
    });
  },
}));

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { inferPlayerAppearance } from '../api/appearanceClient';
import { initialTiles } from '../data/tiles';
import { normalizeEliminations } from '../utils/elimination';
import { getPhaseFromRemaining } from '../utils/phase';
import { CharacterTile, GameState } from '../types/appearance';

const INITIAL_COUNT = initialTiles.length;

function cloneTiles(): CharacterTile[] {
  return initialTiles.map((tile) => ({ ...tile, core: { ...tile.core } }));
}

export const useGameStore = create<GameState & {
  submitPlayerText: (text: string) => Promise<void>;
  reset: () => void;
}>(
  immer((set, get) => ({
    tiles: cloneTiles(),
    playerProfile: undefined,
    round: 1,
    phase: 'early',
    isLoading: false,
    lastReasoning: undefined,
    statusMessage: undefined,
    lastEliminatedIds: [],

    reset: () => {
      set({
        tiles: cloneTiles(),
        playerProfile: undefined,
        round: 1,
        phase: 'early',
        isLoading: false,
        lastReasoning: undefined,
        statusMessage: undefined,
        lastEliminatedIds: []
      });
    },

    submitPlayerText: async (text: string) => {
      const state = get();
      const remaining = state.tiles.filter((t) => !t.isEliminated);
      if (remaining.length <= 1 || state.isLoading) return;

      set({ isLoading: true, statusMessage: undefined });
      try {
        const result = await inferPlayerAppearance(text, remaining, state.phase);
        const normalizedIds = normalizeEliminations(result.eliminatedIds, state.phase, remaining);
        set((draft) => {
          if (!draft.playerProfile) {
            draft.playerProfile = result.profile;
          }

          draft.tiles = draft.tiles.map((tile) =>
            normalizedIds.includes(tile.id) ? { ...tile, isEliminated: true } : tile
          );
          draft.lastReasoning = result.reasoning;
          draft.lastEliminatedIds = normalizedIds;
        });

        set((draft) => {
          const remainingTiles = draft.tiles.filter((t) => !t.isEliminated).length;
          draft.round += 1;
          draft.phase = getPhaseFromRemaining(remainingTiles, INITIAL_COUNT);
          if (remainingTiles <= 1) {
            draft.statusMessage = '예측된 닮은꼴이 결정되었습니다!';
          }
        });
      } catch (error) {
        set({ statusMessage: 'LLM 응답 처리 중 문제가 발생했습니다.' });
      } finally {
        set({ isLoading: false });
      }
    }
  }))
);

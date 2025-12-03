import { create } from 'zustand';
import { initialTiles } from '../data/tiles';
import { getPhaseByRemaining, getRemainingTiles } from '../domain/phase';
import { inferPlayerAppearance } from '../services/llmClient';
const initialState = {
    tiles: initialTiles,
    playerProfile: undefined,
    round: 1,
    phase: getPhaseByRemaining(initialTiles.length),
    isLoading: false,
};
export const useGameStore = create((set, get) => ({
    ...initialState,
    submitTurn: async (text) => {
        set({ isLoading: true, error: undefined });
        const remaining = getRemainingTiles(get().tiles);
        try {
            const result = await inferPlayerAppearance(text, remaining);
            get().applyLlmResponse(result);
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
        }
        finally {
            set({ isLoading: false });
        }
    },
    applyLlmResponse: (result) => {
        set((state) => {
            const updatedTiles = state.tiles.map((tile) => result.eliminatedIds.includes(tile.id)
                ? { ...tile, isEliminated: true }
                : tile);
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

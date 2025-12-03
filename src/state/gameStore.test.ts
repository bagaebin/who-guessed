import { describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { initialTiles } from '../data/tiles';

function resetStore() {
  useGameStore.setState({
    tiles: initialTiles,
    playerProfile: undefined,
    round: 1,
    phase: 'early',
    isLoading: false,
    error: undefined,
    lastReasoning: undefined,
  });
}

describe('gameStore', () => {
  it('applies LLM response and advances round', () => {
    resetStore();
    const store = useGameStore.getState();
    store.applyLlmResponse({
      profile: initialTiles[0].core,
      eliminatedIds: [initialTiles[0].id, initialTiles[1].id],
      reasoning: { [initialTiles[0].id]: '테스트', [initialTiles[1].id]: '테스트2' },
    });

    const updated = useGameStore.getState();
    expect(updated.round).toBe(2);
    expect(updated.tiles.filter((t) => t.isEliminated).length).toBe(2);
    expect(updated.playerProfile).toBeDefined();
  });
});

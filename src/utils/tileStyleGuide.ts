import { CharacterTile } from '../types/appearance';

type TileVisualState = 'active' | 'eliminated';

type TileStyle = {
  baseColor: string;
  accentColor: string;
  opacity: number;
  borderRadius: number;
};

export const TILE_COLOR_GUIDE: Record<TileVisualState, TileStyle> = {
  active: {
    baseColor: '#1f1fa8ff',
    accentColor: '#151578ff',
    opacity: 1,
    borderRadius: 0.16
  },
  eliminated: {
    baseColor: '#233a63',
    accentColor: '#2e4a89',
    opacity: 0.6,
    borderRadius: 0.16
  }
};

/**
 * Returns a consistent set of colors and presentation values for a tile.
 * The guide keeps tile visuals centralized so future themes can be updated in one place.
 */
export function getTileStyle(tile: CharacterTile): TileStyle {
  const state: TileVisualState = tile.isEliminated ? 'eliminated' : 'active';
  return TILE_COLOR_GUIDE[state];
}

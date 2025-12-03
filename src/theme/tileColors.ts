export type TilePalette = {
  /** Primary face color for the tile frame. */
  base: string;
  /** Color used when the tile is marked eliminated. */
  eliminated: string;
  /** Accent color for UI stripes or highlights. */
  accent: string;
  /** Screen fallback or bezel color when there is no video/image. */
  screenFallback: string;
  /** High-contrast text color to pair with the palette. */
  text: string;
  /** Outline or shadow color that pairs well with the text. */
  outline: string;
};

/**
 * Central palette for tile surfaces to keep the navy theme consistent.
 * Adjusting these values updates both the character tiles and the player camera tile.
 */
export const tilePalette: TilePalette = {
  base: '#12305d',
  eliminated: '#233a63',
  accent: '#1b467d',
  screenFallback: '#12243f',
  text: '#e9eef8',
  outline: '#0a121b'
};

/**
 * Convenience helpers for specific tile types in case different accents are
 * introduced later. Keep using the shared palette so the board stays cohesive.
 */
export const characterTileColors = {
  face: tilePalette.base,
  eliminated: tilePalette.eliminated
};

export const playerCameraTileColors = {
  frame: tilePalette.base,
  fallback: tilePalette.screenFallback,
  accent: tilePalette.accent,
  text: tilePalette.text,
  outline: tilePalette.outline
};

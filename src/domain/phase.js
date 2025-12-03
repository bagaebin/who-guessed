export function getPhaseByRemaining(remaining) {
    if (remaining <= 3)
        return 'late';
    if (remaining <= 8)
        return 'mid';
    return 'early';
}
export function getEliminationRange(phase) {
    if (phase === 'early')
        return { min: 3, max: 4 };
    if (phase === 'mid')
        return { min: 2, max: 3 };
    return { min: 1, max: 2 };
}
export function getRemainingTiles(tiles) {
    return tiles.filter((t) => !t.isEliminated);
}

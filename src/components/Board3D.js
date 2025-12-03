import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text } from '@react-three/drei';
import { Vector3, Color } from 'three';
import { useMemo } from 'react';
const GRID_COLUMNS = 4;
const TILE_SPACING = 2.4;
function computePosition(index) {
    const row = Math.floor(index / GRID_COLUMNS);
    const col = index % GRID_COLUMNS;
    const x = (col - (GRID_COLUMNS - 1) / 2) * TILE_SPACING;
    const z = (row - 1) * TILE_SPACING;
    return new Vector3(x, 0, z);
}
function TileCard({ tile, index }) {
    const position = useMemo(() => computePosition(index), [index]);
    const color = tile.isEliminated ? new Color('#1e293b') : new Color('#38bdf8');
    const rotation = tile.isEliminated ? [-Math.PI / 2.2, 0, 0] : [-0.15, 0, 0];
    const elevation = tile.isEliminated ? 0.05 : 0.2;
    return (_jsxs("group", { position: position.toArray(), children: [_jsxs("mesh", { rotation: rotation, position: [0, elevation, 0], castShadow: true, receiveShadow: true, children: [_jsx("boxGeometry", { args: [1.6, 0.1, 2] }), _jsx("meshStandardMaterial", { color: color, metalness: 0.2, roughness: 0.5 })] }), _jsxs(Text, { position: [0, elevation + 0.15, 0], rotation: [-Math.PI / 2, 0, 0], color: tile.isEliminated ? '#94a3b8' : '#0f172a', fontSize: 0.2, anchorX: "center", anchorY: "middle", maxWidth: 1.4, children: [tile.core.styleVibe, " / ", tile.core.hairColor] })] }));
}
function Ground() {
    return (_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.05, 0], receiveShadow: true, children: [_jsx("planeGeometry", { args: [20, 20] }), _jsx("meshStandardMaterial", { color: "#111827" })] }));
}
export default function Board3D({ tiles }) {
    return (_jsxs("group", { children: [_jsx(Ground, {}), tiles.map((tile, index) => (_jsx(TileCard, { tile: tile, index: index }, tile.id)))] }));
}

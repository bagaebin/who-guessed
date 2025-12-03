import { Text } from '@react-three/drei';
import { Vector3, Color } from 'three';
import { CharacterTile } from '../domain/tile';
import { useMemo } from 'react';

interface Board3DProps {
  tiles: CharacterTile[];
}

const GRID_COLUMNS = 4;
const TILE_SPACING = 2.4;

function computePosition(index: number): Vector3 {
  const row = Math.floor(index / GRID_COLUMNS);
  const col = index % GRID_COLUMNS;
  const x = (col - (GRID_COLUMNS - 1) / 2) * TILE_SPACING;
  const z = (row - 1) * TILE_SPACING;
  return new Vector3(x, 0, z);
}

function TileCard({ tile, index }: { tile: CharacterTile; index: number }) {
  const position = useMemo(() => computePosition(index), [index]);
  const color = tile.isEliminated ? new Color('#1e293b') : new Color('#38bdf8');
  const rotation = tile.isEliminated ? [-Math.PI / 2.2, 0, 0] : [-0.15, 0, 0];
  const elevation = tile.isEliminated ? 0.05 : 0.2;

  return (
    <group position={position.toArray()}>
      <mesh rotation={rotation as [number, number, number]} position={[0, elevation, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.1, 2]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>
      <Text
        position={[0, elevation + 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        color={tile.isEliminated ? '#94a3b8' : '#0f172a'}
        fontSize={0.2}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
      >
        {tile.core.styleVibe} / {tile.core.hairColor}
      </Text>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#111827" />
    </mesh>
  );
}

export default function Board3D({ tiles }: Board3DProps) {
  return (
    <group>
      <Ground />
      {tiles.map((tile, index) => (
        <TileCard key={tile.id} tile={tile} index={index} />
      ))}
    </group>
  );
}

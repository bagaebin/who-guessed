import { useSpring, a } from '@react-spring/three';
import { Text } from '@react-three/drei';
import { MeshProps } from '@react-three/fiber';
import { useMemo } from 'react';
import { CharacterTile } from '../types/appearance';

type TileCardProps = {
  tile: CharacterTile;
  position: MeshProps['position'];
};

const TILE_SIZE = { width: 1.6, height: 2.2, depth: 0.12 };

export default function TileCard({ tile, position }: TileCardProps) {
  const { rotationX, color, opacity, yOffset } = useSpring({
    rotationX: tile.isEliminated ? Math.PI / 2 + 0.2 : -0.2,
    color: tile.isEliminated ? '#30343f' : '#6dcff6',
    opacity: tile.isEliminated ? 0.35 : 1,
    yOffset: tile.isEliminated ? -0.25 : 0
  });

  const label = useMemo(() => tile.id.replace('tile-', '#'), [tile.id]);
  const [baseX, baseY, baseZ] = useMemo(() => {
    if (Array.isArray(position)) {
      return [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
    }
    return [0, 0, 0];
  }, [position]);

  return (
    <a.group
      position-x={baseX}
      position-y={yOffset.to((y) => baseY + y)}
      position-z={baseZ}
      rotation-x={rotationX}
    >
      <a.mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]} />
        <a.meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.6} />
      </a.mesh>
      <a.mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.001]}>
        <planeGeometry args={[TILE_SIZE.width * 0.85, TILE_SIZE.height * 0.85]} />
        <a.meshBasicMaterial color="#ffffff" opacity={opacity} transparent />
      </a.mesh>
      <Text
        position={[0, TILE_SIZE.height / 2 + 0.2, 0]}
        color="white"
        fontSize={0.24}
        outlineWidth={0.02}
        outlineColor="#111"
      >
        {label}
      </Text>
    </a.group>
  );
}

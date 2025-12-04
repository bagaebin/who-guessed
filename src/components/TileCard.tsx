import { useSpring, a } from '@react-spring/three';
import { RoundedBox, useTexture } from '@react-three/drei';
import { MeshProps } from '@react-three/fiber';
import { useMemo } from 'react';
import { CharacterTile } from '../types/appearance';
import { getTileStyle } from '../utils/tileStyleGuide';

type TileCardProps = {
  tile: CharacterTile;
  position: MeshProps['position'];
  introIndex: number;
};

const TILE_SIZE = { width: 1.6, height: 2.2, depth: 0.12 };
const INTRO_DELAY_STEP = 180;
const INTRO_DROP_HEIGHT = 1.8;

export default function TileCard({ tile, position, introIndex }: TileCardProps) {
  const style = getTileStyle(tile);
  const introDelay = introIndex * INTRO_DELAY_STEP;
  const { rotationX, opacity, yOffset, baseColor } = useSpring({
    from: {
      rotationX: -0.8,
      opacity: 0,
      yOffset: INTRO_DROP_HEIGHT,
      baseColor: style.baseColor
    },
    to: {
      rotationX: tile.isEliminated ? -(Math.PI / 2 + 0.2) : -0.2,
      baseColor: style.baseColor,
      opacity: style.opacity,
      yOffset: tile.isEliminated ? -0.25 : 0
    },
    delay: introDelay,
    config: {
      mass: 1.1,
      tension: 140,
      friction: 18
    }
  });

  const texture = useTexture(tile.image);

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
      <RoundedBox args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]} radius={style.borderRadius} smoothness={6} castShadow receiveShadow>
        <a.meshStandardMaterial color={baseColor} transparent opacity={opacity} roughness={0.6} />
      </RoundedBox>
      <a.mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.001]}>
        <planeGeometry args={[TILE_SIZE.width * 0.85, TILE_SIZE.height * 0.85]} />
        <a.meshBasicMaterial map={texture} opacity={opacity} transparent toneMapped={false} />
      </a.mesh>
    </a.group>
  );
}

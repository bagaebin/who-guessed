import { to } from '@react-spring/core';
import { useSpring, a } from '@react-spring/three';
import { RoundedBox, useTexture } from '@react-three/drei';
import { MeshProps } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CharacterTile } from '../types/appearance';
import { getTileStyle } from '../utils/tileStyleGuide';

type TileCardProps = {
  tile: CharacterTile;
  position: MeshProps['position'];
  introAnimation?: {
    isActive: boolean;
    delayMs?: number;
    initialHeight?: number;
    onComplete?: () => void;
  };
};

const TILE_SIZE = { width: 1.6, height: 2.2, depth: 0.12 };

export default function TileCard({ tile, position, introAnimation }: TileCardProps) {
  const style = getTileStyle(tile);
  const introCompleteRef = useRef(false);
  const introStartedRef = useRef(false);
  const introEnabled = Boolean(introAnimation?.isActive);
  const introShouldReset = introEnabled && !introStartedRef.current && !introCompleteRef.current;

  const { rotationX, opacity, yOffset, baseColor, dropOffset, introOpacity } = useSpring({
    rotationX: tile.isEliminated ? -(Math.PI / 2 + 0.2) : -0.2,
    baseColor: style.baseColor,
    opacity: style.opacity,
    yOffset: tile.isEliminated ? -0.25 : 0,
    dropOffset: 0,
    introOpacity: 1,
    from: introEnabled
      ? {
          dropOffset: introAnimation?.initialHeight ?? 4.5,
          introOpacity: 0
        }
      : undefined,
    delay: introEnabled ? introAnimation?.delayMs ?? 0 : 0,
    config: { mass: 1.1, tension: 180, friction: 18 },
    reset: introShouldReset,
    onStart: () => {
      if (introEnabled) {
        introStartedRef.current = true;
      }
    },
    onRest: (result) => {
      if (
        introEnabled &&
        !introCompleteRef.current &&
        Math.abs(result.value.dropOffset ?? 0) < 0.01
      ) {
        introCompleteRef.current = true;
        introAnimation?.onComplete?.();
      }
    },
    immediate: (name) => !introEnabled && (name === 'dropOffset' || name === 'introOpacity')
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
      position-y={to([yOffset, dropOffset], (y, drop) => baseY + y + drop)}
      position-z={baseZ}
      rotation-x={rotationX}
    >
      <RoundedBox args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]} radius={style.borderRadius} smoothness={6} castShadow receiveShadow>
        <a.meshStandardMaterial
          color={baseColor}
          transparent
          opacity={to([opacity, introOpacity], (base, intro) => base * intro)}
          roughness={0.6}
        />
      </RoundedBox>
      <a.mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.001]}>
        <planeGeometry args={[TILE_SIZE.width * 0.85, TILE_SIZE.height * 0.85]} />
        <a.meshBasicMaterial
          map={texture}
          opacity={to([opacity, introOpacity], (base, intro) => base * intro)}
          transparent
          toneMapped={false}
        />
      </a.mesh>
    </a.group>
  );
}

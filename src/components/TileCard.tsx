import { to } from '@react-spring/core';
import { useSpring, a } from '@react-spring/three';
import { RoundedBox, useTexture } from '@react-three/drei';
import { MeshProps } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
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
  const introDelayRef = useRef(introAnimation?.delayMs ?? 0);
  const introHeightRef = useRef(introAnimation?.initialHeight ?? 4.5);
  const introEnabled = Boolean(introAnimation?.isActive);
  const shouldStartIntro = introEnabled && !introStartedRef.current;

  useEffect(() => {
    if (introEnabled && !introStartedRef.current) {
      introStartedRef.current = true;
      introDelayRef.current = introAnimation?.delayMs ?? introDelayRef.current;
      introHeightRef.current = introAnimation?.initialHeight ?? introHeightRef.current;
    }
  }, [introEnabled, introAnimation?.delayMs, introAnimation?.initialHeight]);

  const { rotationX, opacity, yOffset, baseColor, dropOffset, introOpacity, scale, emissiveIntensity, accentOpacity } =
    useSpring({
      rotationX: tile.isEliminated ? -(Math.PI / 2 + 0.22) : -0.14,
      baseColor: style.baseColor,
      opacity: style.opacity,
      yOffset: tile.isEliminated ? -0.26 : 0.06,
      dropOffset: 0,
      introOpacity: 1,
      scale: tile.isEliminated ? 0.92 : 1.02,
      emissiveIntensity: tile.isEliminated ? 0.22 : 0.08,
      accentOpacity: tile.isEliminated ? 0.08 : 0.55,
      from: shouldStartIntro
        ? {
            dropOffset: introHeightRef.current,
            introOpacity: 0
          }
        : undefined,
      delay: introDelayRef.current,
      config: (key) => {
        if (key === 'dropOffset' || key === 'introOpacity') return { mass: 1.1, tension: 180, friction: 18 };
        if (key === 'emissiveIntensity' || key === 'accentOpacity') return { tension: 180, friction: 20 };
        return { mass: 1.1, tension: 140, friction: 16 };
      },
      reset: shouldStartIntro,
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

  const { idleOffset } = useSpring({
    from: { idleOffset: 0 },
    to: async (next) => {
      while (true) {
        await next({ idleOffset: 0.05 });
        await next({ idleOffset: -0.02 });
      }
    },
    config: { duration: 1600 },
    pause: introEnabled || tile.isEliminated
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
      position-y={to([yOffset, dropOffset, idleOffset], (y, drop, idle) => baseY + y + drop + idle)}
      position-z={baseZ}
      rotation-x={rotationX}
      scale={scale}
    >
      <RoundedBox args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]} radius={style.borderRadius} smoothness={6} castShadow receiveShadow>
        <a.meshStandardMaterial
          color={baseColor}
          emissive={style.accentColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={to([opacity, introOpacity], (base, intro) => base * intro)}
          roughness={0.6}
        />
      </RoundedBox>
      <a.mesh position={[0, TILE_SIZE.height / 2 - 0.18, TILE_SIZE.depth / 2 + 0.002]}>
        <planeGeometry args={[TILE_SIZE.width * 0.82, 0.12]} />
        <a.meshBasicMaterial
          color={style.accentColor}
          transparent
          opacity={to([accentOpacity, introOpacity], (accent, intro) => accent * intro)}
        />
      </a.mesh>
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

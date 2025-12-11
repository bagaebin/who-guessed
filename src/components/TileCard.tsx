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
    index?: number; // Add index to calculate unique delayMs
  };
  isGenerating?: boolean;
};

const TILE_SIZE = { width: 1.6, height: 2.2, depth: 0.12 };

export default function TileCard({ tile, position, introAnimation, isGenerating }: TileCardProps) {
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
      const baseDelay = import.meta.env.VITE_TILE_DROP_DELAY
        ? parseInt(import.meta.env.VITE_TILE_DROP_DELAY, 10)
        : introAnimation?.delayMs ?? introDelayRef.current;
      // Calculate unique delay based on index
        introDelayRef.current = baseDelay + (introAnimation?.index ?? 0) * 50; // Increment delay by index
      introHeightRef.current = introAnimation?.initialHeight ?? introHeightRef.current;

      // Debugging: Log index and calculated delayMs
      console.log(`Tile index: ${introAnimation?.index}, delayMs: ${introDelayRef.current}`);
    }
  }, [introEnabled, introAnimation?.delayMs, introAnimation?.initialHeight, introAnimation?.index]);

  const { rotationX, opacity, yOffset, baseColor, dropOffset, introOpacity } = useSpring({
    rotationX: tile.isEliminated ? -(Math.PI / 2 + 0.2) : -0.2,
    baseColor: style.baseColor,
    opacity: style.opacity,
    yOffset: tile.isEliminated ? -0.25 : 0,
    dropOffset: 0,
    introOpacity: 1,
    from: shouldStartIntro
      ? {
          dropOffset: introHeightRef.current,
          introOpacity: 0
        }
      : undefined,
    delay: introDelayRef.current,
    config: { mass: 1.1, tension: 180, friction: 18 },
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

  const texture = useTexture(tile.image);

  const [{ posX, posY, posZ }, positionApi] = useSpring(() => ({
    posX: baseX,
    posY: baseY,
    posZ: baseZ,
    config: { mass: 1.05, tension: 140, friction: 18 }
  }));

  useEffect(() => {
    positionApi.start({ posX: baseX, posY: baseY, posZ: baseZ });
  }, [baseX, baseY, baseZ, positionApi]);

  const [{ bounceOffset }, bounceApi] = useSpring(() => ({ bounceOffset: 0 }));

  useEffect(() => {
    bounceApi.start({
      bounceOffset: isGenerating ? 0.18 : 0,
      loop: isGenerating ? { reverse: true } : false,
      config: { mass: 1, tension: 220, friction: 6 }
    });
  }, [bounceApi, isGenerating]);

  const [baseX, baseY, baseZ] = useMemo(() => {
    if (Array.isArray(position)) {
      return [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
    }
    return [0, 0, 0];
  }, [position]);

  return (
    <a.group
      position-x={posX}
      position-y={to([posY, yOffset, dropOffset, bounceOffset], (yPos, y, drop, bounce) =>
        yPos + y + drop + bounce
      )}
      position-z={posZ}
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

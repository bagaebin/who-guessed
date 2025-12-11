import { SpringValue, useSpring } from '@react-spring/three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Board3DProps = {
  tiles: CharacterTile[];
  generatingIds: Set<string>;
  focusTileId?: string;
};

type IntroStage = 'idle' | 'dropping' | 'done';

// 한 행에 배치되는 타일 수
const TILE_COLUMNS = 5;
// 타일 사이 간격
const TILE_SPACING = 2.2;
// Camera 타일과 앞열 타일 사이 간격
const CAMERA_TILE_FRONT_GAP = TILE_SPACING * 0.1;
// Camera 기본 위치와 타일 위치 조정값
const parsedCameraZAdjust = Number.parseFloat(import.meta.env.VITE_CAMERA_TILE_Z_ADJUST ?? '');
const CAMERA_TILE_Y_ADJUST = Number.isFinite(parsedCameraZAdjust) ? parsedCameraZAdjust : 0;
const parsedRowStep = Number.parseFloat(import.meta.env.VITE_TILE_ROW_STEP ?? '');
const STAIR_STEP = Number.isFinite(parsedRowStep) ? parsedRowStep : 0.32;
const MAX_INTRO_TILE_COUNT = 24;
const OVERVIEW_TARGET_Y_OFFSET = -2;
const OVERVIEW_POSITION_Z_PADDING = 12;
const OVERVIEW_POSITION_Y_PADDING = 4;

function TileGrid({
  tiles,
  introState,
  generatingIds
}: {
  tiles: CharacterTile[];
  introState?: {
    stage: IntroStage;
    tileOrder: string[];
    onTileDropComplete: () => void;
  };
  generatingIds: Set<string>;
}) {
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const introTileIndexMap = useMemo(() => {
    if (!introState) return new Map<string, number>();
    return new Map(introState.tileOrder.map((id, index) => [id, index]));
  }, [introState]);

  return (
    <group position={[0, 0, 0]}>
      {tiles.map((tile, index) => {
        const row = Math.floor(index / TILE_COLUMNS);
        const col = index % TILE_COLUMNS;
        const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
        const z = ((rows - 1) / 2 - row) * TILE_SPACING;
        const y = row * STAIR_STEP;
        const introIndex = introTileIndexMap.get(tile.id);
        const introAnimation =
          introIndex !== undefined
            ? {
                isActive: introState?.stage === 'dropping',
                delayMs: introIndex * 320,
                initialHeight: 6 + introIndex * 0.3,
                index: introIndex, // Add index for TileCard
                onComplete:
                  introState?.stage === 'dropping' ? introState?.onTileDropComplete : undefined
              }
            : undefined;
        return (
          <TileCard
            key={tile.id}
            tile={tile}
            position={[x, y, z]}
            introAnimation={introAnimation}
            isGenerating={generatingIds.has(tile.id)}
          />
        );
      })}
    </group>
  );
}

function CameraRig({
  cameraValues
}: {
  cameraValues: {
    camX: SpringValue<number>;
    camY: SpringValue<number>;
    camZ: SpringValue<number>;
    tgtX: SpringValue<number>;
    tgtY: SpringValue<number>;
    tgtZ: SpringValue<number>;
  };
}) {
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    camera.position.set(
      cameraValues.camX.get(),
      cameraValues.camY.get(),
      cameraValues.camZ.get()
    );
    camera.lookAt(cameraValues.tgtX.get(), cameraValues.tgtY.get(), cameraValues.tgtZ.get());
  });

  return null;
}

function SceneContents({
  tiles,
  cameraTilePosition,
  cameraTarget,
  cameraSpring,
  introState,
  introTileIds,
  onIntroTileComplete,
  generatingIds
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraSpring: {
    camX: SpringValue<number>;
    camY: SpringValue<number>;
    camZ: SpringValue<number>;
    tgtX: SpringValue<number>;
    tgtY: SpringValue<number>;
    tgtZ: SpringValue<number>;
  };
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  generatingIds: Set<string>;
}) {
  return (
    <>
      <CameraRig cameraValues={cameraSpring} />
      <hemisphereLight args={["#a3c4f9", "#4f6b8f", 0.85]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.45} castShadow />
      <PlayerCameraTile position={cameraTilePosition} />
      <TileGrid
        tiles={tiles}
        introState={{
          stage: introState,
          tileOrder: introTileIds,
          onTileDropComplete: onIntroTileComplete
        }}
        generatingIds={generatingIds}
      />
      <ContactShadows
        position={[0, -0.8, 0]}
        opacity={0.35}
        blur={2.5}
        scale={25}
        far={15}
      />
    </>
  );
}

export default function Board3D({ tiles, generatingIds, focusTileId }: Board3DProps) {
  const [introStage, setIntroStage] = useState<IntroStage>('idle');
  const [introDropCount, setIntroDropCount] = useState(0);
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];

  const introTileIds = useMemo(
    () => tiles.slice(0, MAX_INTRO_TILE_COUNT).map((tile) => tile.id),
    [tiles]
  );

  const overviewTargetY = (rows - 1) * STAIR_STEP * 0.5 + OVERVIEW_TARGET_Y_OFFSET;
  const gridHalfDepth = ((rows - 1) / 2) * TILE_SPACING;
  const cameraTarget: [number, number, number] = useMemo(
    () => [0, overviewTargetY, 0],
    [overviewTargetY]
  );
  const cameraPosition: [number, number, number] = useMemo(
    () => [
      0,
      overviewTargetY + OVERVIEW_POSITION_Y_PADDING,
      gridHalfDepth + CAMERA_TILE_FRONT_GAP + OVERVIEW_POSITION_Z_PADDING
    ],
    [gridHalfDepth, overviewTargetY]
  );

  const focusTileIndex = focusTileId ? tiles.findIndex((tile) => tile.id === focusTileId) : -1;
  const focusPosition = useMemo(() => {
    if (focusTileIndex < 0) return null;
    const row = Math.floor(focusTileIndex / TILE_COLUMNS);
    const col = focusTileIndex % TILE_COLUMNS;
    const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
    const z = ((rows - 1) / 2 - row) * TILE_SPACING;
    const y = row * STAIR_STEP;
    return [x, y, z] as [number, number, number];
  }, [focusTileIndex, rows]);

  const focusCameraTarget: [number, number, number] | null = useMemo(() => {
    if (!focusPosition) return null;
    return [focusPosition[0], focusPosition[1] + 0.4, focusPosition[2]];
  }, [focusPosition]);

  const focusCameraPosition: [number, number, number] | null = useMemo(() => {
    if (!focusPosition) return null;
    return [focusPosition[0], focusPosition[1] + 1.35, focusPosition[2] + 3.4];
  }, [focusPosition]);

  const [cameraSpring, cameraApi] = useSpring(() => ({
    camX: cameraPosition[0],
    camY: cameraPosition[1],
    camZ: cameraPosition[2],
    tgtX: cameraTarget[0],
    tgtY: cameraTarget[1],
    tgtZ: cameraTarget[2],
    config: { mass: 1.2, tension: 90, friction: 20 }
  }));

  useEffect(() => {
    const nextPosition = focusCameraPosition ?? cameraPosition;
    const nextTarget = focusCameraTarget ?? cameraTarget;

    cameraApi.start({
      camX: nextPosition[0],
      camY: nextPosition[1],
      camZ: nextPosition[2],
      tgtX: nextTarget[0],
      tgtY: nextTarget[1],
      tgtZ: nextTarget[2]
    });
  }, [cameraApi, cameraPosition, cameraTarget, focusCameraPosition, focusCameraTarget]);

  useEffect(() => {
    if (introTileIds.length) {
      setIntroStage('dropping');
      setIntroDropCount(0);
    } else {
      setIntroStage('idle');
      setIntroDropCount(0);
    }
  }, [introTileIds.length]);

  useEffect(() => {
    if (introStage === 'dropping' && introDropCount >= introTileIds.length) {
      setIntroStage('done');
    }
  }, [introDropCount, introStage, introTileIds.length]);

  const handleTileDropComplete = useCallback(() => {
    setIntroDropCount((count) => Math.min(count + 1, introTileIds.length));
  }, [introTileIds.length]);

  return (
    <div className="board3d">
      <Canvas camera={{ position: cameraPosition, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          cameraTarget={cameraTarget}
          cameraSpring={cameraSpring}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
          generatingIds={generatingIds}
        />
      </Canvas>
    </div>
  );
}

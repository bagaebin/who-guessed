import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Board3DProps = {
  tiles: CharacterTile[];
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
const OUTRO_CAMERA_DISTANCE = 3.6;
const OUTRO_CAMERA_HEIGHT = 1.5;

function TileGrid({
  tiles,
  introState
}: {
  tiles: CharacterTile[];
  introState?: {
    stage: IntroStage;
    tileOrder: string[];
    onTileDropComplete: () => void;
  };
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
        return <TileCard key={tile.id} tile={tile} position={[x, y, z]} introAnimation={introAnimation} />;
      })}
    </group>
  );
}

function SceneContents({
  tiles,
  cameraTilePosition,
  cameraPosition,
  cameraTarget,
  introState,
  introTileIds,
  onIntroTileComplete
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const targetRef = useMemo(() => new THREE.Vector3(...cameraTarget), []);
  const positionRef = useMemo(() => new THREE.Vector3(...cameraPosition), []);

  useEffect(() => {
    targetRef.set(...cameraTarget);
    positionRef.set(...cameraPosition);
  }, [cameraPosition, cameraTarget, positionRef, targetRef]);

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    camera.position.lerp(positionRef, 0.08);
    camera.lookAt(targetRef);
    camera.updateProjectionMatrix();
  });

  return (
    <>
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

export default function Board3D({ tiles }: Board3DProps) {
  const [introStage, setIntroStage] = useState<IntroStage>('idle');
  const [introDropCount, setIntroDropCount] = useState(0);
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];

  const getTilePosition = useCallback((tileIndex: number): [number, number, number] => {
    const row = Math.floor(tileIndex / TILE_COLUMNS);
    const col = tileIndex % TILE_COLUMNS;
    const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
    const z = ((rows - 1) / 2 - row) * TILE_SPACING;
    const y = row * STAIR_STEP;
    return [x, y, z];
  }, [rows]);

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

  const outroCamera = useMemo(() => {
    const remaining = tiles.filter((tile) => !tile.isEliminated);
    if (remaining.length !== 1) return null;

    const tileIndex = tiles.findIndex((tile) => tile.id === remaining[0].id);
    if (tileIndex < 0) return null;

    const [x, y, z] = getTilePosition(tileIndex);
    return {
      target: [x, y, z] as [number, number, number],
      position: [x, y + OUTRO_CAMERA_HEIGHT, z + OUTRO_CAMERA_DISTANCE] as [number, number, number]
    };
  }, [getTilePosition, tiles]);

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

  const activeCameraTarget = outroCamera?.target ?? cameraTarget;
  const activeCameraPosition = outroCamera?.position ?? cameraPosition;

  return (
    <div className="board3d">
      <Canvas camera={{ position: activeCameraPosition, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          cameraPosition={activeCameraPosition}
          cameraTarget={activeCameraTarget}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
        />
      </Canvas>
    </div>
  );
}

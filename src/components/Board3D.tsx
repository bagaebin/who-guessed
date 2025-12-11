import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Board3DProps = {
  tiles: CharacterTile[];
  focusTileId?: string;
  generatingTileId?: string;
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
  generatingTileId
}: {
  tiles: CharacterTile[];
  introState?: {
    stage: IntroStage;
    tileOrder: string[];
    onTileDropComplete: () => void;
  };
  generatingTileId?: string;
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
        const isGenerating = tile.id === generatingTileId;
        return (
          <TileCard
            key={tile.id}
            tile={tile}
            position={[x, y, z]}
            introAnimation={introAnimation}
            isGenerating={isGenerating}
          />
        );
      })}
    </group>
  );
}

function getTilePositionFromIndex(index: number, rows: number) {
  const row = Math.floor(index / TILE_COLUMNS);
  const col = index % TILE_COLUMNS;
  const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
  const z = ((rows - 1) / 2 - row) * TILE_SPACING;
  const y = row * STAIR_STEP;
  return { x, y, z };
}

function SceneContents({
  tiles,
  cameraTilePosition,
  cameraPosition,
  cameraTarget,
  introState,
  introTileIds,
  onIntroTileComplete,
  generatingTileId,
  focusTarget,
  focusCameraPosition
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  generatingTileId?: string;
  focusTarget?: [number, number, number];
  focusCameraPosition?: [number, number, number];
}) {
  const camera = useThree((state) => state.camera);
  const desiredPosition = useRef(new THREE.Vector3(...cameraPosition));
  const desiredTarget = useRef(new THREE.Vector3(...cameraTarget));
  const currentLookAt = useRef(new THREE.Vector3(...cameraTarget));

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(...cameraPosition);
    camera.lookAt(...cameraTarget);
    camera.updateProjectionMatrix();
  }, [camera, cameraPosition, cameraTarget]);

  useEffect(() => {
    desiredPosition.current.set(...(focusCameraPosition ?? cameraPosition));
    desiredTarget.current.set(...(focusTarget ?? cameraTarget));
  }, [cameraPosition, cameraTarget, focusCameraPosition, focusTarget]);

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.lerp(desiredPosition.current, 0.04);
    currentLookAt.current.lerp(desiredTarget.current, 0.08);
    camera.lookAt(currentLookAt.current);
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
        generatingTileId={generatingTileId}
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

export default function Board3D({ tiles, focusTileId, generatingTileId }: Board3DProps) {
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

  const focusIndex = focusTileId ? tiles.findIndex((tile) => tile.id === focusTileId) : -1;
  const focusPosition = focusIndex >= 0 ? getTilePositionFromIndex(focusIndex, rows) : null;
  const outroCameraTarget: [number, number, number] | undefined = focusPosition
    ? [focusPosition.x, focusPosition.y, focusPosition.z]
    : undefined;
  const outroCameraPosition: [number, number, number] | undefined = focusPosition
    ? [focusPosition.x, focusPosition.y + 2.2, focusPosition.z + 4]
    : undefined;

  return (
    <div className="board3d">
      <Canvas camera={{ position: cameraPosition, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
          generatingTileId={generatingTileId}
          focusTarget={outroCameraTarget}
          focusCameraPosition={outroCameraPosition}
        />
      </Canvas>
    </div>
  );
}

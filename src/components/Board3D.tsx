import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Board3DProps = {
  tiles: CharacterTile[];
};

type IntroStage = 'idle' | 'dropping' | 'overview' | 'focusing' | 'done';

// 한 행에 배치되는 타일 수
const TILE_COLUMNS = 5;
// 타일 사이 간격
const TILE_SPACING = 2.2;
// Camera 타일과 앞열 타일 사이 간격
const CAMERA_TILE_FRONT_GAP = TILE_SPACING * 1.6;
// Camera 기본 위치와 타일 위치 조정값
const CAMERA_POSITION: [number, number, number] = [0, 2, 8];
const CAMERA_TARGET: [number, number, number] = [0, 1.5, 0];
const parsedCameraZAdjust = Number.parseFloat(import.meta.env.VITE_CAMERA_TILE_Z_ADJUST ?? '');
const CAMERA_TILE_Y_ADJUST = Number.isFinite(parsedCameraZAdjust) ? parsedCameraZAdjust : 0;
const parsedRowStep = Number.parseFloat(import.meta.env.VITE_TILE_ROW_STEP ?? '');
const STAIR_STEP = Number.isFinite(parsedRowStep) ? parsedRowStep : 0.32;
const MAX_INTRO_TILE_COUNT = 24;
const OVERVIEW_TARGET_Y_OFFSET = 0.6;
const OVERVIEW_POSITION_Z_PADDING = 10;
const OVERVIEW_POSITION_Y_PADDING = 4.2;
const FOCUS_LERP_THRESHOLD = 0.08;
const AUTO_TILT_SLOPE = 0.08;
const AUTO_TILT_MAX = 1.1;

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
  introState,
  introTileIds,
  onIntroTileComplete,
  onIntroOverviewComplete,
  onIntroFocusComplete,
  overviewTarget,
  overviewPosition,
  focusTarget
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  onIntroOverviewComplete: () => void;
  onIntroFocusComplete: () => void;
  overviewTarget: [number, number, number];
  overviewPosition: [number, number, number];
  focusTarget: [number, number, number];
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const baseTargetRef = useRef(new THREE.Vector3(...CAMERA_TARGET));
  const focusOverrideTargetRef = useRef<THREE.Vector3 | null>(null);
  const focusOverrideOffsetRef = useRef<THREE.Vector3 | null>(null);
  const focusOverrideActiveRef = useRef(false);
  const tempFocusPosition = useMemo(() => new THREE.Vector3(), []);
  const tiltOffsetRef = useRef(0);
  const overviewCompleteRef = useRef(false);
  const focusCompleteRef = useRef(false);
  const tempTarget = useMemo(() => new THREE.Vector3(), []);
  const tempBase = useMemo(() => new THREE.Vector3(), []);
  const overviewPositionVector = useMemo(() => new THREE.Vector3(...overviewPosition), [overviewPosition]);
  const overviewTargetVector = useMemo(() => new THREE.Vector3(...overviewTarget), [overviewTarget]);
  const focusTargetVector = useMemo(() => new THREE.Vector3(...focusTarget), [focusTarget]);
  const cameraTileTarget = useMemo(() => new THREE.Vector3(...cameraTilePosition), [cameraTilePosition]);

  const baseOffset = useMemo(
    () =>
      new THREE.Vector3(...CAMERA_POSITION).sub(
        new THREE.Vector3(...CAMERA_TARGET)
      ),
    []
  );

  const focusPositionVector = useMemo(
    () => focusTargetVector.clone().add(baseOffset),
    [baseOffset, focusTargetVector]
  );

  const handleFocusOnPlayerTile = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;

    const currentOffset = camera.position.clone().sub(controls.target);
    controls.target.copy(cameraTileTarget);
    baseTargetRef.current.copy(cameraTileTarget);
    focusOverrideTargetRef.current = cameraTileTarget.clone();
    focusOverrideOffsetRef.current = currentOffset.clone();
    focusOverrideActiveRef.current = true;
    camera.position.copy(cameraTileTarget.clone().add(currentOffset));
    controls.update();
  }, [camera, cameraTileTarget]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.copy(baseTargetRef.current);
    controlsRef.current.update();
  }, []);

  return (
    <>
      {/* 배경색을 투명하게 설정 */}
      {/* <color attach="background" args={["#9ad6ff"]} /> */}
      {/* 조명 설정 수정 */}
      <hemisphereLight args={["#a3c4f9", "#4f6b8f", 0.85]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.45} castShadow />
      <PlayerCameraTile position={cameraTilePosition} onFocusRequest={handleFocusOnPlayerTile} />
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
      <OrbitControls
        ref={controlsRef}
        enableRotate
        enablePan
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
        minDistance={10}
        maxDistance={25}
      />
      <UpdateCamera
        controlsRef={controlsRef}
        camera={camera}
        baseTargetRef={baseTargetRef}
        tiltOffsetRef={tiltOffsetRef}
        tempTarget={tempTarget}
        tempBase={tempBase}
        introState={introState}
        overviewCompleteRef={overviewCompleteRef}
        focusCompleteRef={focusCompleteRef}
        focusOverrideTargetRef={focusOverrideTargetRef}
        focusOverrideOffsetRef={focusOverrideOffsetRef}
        focusOverrideActiveRef={focusOverrideActiveRef}
        tempFocusPosition={tempFocusPosition}
        overviewPosition={overviewPositionVector}
        overviewTarget={overviewTargetVector}
        focusPosition={focusPositionVector}
        focusTarget={focusTargetVector}
        onIntroOverviewComplete={onIntroOverviewComplete}
        onIntroFocusComplete={onIntroFocusComplete}
      />
    </>
  );
}

function UpdateCamera({
  controlsRef,
  camera,
  baseTargetRef,
  tiltOffsetRef,
  tempTarget,
  tempBase,
  introState,
  overviewCompleteRef,
  focusCompleteRef,
  focusOverrideTargetRef,
  focusOverrideOffsetRef,
  focusOverrideActiveRef,
  tempFocusPosition,
  overviewPosition,
  overviewTarget,
  focusPosition,
  focusTarget,
  onIntroOverviewComplete,
  onIntroFocusComplete
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  camera: THREE.Camera;
  baseTargetRef: MutableRefObject<THREE.Vector3>;
  tiltOffsetRef: MutableRefObject<number>;
  tempTarget: THREE.Vector3;
  tempBase: THREE.Vector3;
  introState: IntroStage;
  overviewCompleteRef: MutableRefObject<boolean>;
  focusCompleteRef: MutableRefObject<boolean>;
  focusOverrideTargetRef: MutableRefObject<THREE.Vector3 | null>;
  focusOverrideOffsetRef: MutableRefObject<THREE.Vector3 | null>;
  focusOverrideActiveRef: MutableRefObject<boolean>;
  tempFocusPosition: THREE.Vector3;
  overviewPosition: THREE.Vector3;
  overviewTarget: THREE.Vector3;
  focusPosition: THREE.Vector3;
  focusTarget: THREE.Vector3;
  onIntroOverviewComplete: () => void;
  onIntroFocusComplete: () => void;
}) {
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Rebuild the un-tilted target so user panning is respected
    tempBase.set(
      controls.target.x,
      controls.target.y + tiltOffsetRef.current,
      controls.target.z
    );
    baseTargetRef.current.lerp(tempBase, 1 - Math.exp(-delta * 6));

    if (introState === 'overview') {
      camera.position.lerp(overviewPosition, 1 - Math.exp(-delta * 1.6));
      baseTargetRef.current.lerp(overviewTarget, 1 - Math.exp(-delta * 1.6));

      if (
        !overviewCompleteRef.current &&
        camera.position.distanceTo(overviewPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(overviewTarget) < FOCUS_LERP_THRESHOLD
      ) {
        overviewCompleteRef.current = true;
        onIntroOverviewComplete();
      }
    } else if (introState === 'focusing') {
      camera.position.lerp(focusPosition, 1 - Math.exp(-delta * 2));
      baseTargetRef.current.lerp(focusTarget, 1 - Math.exp(-delta * 2));

      if (
        !focusCompleteRef.current &&
        camera.position.distanceTo(focusPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(focusTarget) < FOCUS_LERP_THRESHOLD
      ) {
        focusCompleteRef.current = true;
        onIntroFocusComplete();
      }
    }

    const heightAboveTarget = camera.position.y - baseTargetRef.current.y;
    const desiredTilt = THREE.MathUtils.clamp(heightAboveTarget * AUTO_TILT_SLOPE, 0, AUTO_TILT_MAX);
    const nextTilt = THREE.MathUtils.damp(tiltOffsetRef.current, desiredTilt, 6, delta);
    tiltOffsetRef.current = nextTilt;

    const hasFocusOverride =
      introState === 'done' &&
      focusOverrideActiveRef.current &&
      focusOverrideTargetRef.current &&
      focusOverrideOffsetRef.current;

    if (hasFocusOverride) {
      tempFocusPosition
        .copy(focusOverrideTargetRef.current)
        .add(focusOverrideOffsetRef.current);
      camera.position.lerp(tempFocusPosition, 1 - Math.exp(-delta * 3));
      baseTargetRef.current.lerp(focusOverrideTargetRef.current, 1 - Math.exp(-delta * 4));

      const positionSettled = camera.position.distanceTo(tempFocusPosition) < FOCUS_LERP_THRESHOLD;
      const targetSettled = baseTargetRef.current.distanceTo(focusOverrideTargetRef.current) < FOCUS_LERP_THRESHOLD;

      if (positionSettled && targetSettled) {
        focusOverrideActiveRef.current = false;
      }
    }

    tempTarget.set(
      baseTargetRef.current.x,
      baseTargetRef.current.y - nextTilt,
      baseTargetRef.current.z
    );

    controls.target.lerp(tempTarget, 1 - Math.exp(-delta * 6));
    controls.update();
  });

  return null;
}

export default function Board3D({ tiles }: Board3DProps) {
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
  const overviewTarget: [number, number, number] = [0, overviewTargetY, 0];
  const overviewPosition: [number, number, number] = [
    0,
    overviewTargetY + OVERVIEW_POSITION_Y_PADDING,
    gridHalfDepth + CAMERA_TILE_FRONT_GAP + OVERVIEW_POSITION_Z_PADDING
  ];

  useEffect(() => {
    if (introTileIds.length) {
      setIntroStage('dropping');
    }
  }, [introTileIds.length]);

  useEffect(() => {
    if (introStage === 'dropping' && introDropCount >= introTileIds.length) {
      setIntroStage('overview');
    }
  }, [introStage, introDropCount, introTileIds.length]);

  const handleTileDropComplete = useCallback(() => {
    setIntroDropCount((count) => Math.min(count + 1, introTileIds.length));
  }, [introTileIds.length]);

  const handleIntroOverviewComplete = useCallback(() => {
    setIntroStage('focusing');
  }, []);

  const handleIntroFocusComplete = useCallback(() => {
    setIntroStage('done');
  }, []);

  return (
    <div className="board3d">
      <Canvas camera={{ position: CAMERA_POSITION, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
          onIntroOverviewComplete={handleIntroOverviewComplete}
          onIntroFocusComplete={handleIntroFocusComplete}
          overviewTarget={overviewTarget}
          overviewPosition={overviewPosition}
          focusTarget={cameraTilePosition}
        />
      </Canvas>
    </div>
  );
}

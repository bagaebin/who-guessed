import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../state/gameStore';

type Board3DProps = {
  tiles: CharacterTile[];
};

type IntroStage = 'idle' | 'dropping' | 'overview' | 'done';
type CinematicStage = 'idle' | 'focusing' | 'holding' | 'returning';

// 한 행에 배치되는 타일 수
const TILE_COLUMNS = 8;
// 타일 사이 간격
const TILE_SPACING = 2.2;
// Camera 타일과 앞열 타일 사이 간격
const CAMERA_TILE_FRONT_GAP = TILE_SPACING * 1.6;
// Camera 기본 위치와 타일 위치 조정값
const CAMERA_POSITION: [number, number, number] = [0, 2, 8];
const CAMERA_TARGET: [number, number, number] = [0, 1.5, 0];
const INTRO_START_POSITION: [number, number, number] = [0, 4.2, 15];
const INTRO_START_TARGET: [number, number, number] = [0, 1.4, 0];
const INTRO_DROP_INTERVAL_MS = 420;
const INTRO_DROP_HEIGHT = 4.5;
const INTRO_HEIGHT_STEP = 0.6;
const parsedCameraZAdjust = Number.parseFloat(import.meta.env.VITE_CAMERA_TILE_Z_ADJUST ?? '');
const CAMERA_TILE_Y_ADJUST = Number.isFinite(parsedCameraZAdjust) ? parsedCameraZAdjust : 0;
const parsedRowStep = Number.parseFloat(import.meta.env.VITE_TILE_ROW_STEP ?? '');
const STAIR_STEP = Number.isFinite(parsedRowStep) ? parsedRowStep : 0.32;
const MAX_INTRO_TILE_COUNT = 24;
const FOCUS_LERP_THRESHOLD = 0.08;
const AUTO_TILT_SLOPE = 0.08;
const AUTO_TILT_MAX = 1.1;
const TILE_TOP_OFFSET = 1.35;
const INTRO_START_POSITION_VECTOR = new THREE.Vector3(...INTRO_START_POSITION);
const INTRO_START_TARGET_VECTOR = new THREE.Vector3(...INTRO_START_TARGET);
const CINEMATIC_FOCUS_OFFSET = new THREE.Vector3(0, 1.4, 4.4);
const CINEMATIC_HOLD_DURATION = 0.5;
const CINEMATIC_LERP_RATE = 2.6;
const CINEMATIC_RETURN_RATE = 1.9;

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
                delayMs: introIndex * INTRO_DROP_INTERVAL_MS,
                initialHeight: INTRO_DROP_HEIGHT + introIndex * INTRO_HEIGHT_STEP,
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
  overviewTarget,
  overviewPosition,
  focusTarget,
  tilePositions,
  cinematicStage,
  cinematicFocusId,
  cinematicHoldRef,
  onIntroComplete,
  onCinematicFocusReached,
  onCinematicHoldComplete,
  onCinematicReturnComplete,
  controlsLocked
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  onIntroOverviewComplete: () => void;
  overviewTarget: [number, number, number];
  overviewPosition: [number, number, number];
  focusTarget: [number, number, number];
  tilePositions: Map<string, THREE.Vector3>;
  cinematicStage: CinematicStage;
  cinematicFocusId: string | null;
  cinematicHoldRef: MutableRefObject<number>;
  onIntroComplete: () => void;
  onCinematicFocusReached: () => void;
  onCinematicHoldComplete: () => void;
  onCinematicReturnComplete: () => void;
  controlsLocked: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const baseTargetRef = useRef(new THREE.Vector3(...INTRO_START_TARGET));
  const tiltOffsetRef = useRef(0);
  const overviewCompleteRef = useRef(false);
  const introCompleteRef = useRef(false);
  const tempTarget = useMemo(() => new THREE.Vector3(), []);
  const tempBase = useMemo(() => new THREE.Vector3(), []);
  const overviewPositionVector = useMemo(() => new THREE.Vector3(...overviewPosition), [overviewPosition]);
  const overviewTargetVector = useMemo(() => new THREE.Vector3(...overviewTarget), [overviewTarget]);
  const focusTargetVector = useMemo(() => new THREE.Vector3(...focusTarget), [focusTarget]);
  const cinematicFocusTarget = useMemo(() => {
    if (!cinematicFocusId) return null;
    const position = tilePositions.get(cinematicFocusId);
    if (!position) return null;
    return position.clone().setY(position.y + TILE_TOP_OFFSET);
  }, [cinematicFocusId, tilePositions]);
  const cinematicFocusPosition = useMemo(() => {
    if (!cinematicFocusTarget) return null;
    return cinematicFocusTarget.clone().add(CINEMATIC_FOCUS_OFFSET);
  }, [cinematicFocusTarget]);

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

  const focusOnCameraTile = useCallback(() => {
    camera.position.copy(focusPositionVector);
    controlsRef.current?.target.copy(focusTargetVector);
    baseTargetRef.current.copy(focusTargetVector);
    tiltOffsetRef.current = 0;
    controlsRef.current?.update();
  }, [camera, focusPositionVector, focusTargetVector]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.enabled = !controlsLocked;
    controlsRef.current.enableRotate = !controlsLocked;
    controlsRef.current.enablePan = !controlsLocked;
    controlsRef.current.enableZoom = !controlsLocked;
  }, [controlsLocked]);

  return (
    <>
      <color attach="background" args={["#9ad6ff"]} />
      <hemisphereLight skyColor="#a3c4f9ff" groundColor="#4f6b8f" intensity={0.85} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.45} castShadow />
      <PlayerCameraTile position={cameraTilePosition} focusCamera={focusOnCameraTile} />
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
        enableRotate={false}
        enablePan
        target={INTRO_START_TARGET}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
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
        overviewPosition={overviewPositionVector}
        overviewTarget={overviewTargetVector}
        focusPosition={focusPositionVector}
        focusTarget={focusTargetVector}
        cinematicStage={cinematicStage}
        cinematicFocusPosition={cinematicFocusPosition}
        cinematicFocusTarget={cinematicFocusTarget}
        cinematicHoldRef={cinematicHoldRef}
        onIntroOverviewComplete={onIntroOverviewComplete}
        onIntroComplete={onIntroComplete}
        onCinematicFocusReached={onCinematicFocusReached}
        onCinematicHoldComplete={onCinematicHoldComplete}
        onCinematicReturnComplete={onCinematicReturnComplete}
        introCompleteRef={introCompleteRef}
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
  overviewPosition,
  overviewTarget,
  focusPosition,
  focusTarget,
  cinematicStage,
  cinematicFocusPosition,
  cinematicFocusTarget,
  cinematicHoldRef,
  onIntroOverviewComplete,
  onIntroComplete,
  onCinematicFocusReached,
  onCinematicHoldComplete,
  onCinematicReturnComplete,
  introCompleteRef
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  camera: THREE.Camera;
  baseTargetRef: MutableRefObject<THREE.Vector3>;
  tiltOffsetRef: MutableRefObject<number>;
  tempTarget: THREE.Vector3;
  tempBase: THREE.Vector3;
  introState: IntroStage;
  overviewCompleteRef: MutableRefObject<boolean>;
  overviewPosition: THREE.Vector3;
  overviewTarget: THREE.Vector3;
  focusPosition: THREE.Vector3;
  focusTarget: THREE.Vector3;
  cinematicStage: CinematicStage;
  cinematicFocusPosition: THREE.Vector3 | null;
  cinematicFocusTarget: THREE.Vector3 | null;
  cinematicHoldRef: MutableRefObject<number>;
  onIntroOverviewComplete: () => void;
  onIntroComplete: () => void;
  onCinematicFocusReached: () => void;
  onCinematicHoldComplete: () => void;
  onCinematicReturnComplete: () => void;
  introCompleteRef: MutableRefObject<boolean>;
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
    } else if (introState === 'done' && !introCompleteRef.current) {
      introCompleteRef.current = true;
      onIntroComplete();
    }

    if (cinematicStage === 'focusing' && cinematicFocusPosition && cinematicFocusTarget) {
      camera.position.lerp(cinematicFocusPosition, 1 - Math.exp(-delta * CINEMATIC_LERP_RATE));
      baseTargetRef.current.lerp(cinematicFocusTarget, 1 - Math.exp(-delta * CINEMATIC_LERP_RATE));

      if (
        camera.position.distanceTo(cinematicFocusPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(cinematicFocusTarget) < FOCUS_LERP_THRESHOLD
      ) {
        onCinematicFocusReached();
      }
    } else if (cinematicStage === 'holding') {
      cinematicHoldRef.current -= delta;
      if (cinematicHoldRef.current <= 0) {
        onCinematicHoldComplete();
      }
    } else if (cinematicStage === 'returning') {
      camera.position.lerp(INTRO_START_POSITION_VECTOR, 1 - Math.exp(-delta * CINEMATIC_RETURN_RATE));
      baseTargetRef.current.lerp(INTRO_START_TARGET_VECTOR, 1 - Math.exp(-delta * CINEMATIC_RETURN_RATE));

      if (
        camera.position.distanceTo(INTRO_START_POSITION_VECTOR) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(INTRO_START_TARGET_VECTOR) < FOCUS_LERP_THRESHOLD
      ) {
        onCinematicReturnComplete();
      }
    }

    const heightAboveTarget = camera.position.y - baseTargetRef.current.y;
    const desiredTilt = THREE.MathUtils.clamp(heightAboveTarget * AUTO_TILT_SLOPE, 0, AUTO_TILT_MAX);
    const nextTilt = THREE.MathUtils.damp(tiltOffsetRef.current, desiredTilt, 6, delta);
    tiltOffsetRef.current = nextTilt;

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
  const lastEliminatedIds = useGameStore((state) => state.lastEliminatedIds);
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];

  const introTileIds = useMemo(() => {
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    const introCount = Math.min(tiles.length, 2, MAX_INTRO_TILE_COUNT);
    return shuffled.slice(0, introCount).map((tile) => tile.id);
  }, [tiles]);

  const tilePositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    tiles.forEach((tile, index) => {
      const row = Math.floor(index / TILE_COLUMNS);
      const col = index % TILE_COLUMNS;
      const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
      const z = ((rows - 1) / 2 - row) * TILE_SPACING;
      const y = row * STAIR_STEP;
      map.set(tile.id, new THREE.Vector3(x, y, z));
    });
    return map;
  }, [rows, tiles]);

  const [cinematicStage, setCinematicStage] = useState<CinematicStage>('idle');
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const cinematicQueueRef = useRef<string[]>([]);
  const cinematicHoldRef = useRef(0);

  const cinematicFocusId = cinematicQueueRef.current[cinematicIndex] ?? null;
  const controlsLocked = cinematicStage !== 'idle';

  const overviewTarget: [number, number, number] = INTRO_START_TARGET;
  const overviewPosition: [number, number, number] = CAMERA_POSITION;

  useEffect(() => {
    if (introStage === 'idle' && introTileIds.length) {
      setIntroStage('dropping');
    }
  }, [introStage, introTileIds.length]);

  useEffect(() => {
    if (introStage === 'dropping' && introDropCount >= introTileIds.length) {
      setIntroStage('overview');
    }
  }, [introStage, introDropCount, introTileIds.length]);

  const handleTileDropComplete = useCallback(() => {
    setIntroDropCount((count) => Math.min(count + 1, introTileIds.length));
  }, [introTileIds.length]);

  const handleIntroOverviewComplete = useCallback(() => {
    setIntroStage('done');
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroStage((prev) => (prev === 'done' ? prev : 'done'));
  }, []);

  useEffect(() => {
    if (!lastEliminatedIds.length) return;
    const sorted = [...lastEliminatedIds].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    cinematicQueueRef.current = sorted;
    setCinematicIndex(0);
    setCinematicStage(sorted.length ? 'focusing' : 'idle');
  }, [lastEliminatedIds]);

  const handleCinematicFocusReached = useCallback(() => {
    cinematicHoldRef.current = CINEMATIC_HOLD_DURATION;
    setCinematicStage('holding');
  }, []);

  const handleCinematicHoldComplete = useCallback(() => {
    setCinematicIndex((index) => {
      const nextIndex = index + 1;
      if (nextIndex < cinematicQueueRef.current.length) {
        setCinematicStage('focusing');
        return nextIndex;
      }
      setCinematicStage('returning');
      return index;
    });
  }, []);

  const handleCinematicReturnComplete = useCallback(() => {
    cinematicQueueRef.current = [];
    setCinematicIndex(0);
    setCinematicStage('idle');
  }, []);

  useEffect(() => {
    if (cinematicStage === 'focusing' && !cinematicFocusId) {
      setCinematicStage('idle');
    }
  }, [cinematicFocusId, cinematicStage]);

  return (
    <div className="board3d">
      <Canvas camera={{ position: INTRO_START_POSITION, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
        introState={introStage}
        introTileIds={introTileIds}
        onIntroTileComplete={handleTileDropComplete}
        onIntroOverviewComplete={handleIntroOverviewComplete}
        overviewTarget={overviewTarget}
        overviewPosition={overviewPosition}
        focusTarget={cameraTilePosition}
        tilePositions={tilePositions}
        cinematicStage={cinematicStage}
        cinematicFocusId={cinematicFocusId}
        cinematicHoldRef={cinematicHoldRef}
        onIntroComplete={handleIntroComplete}
        onCinematicFocusReached={handleCinematicFocusReached}
        onCinematicHoldComplete={handleCinematicHoldComplete}
        onCinematicReturnComplete={handleCinematicReturnComplete}
        controlsLocked={controlsLocked}
      />
      </Canvas>
    </div>
  );
}

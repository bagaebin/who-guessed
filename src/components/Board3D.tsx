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
  lastEliminatedIds: string[];
};

type IntroStage = 'idle' | 'dropping' | 'zooming' | 'ready';
type CinematicStage = 'idle' | 'moving' | 'holding' | 'returning';

// 한 행에 배치되는 타일 수
const TILE_COLUMNS = 8;
// 타일 사이 간격
const TILE_SPACING = 2.2;
// Camera 타일과 앞열 타일 사이 간격
const CAMERA_TILE_FRONT_GAP = TILE_SPACING * 1.6;
// Camera 기본 위치와 타일 위치 조정값
const CAMERA_POSITION: [number, number, number] = [0, 2, 8];
const CAMERA_TARGET: [number, number, number] = [0, 1.4, 0];
const FRONT_OVERVIEW_POSITION: [number, number, number] = [0, 4.2, 15];
const FRONT_OVERVIEW_TARGET: [number, number, number] = [0, 1.4, 0];
const parsedCameraZAdjust = Number.parseFloat(import.meta.env.VITE_CAMERA_TILE_Z_ADJUST ?? '');
const CAMERA_TILE_Y_ADJUST = Number.isFinite(parsedCameraZAdjust) ? parsedCameraZAdjust : 0;
const parsedRowStep = Number.parseFloat(import.meta.env.VITE_TILE_ROW_STEP ?? '');
const STAIR_STEP = Number.isFinite(parsedRowStep) ? parsedRowStep : 0.32;
const MAX_INTRO_TILE_COUNT = 24;
const INTRO_DROP_COUNT = 2;
const INTRO_DROP_HEIGHT = 4.5;
const INTRO_DROP_HEIGHT_STEP = 0.6;
const INTRO_DROP_DELAY = 420;
const TILE_HEIGHT = 2.2;
const FOCUS_LERP_THRESHOLD = 0.08;
const AUTO_TILT_SLOPE = 0.08;
const AUTO_TILT_MAX = 1.1;
const TILE_TOP_OFFSET = TILE_HEIGHT / 2 + 0.25;
const CINEMATIC_FOCUS_OFFSET = new THREE.Vector3(0, 1.4, 4.4);
const CINEMATIC_HOLD_TIME = 0.5;

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
                delayMs: introIndex * INTRO_DROP_DELAY,
                initialHeight: INTRO_DROP_HEIGHT + introIndex * INTRO_DROP_HEIGHT_STEP,
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
  onIntroZoomComplete,
  cinematicState,
  cinematicFocus,
  controlsEnabled,
  onCinematicArrive,
  onCinematicHoldComplete,
  onCinematicReturnComplete
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  onIntroZoomComplete: () => void;
  cinematicState: CinematicStage;
  cinematicFocus?: { position: THREE.Vector3; target: THREE.Vector3 };
  controlsEnabled: boolean;
  onCinematicArrive: () => void;
  onCinematicHoldComplete: () => void;
  onCinematicReturnComplete: () => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const baseTargetRef = useRef(new THREE.Vector3(...FRONT_OVERVIEW_TARGET));
  const tiltOffsetRef = useRef(0);
  const tempTarget = useMemo(() => new THREE.Vector3(), []);
  const tempBase = useMemo(() => new THREE.Vector3(), []);
  const cinematicHoldRef = useRef(0);
  const defaultTarget = useMemo(() => new THREE.Vector3(...CAMERA_TARGET), []);
  const defaultPosition = useMemo(
    () => defaultTarget.clone().add(new THREE.Vector3(...CAMERA_POSITION).sub(new THREE.Vector3(...CAMERA_TARGET))),
    [defaultTarget]
  );
  const overviewPositionVector = useMemo(() => new THREE.Vector3(...FRONT_OVERVIEW_POSITION), []);
  const overviewTargetVector = useMemo(() => new THREE.Vector3(...FRONT_OVERVIEW_TARGET), []);

  const focusOnCameraTile = useCallback(() => {
    camera.position.copy(defaultPosition);
    controlsRef.current?.target.copy(defaultTarget);
    baseTargetRef.current.copy(defaultTarget);
    tiltOffsetRef.current = 0;
    controlsRef.current?.update();
  }, [camera, defaultPosition, defaultTarget]);

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
        enabled={controlsEnabled}
        enableRotate={false}
        enablePan
        target={CAMERA_TARGET}
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
        defaultPosition={defaultPosition}
        defaultTarget={defaultTarget}
        overviewPosition={overviewPositionVector}
        overviewTarget={overviewTargetVector}
        cinematicState={cinematicState}
        cinematicFocus={cinematicFocus}
        cinematicHoldRef={cinematicHoldRef}
        onIntroZoomComplete={onIntroZoomComplete}
        onCinematicArrive={onCinematicArrive}
        onCinematicHoldComplete={onCinematicHoldComplete}
        onCinematicReturnComplete={onCinematicReturnComplete}
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
  defaultPosition,
  defaultTarget,
  overviewPosition,
  overviewTarget,
  cinematicState,
  cinematicFocus,
  cinematicHoldRef,
  onIntroZoomComplete,
  onCinematicArrive,
  onCinematicHoldComplete,
  onCinematicReturnComplete
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  camera: THREE.Camera;
  baseTargetRef: MutableRefObject<THREE.Vector3>;
  tiltOffsetRef: MutableRefObject<number>;
  tempTarget: THREE.Vector3;
  tempBase: THREE.Vector3;
  introState: IntroStage;
  defaultPosition: THREE.Vector3;
  defaultTarget: THREE.Vector3;
  overviewPosition: THREE.Vector3;
  overviewTarget: THREE.Vector3;
  cinematicState: CinematicStage;
  cinematicFocus?: { position: THREE.Vector3; target: THREE.Vector3 };
  cinematicHoldRef: MutableRefObject<number>;
  onIntroZoomComplete: () => void;
  onCinematicArrive: () => void;
  onCinematicHoldComplete: () => void;
  onCinematicReturnComplete: () => void;
}) {
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Respect manual panning while controls are enabled and no cinematic is active
    if (controls.enabled && cinematicState === 'idle' && introState === 'ready') {
      tempBase.set(
        controls.target.x,
        controls.target.y + tiltOffsetRef.current,
        controls.target.z
      );
      baseTargetRef.current.lerp(tempBase, 1 - Math.exp(-delta * 6));
    }

    let desiredPosition: THREE.Vector3 | undefined;
    let desiredTarget: THREE.Vector3 | undefined;
    let lerpRate = 6;

    if (cinematicState === 'moving' || cinematicState === 'holding') {
      desiredPosition = cinematicFocus?.position;
      desiredTarget = cinematicFocus?.target;
      lerpRate = 2.6;

      if (
        cinematicState === 'moving' &&
        desiredPosition &&
        desiredTarget &&
        camera.position.distanceTo(desiredPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(desiredTarget) < FOCUS_LERP_THRESHOLD
      ) {
        onCinematicArrive();
      }
    } else if (cinematicState === 'returning') {
      desiredPosition = overviewPosition;
      desiredTarget = overviewTarget;
      lerpRate = 1.9;

      if (
        camera.position.distanceTo(overviewPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(overviewTarget) < FOCUS_LERP_THRESHOLD
      ) {
        onCinematicReturnComplete();
      }
    } else if (introState === 'zooming') {
      desiredPosition = defaultPosition;
      desiredTarget = defaultTarget;
      lerpRate = 1.6;

      if (
        camera.position.distanceTo(defaultPosition) < FOCUS_LERP_THRESHOLD &&
        baseTargetRef.current.distanceTo(defaultTarget) < FOCUS_LERP_THRESHOLD
      ) {
        onIntroZoomComplete();
      }
    }

    if (desiredPosition && desiredTarget) {
      camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * lerpRate));
      baseTargetRef.current.lerp(desiredTarget, 1 - Math.exp(-delta * lerpRate));
    }

    if (cinematicState === 'holding') {
      cinematicHoldRef.current += delta;
      if (cinematicHoldRef.current >= CINEMATIC_HOLD_TIME) {
        cinematicHoldRef.current = 0;
        onCinematicHoldComplete();
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

export default function Board3D({ tiles, lastEliminatedIds }: Board3DProps) {
  const [introStage, setIntroStage] = useState<IntroStage>('idle');
  const [introDropCount, setIntroDropCount] = useState(0);
  const [cinematicStage, setCinematicStage] = useState<CinematicStage>('idle');
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [cinematicQueue, setCinematicQueue] = useState<
    { position: THREE.Vector3; target: THREE.Vector3; id: string }[]
  >([]);
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];

  const introTileIds = useMemo(() => {
    const candidates = tiles.slice(0, MAX_INTRO_TILE_COUNT);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, INTRO_DROP_COUNT).map((tile) => tile.id);
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

  useEffect(() => {
    if (introTileIds.length) {
      setIntroStage('dropping');
    }
  }, [introTileIds.length]);

  useEffect(() => {
    if (introStage === 'dropping' && introDropCount >= introTileIds.length) {
      setIntroStage('zooming');
    }
  }, [introStage, introDropCount, introTileIds.length]);

  useEffect(() => {
    const sorted = [...lastEliminatedIds].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const focusList = sorted
      .map((id) => {
        const base = tilePositions.get(id);
        if (!base) return null;
        const focusTarget = base.clone().add(new THREE.Vector3(0, TILE_TOP_OFFSET, 0));
        const focusPosition = focusTarget.clone().add(CINEMATIC_FOCUS_OFFSET);
        return { id, position: focusPosition, target: focusTarget };
      })
      .filter(Boolean) as { position: THREE.Vector3; target: THREE.Vector3; id: string }[];

    setCinematicQueue(focusList);
    setCinematicIndex(0);
    if (!focusList.length) {
      setCinematicStage('idle');
    } else if (introStage === 'ready') {
      setCinematicStage('moving');
    }
  }, [introStage, lastEliminatedIds, tilePositions]);

  useEffect(() => {
    if (introStage === 'ready' && cinematicStage === 'idle' && cinematicQueue.length) {
      setCinematicStage('moving');
    }
  }, [cinematicQueue.length, cinematicStage, introStage]);

  const handleTileDropComplete = useCallback(() => {
    setIntroDropCount((count) => Math.min(count + 1, introTileIds.length));
  }, [introTileIds.length]);

  const handleIntroZoomComplete = useCallback(() => {
    setIntroStage('ready');
  }, []);

  const handleCinematicArrive = useCallback(() => {
    setCinematicStage('holding');
  }, []);

  const handleCinematicHoldComplete = useCallback(() => {
    setCinematicStage((current) => {
      if (current !== 'holding') return current;
      const hasNext = cinematicIndex + 1 < cinematicQueue.length;
      if (hasNext) {
        setCinematicIndex((index) => index + 1);
        return 'moving';
      }
      return 'returning';
    });
  }, [cinematicIndex, cinematicQueue.length]);

  const handleCinematicReturnComplete = useCallback(() => {
    setCinematicStage('idle');
  }, []);

  const cinematicFocus = cinematicQueue[cinematicIndex];
  const controlsEnabled = introStage === 'ready' && cinematicStage === 'idle';

  return (
    <div className="board3d">
      <Canvas camera={{ position: FRONT_OVERVIEW_POSITION, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
          onIntroZoomComplete={handleIntroZoomComplete}
          cinematicState={cinematicStage}
          cinematicFocus={cinematicFocus}
          controlsEnabled={controlsEnabled}
          onCinematicArrive={handleCinematicArrive}
          onCinematicHoldComplete={handleCinematicHoldComplete}
          onCinematicReturnComplete={handleCinematicReturnComplete}
        />
      </Canvas>
    </div>
  );
}

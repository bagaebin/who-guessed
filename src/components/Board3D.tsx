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

type IntroStage = 'idle' | 'dropping' | 'zooming' | 'done';
type EliminationStage = 'idle' | 'focusing' | 'holding' | 'outro';
type CameraScript = {
  id: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  lerp: number;
  onArrive?: () => void;
};

// 한 행에 배치되는 타일 수
const TILE_COLUMNS = 8;
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
const INTRO_TILE_COUNT = 2;
const INTRO_ZOOM_TARGET: [number, number, number] = [0, 1.4, 0];
const INTRO_ZOOM_POSITION: [number, number, number] = [0, 4.2, 15];
const AUTO_TILT_SLOPE = 0.08;
const AUTO_TILT_MAX = 1.1;
const ELIMINATION_FOCUS_OFFSET: [number, number, number] = [0, 1.4, 4.4];
const ELIMINATION_LERP = 2.6;
const ELIMINATION_FOCUS_HOLD = 500;
const WIDE_LERP = 1.9;

function TileGrid({
  tiles,
  introState,
  focusedEliminationId,
  fallenIds
}: {
  tiles: CharacterTile[];
  introState?: {
    stage: IntroStage;
    tileOrder: string[];
    onTileDropComplete: () => void;
  };
  focusedEliminationId?: string | null;
  fallenIds: Set<string>;
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
                delayMs: introIndex * 420,
                initialHeight: 5.2 + introIndex * 0.6,
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
            eliminationFocus={tile.id === focusedEliminationId}
            hasFallen={fallenIds.has(tile.id)}
          />
        );
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
  cameraScript,
  isCinematic,
  focusedEliminationId,
  fallenIds
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  introState: IntroStage;
  introTileIds: string[];
  onIntroTileComplete: () => void;
  onIntroZoomComplete: () => void;
  cameraScript?: CameraScript | null;
  isCinematic: boolean;
  focusedEliminationId?: string | null;
  fallenIds: Set<string>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const baseTargetRef = useRef(new THREE.Vector3(...CAMERA_TARGET));
  const tiltOffsetRef = useRef(0);
  const zoomCompleteRef = useRef(false);
  const scriptIdRef = useRef<string | null>(null);
  const tempTarget = useMemo(() => new THREE.Vector3(), []);
  const tempBase = useMemo(() => new THREE.Vector3(), []);
  const zoomPosition = useMemo(() => new THREE.Vector3(...INTRO_ZOOM_POSITION), []);
  const zoomTarget = useMemo(() => new THREE.Vector3(...INTRO_ZOOM_TARGET), []);

  const baseOffset = useMemo(
    () =>
      new THREE.Vector3(...CAMERA_POSITION).sub(
        new THREE.Vector3(...CAMERA_TARGET)
      ),
    []
  );

  const focusOnCameraTile = useCallback(() => {
    const targetVector = new THREE.Vector3(...cameraTilePosition);
    const nextPosition = targetVector.clone().add(baseOffset);
    camera.position.copy(nextPosition);
    controlsRef.current?.target.copy(targetVector);
    baseTargetRef.current.copy(targetVector);
    tiltOffsetRef.current = 0;
    controlsRef.current?.update();
  }, [baseOffset, camera, cameraTilePosition]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isCinematic;
    }
  }, [isCinematic]);

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
        focusedEliminationId={focusedEliminationId}
        fallenIds={fallenIds}
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
        target={CAMERA_TARGET}
        enabled={!isCinematic}
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
        zoomCompleteRef={zoomCompleteRef}
        zoomPosition={zoomPosition}
        zoomTarget={zoomTarget}
        onIntroZoomComplete={onIntroZoomComplete}
        cameraScript={cameraScript}
        scriptIdRef={scriptIdRef}
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
  zoomCompleteRef,
  zoomPosition,
  zoomTarget,
  onIntroZoomComplete,
  cameraScript,
  scriptIdRef
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  camera: THREE.Camera;
  baseTargetRef: MutableRefObject<THREE.Vector3>;
  tiltOffsetRef: MutableRefObject<number>;
  tempTarget: THREE.Vector3;
  tempBase: THREE.Vector3;
  introState: IntroStage;
  zoomCompleteRef: MutableRefObject<boolean>;
  zoomPosition: THREE.Vector3;
  zoomTarget: THREE.Vector3;
  onIntroZoomComplete: () => void;
  cameraScript?: CameraScript | null;
  scriptIdRef: MutableRefObject<string | null>;
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

    const scriptChanged = cameraScript?.id !== scriptIdRef.current;

    if (scriptChanged) {
      zoomCompleteRef.current = false;
      scriptIdRef.current = cameraScript?.id ?? null;
    }

    if (cameraScript) {
      const lerpAmount = 1 - Math.exp(-delta * cameraScript.lerp);
      camera.position.lerp(cameraScript.position, lerpAmount);
      baseTargetRef.current.lerp(cameraScript.target, lerpAmount);

      if (!zoomCompleteRef.current && camera.position.distanceTo(cameraScript.position) < 0.08) {
        zoomCompleteRef.current = true;
        cameraScript.onArrive?.();
      }
    } else if (introState === 'zooming') {
      camera.position.lerp(zoomPosition, 1 - Math.exp(-delta * 1.8));
      baseTargetRef.current.lerp(zoomTarget, 1 - Math.exp(-delta * 1.8));

      if (!zoomCompleteRef.current && camera.position.distanceTo(zoomPosition) < 0.08) {
        zoomCompleteRef.current = true;
        onIntroZoomComplete();
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
  const [introStage, setIntroStage] = useState<IntroStage>('dropping');
  const [introDropCount, setIntroDropCount] = useState(0);
  const [eliminationStage, setEliminationStage] = useState<EliminationStage>('idle');
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusedEliminationId, setFocusedEliminationId] = useState<string | null>(null);
  const [fallenIds, setFallenIds] = useState<Set<string>>(new Set());
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const introTileIds = useMemo(() => tiles.slice(0, INTRO_TILE_COUNT).map((tile) => tile.id), [tiles]);

  const tilePositionMap = useMemo(() => {
    const rowsCount = Math.ceil(tiles.length / TILE_COLUMNS);
    return new Map(
      tiles.map((tile, index) => {
        const row = Math.floor(index / TILE_COLUMNS);
        const col = index % TILE_COLUMNS;
        const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
        const z = ((rowsCount - 1) / 2 - row) * TILE_SPACING;
        const y = row * STAIR_STEP;
        return [tile.id, [x, y, z] as [number, number, number]];
      })
    );
  }, [tiles]);

  const eliminationQueue = useMemo(() => {
    return [...lastEliminatedIds].sort((a, b) => {
      const aNum = Number.parseInt(a, 10);
      const bNum = Number.parseInt(b, 10);
      if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }, [lastEliminatedIds]);

  useEffect(() => {
    if (introTileIds.length) {
      setIntroStage('dropping');
      setIntroDropCount(0);
    }
  }, [introTileIds.length]);

  useEffect(() => {
    if (introStage === 'dropping' && introDropCount >= introTileIds.length) {
      setIntroStage('zooming');
    }
  }, [introStage, introDropCount, introTileIds.length]);

  useEffect(() => {
    if (introStage !== 'done' || !eliminationQueue.length) return;
    setEliminationStage('focusing');
    setFocusIndex(0);
    setFocusedEliminationId(eliminationQueue[0] ?? null);
    setFallenIds(new Set());
  }, [introStage, eliminationQueue]);

  useEffect(() => () => holdTimerRef.current && clearTimeout(holdTimerRef.current), []);

  useEffect(() => {
    if (eliminationStage === 'focusing' && holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
    }
  }, [eliminationStage]);

  const handleTileDropComplete = useCallback(() => {
    setIntroDropCount((count) => Math.min(count + 1, introTileIds.length));
  }, [introTileIds.length]);

  const handleIntroZoomComplete = useCallback(() => {
    setIntroStage('done');
  }, []);

  const handleFocusArrive = useCallback(() => {
    if (eliminationStage !== 'focusing') return;
    setFallenIds((prev) => {
      const next = new Set(prev);
      if (focusedEliminationId) {
        next.add(focusedEliminationId);
      }
      return next;
    });
    setEliminationStage('holding');
    holdTimerRef.current = setTimeout(() => {
      setFocusIndex((index) => {
        const nextIndex = index + 1;
        const hasMore = nextIndex < eliminationQueue.length;
        setFocusedEliminationId(hasMore ? eliminationQueue[nextIndex] ?? null : null);
        setEliminationStage(hasMore ? 'focusing' : 'outro');
        return nextIndex;
      });
    }, ELIMINATION_FOCUS_HOLD);
  }, [eliminationStage, eliminationQueue, focusedEliminationId]);

  const handleWideArrive = useCallback(() => {
    setEliminationStage('idle');
  }, []);

  const cameraScript = useMemo<CameraScript | null>(() => {
    if (introStage !== 'done') return null;

    if (eliminationStage === 'focusing' && focusedEliminationId) {
      const position = tilePositionMap.get(focusedEliminationId);
      if (!position) return null;
      const target = new THREE.Vector3(position[0], position[1] + 0.25, position[2]);
      const cameraPosition = target
        .clone()
        .add(new THREE.Vector3(...ELIMINATION_FOCUS_OFFSET));

      return {
        id: `elimination-${focusedEliminationId}-${focusIndex}`,
        target,
        position: cameraPosition,
        lerp: ELIMINATION_LERP,
        onArrive: handleFocusArrive
      };
    }

    if (eliminationStage === 'outro') {
      return {
        id: 'elimination-wide',
        target: new THREE.Vector3(...INTRO_ZOOM_TARGET),
        position: new THREE.Vector3(...INTRO_ZOOM_POSITION),
        lerp: WIDE_LERP,
        onArrive: handleWideArrive
      };
    }

    return null;
  }, [introStage, eliminationStage, focusedEliminationId, tilePositionMap, focusIndex, handleFocusArrive, handleWideArrive]);

  const isCinematic = eliminationStage !== 'idle' && introStage === 'done';

  return (
    <div className="board3d">
      <Canvas camera={{ position: CAMERA_POSITION, fov: 42 }} shadows>
        <SceneContents
          tiles={tiles}
          cameraTilePosition={cameraTilePosition}
          introState={introStage}
          introTileIds={introTileIds}
          onIntroTileComplete={handleTileDropComplete}
          onIntroZoomComplete={handleIntroZoomComplete}
          cameraScript={cameraScript}
          isCinematic={isCinematic}
          focusedEliminationId={focusedEliminationId}
          fallenIds={fallenIds}
        />
      </Canvas>
    </div>
  );
}

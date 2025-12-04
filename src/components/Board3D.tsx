import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Board3DProps = {
  tiles: CharacterTile[];
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
const INTRO_BUFFER_MS = 1000;
const INTRO_CAMERA_OFFSET: [number, number, number] = [0, 3.4, 13.2];
const INTRO_TARGET_OFFSET: [number, number, number] = [0, 1.4, 0];
const CAMERA_AUTO_TILT_FACTOR = 0.12;
const CAMERA_AUTO_TILT_CLAMP = 1.2;
const CAMERA_LERP_SPEED = 0.0022;
const TILE_INTRO_DELAY_STEP_MS = 180;
const TILE_INTRO_TRAVEL_MS = 900;

function TileGrid({ tiles }: { tiles: CharacterTile[] }) {
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  return (
    <group position={[0, 0, 0]}>
      {tiles.map((tile, index) => {
        const row = Math.floor(index / TILE_COLUMNS);
        const col = index % TILE_COLUMNS;
        const x = (col - (TILE_COLUMNS - 1) / 2) * TILE_SPACING;
        const z = ((rows - 1) / 2 - row) * TILE_SPACING;
        const y = row * STAIR_STEP;
        return <TileCard key={tile.id} tile={tile} position={[x, y, z]} introIndex={index} />;
      })}
    </group>
  );
}

function SceneContents({
  tiles,
  cameraTilePosition,
  introComplete
}: {
  tiles: CharacterTile[];
  cameraTilePosition: [number, number, number];
  introComplete: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const cameraGoalRef = useRef(new THREE.Vector3(...CAMERA_POSITION));
  const targetGoalRef = useRef(new THREE.Vector3(...CAMERA_TARGET));
  const correctedTarget = useRef(new THREE.Vector3(...CAMERA_TARGET));

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
    cameraGoalRef.current.copy(nextPosition);
    targetGoalRef.current.copy(targetVector);
  }, [baseOffset, cameraTilePosition]);

  useEffect(() => {
    if (!introComplete) return;
    const zoomedPosition = new THREE.Vector3(...INTRO_CAMERA_OFFSET);
    const zoomedTarget = new THREE.Vector3(...INTRO_TARGET_OFFSET);
    cameraGoalRef.current.copy(zoomedPosition);
    targetGoalRef.current.copy(zoomedTarget);
  }, [introComplete]);

  useFrame((_, delta) => {
    const goalPosition = cameraGoalRef.current;
    camera.position.lerp(goalPosition, 1 - Math.pow(1 - CAMERA_LERP_SPEED, delta * 60));

    const baseTarget = targetGoalRef.current;
    const heightDelta = camera.position.y - baseTarget.y;
    const autoTilt = THREE.MathUtils.clamp(heightDelta * CAMERA_AUTO_TILT_FACTOR, 0, CAMERA_AUTO_TILT_CLAMP);
    correctedTarget.current.copy(baseTarget);
    correctedTarget.current.y -= autoTilt;

    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerp(correctedTarget.current, 1 - Math.pow(1 - CAMERA_LERP_SPEED, delta * 60));
      controls.update();
    } else {
      camera.lookAt(correctedTarget.current);
    }
  });

  return (
    <>
      <color attach="background" args={["#9ad6ff"]} />
      <hemisphereLight skyColor="#a3c4f9ff" groundColor="#4f6b8f" intensity={0.85} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.45} castShadow />
      <PlayerCameraTile position={cameraTilePosition} focusCamera={focusOnCameraTile} />
      <TileGrid tiles={tiles} />
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
        onChange={() => {
          const controls = controlsRef.current;
          if (!controls) return;
          cameraGoalRef.current.copy(camera.position);
          targetGoalRef.current.copy(controls.target);
        }}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
        minDistance={10}
        maxDistance={25}
      />
    </>
  );
}

export default function Board3D({ tiles }: Board3DProps) {
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const cameraTilePosition: [number, number, number] = [0, cameraTileY, cameraTileZ];
  const introDurationMs = useMemo(
    () => tiles.length * TILE_INTRO_DELAY_STEP_MS + TILE_INTRO_TRAVEL_MS + INTRO_BUFFER_MS,
    [tiles.length]
  );
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    setIntroComplete(false);
    const timer = window.setTimeout(() => setIntroComplete(true), introDurationMs);
    return () => window.clearTimeout(timer);
  }, [introDurationMs, tiles.length]);
  return (
    <div className="board3d">
      <Canvas camera={{ position: CAMERA_POSITION, fov: 42 }} shadows>
        <SceneContents tiles={tiles} cameraTilePosition={cameraTilePosition} introComplete={introComplete} />
      </Canvas>
    </div>
  );
}

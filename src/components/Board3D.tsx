import { Canvas } from '@react-three/fiber';
import { ContactShadows, GradientTexture, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCallback, useMemo, useRef } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';

type Board3DProps = {
  tiles: CharacterTile[];
};

const TILE_COLUMNS = 8;
const TILE_SPACING = 2.2;
const CAMERA_TILE_FRONT_GAP = TILE_SPACING * 1.6;
const CAMERA_POSITION: [number, number, number] = [0, 8.5, 20];
const CAMERA_TARGET: [number, number, number] = [0, 1.5, 0];
const parsedCameraZAdjust = Number.parseFloat(import.meta.env.VITE_CAMERA_TILE_Z_ADJUST ?? '');
const CAMERA_TILE_Y_ADJUST = Number.isFinite(parsedCameraZAdjust) ? parsedCameraZAdjust : 0;
const parsedRowStep = Number.parseFloat(import.meta.env.VITE_TILE_ROW_STEP ?? '');
const STAIR_STEP = Number.isFinite(parsedRowStep) ? parsedRowStep : 0.32;

function SkyBackdrop() {
  const gradientColors = useMemo(() => ['#e8f5ff', '#c8e4ff', '#a8cffc'], []);
  return (
    <mesh position={[0, 8, -60]} renderOrder={-5}>
      <planeGeometry args={[160, 120]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false}>
        <GradientTexture stops={[0, 0.55, 1]} colors={gradientColors} size={1024} />
      </meshBasicMaterial>
    </mesh>
  );
}

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
        return <TileCard key={tile.id} tile={tile} position={[x, y, z]} />;
      })}
    </group>
  );
}

export default function Board3D({ tiles }: Board3DProps) {
  const rows = Math.ceil(tiles.length / TILE_COLUMNS);
  const cameraTileZ = (rows - 1) / 2 * TILE_SPACING + CAMERA_TILE_FRONT_GAP;
  const cameraTileY = -STAIR_STEP / 2 + CAMERA_TILE_Y_ADJUST;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const focusCameraTile = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.setLookAt(...CAMERA_POSITION, 0, cameraTileY + 0.4, cameraTileZ);
  }, [cameraTileY, cameraTileZ]);

  return (
    <div className="board3d">
      <Canvas camera={{ position: CAMERA_POSITION, fov: 42 }} shadows>
        <color attach="background" args={["#cfeaff"]} />
        <fog attach="fog" args={["#cfeaff", 30, 120]} />
        <hemisphereLight skyColor="#a3c4f9ff" groundColor="#4f6b8f" intensity={0.85} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.45} castShadow />
        <SkyBackdrop />
        <PlayerCameraTile position={[0, cameraTileY, cameraTileZ]} onFocusCameraTile={focusCameraTile} />
        <TileGrid tiles={tiles} />
        <ContactShadows
          position={[0, -0.8, 0]}
          opacity={0.35}
          blur={2.5}
          scale={25}
          far={15}
        />
        <OrbitControls
          enableRotate={false}
          enablePan
          target={CAMERA_TARGET}
          ref={controlsRef}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
          minDistance={10}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}

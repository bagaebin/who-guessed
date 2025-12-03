import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';

type Board3DProps = {
  tiles: CharacterTile[];
};

const TILE_COLUMNS = 8;
const TILE_SPACING = 2.2;
const STAIR_STEP = 0.32;

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
  const cameraTileZ = ((rows - 1) / 2 + 1) * TILE_SPACING;
  const cameraTileY = -STAIR_STEP / 2;
  return (
    <div className="board3d">
      <Canvas camera={{ position: [8, 12, 14], fov: 45 }} shadows>
        <color attach="background" args={[0.06, 0.08, 0.12]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <PlayerCameraTile position={[0, cameraTileY, cameraTileZ]} />
        <TileGrid tiles={tiles} />
        <ContactShadows
          position={[0, -0.8, 0]}
          opacity={0.35}
          blur={2.5}
          scale={25}
          far={15}
        />
        <OrbitControls enablePan={false} minDistance={10} maxDistance={25} />
      </Canvas>
    </div>
  );
}

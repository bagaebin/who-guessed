import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { CharacterTile } from '../types/appearance';
import TileCard from './TileCard';
import PlayerCameraTile from './PlayerCameraTile';

type Board3DProps = {
  tiles: CharacterTile[];
};

function TileGrid({ tiles }: { tiles: CharacterTile[] }) {
  const columns = 4;
  const spacing = 2.2;
  return (
    <group position={[0, 0, 0]}>
      {tiles.map((tile, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = (col - (columns - 1) / 2) * spacing;
        const z = (row - Math.floor((tiles.length - 1) / columns) / 2) * spacing;
        return <TileCard key={tile.id} tile={tile} position={[x, 0, z]} />;
      })}
    </group>
  );
}

export default function Board3D({ tiles }: Board3DProps) {
  return (
    <div className="board3d">
      <Canvas camera={{ position: [8, 12, 14], fov: 45 }} shadows>
        <color attach="background" args={[0.06, 0.08, 0.12]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <PlayerCameraTile position={[0, -0.35, 8]} />
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

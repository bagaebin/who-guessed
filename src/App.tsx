import Board3D from './components/Board3D';
import PlayerCameraTile from './components/PlayerCameraTile';
import UiPanel from './components/UiPanel';
import { useGameStore } from './state/gameStore';
import './styles.css';

function FinalReveal() {
  const { tiles } = useGameStore();
  const remaining = tiles.filter((t) => !t.isEliminated);
  if (remaining.length !== 1) return null;
  const tile = remaining[0];
  return (
    <div className="final-reveal">
      <h2>예측된 닮은꼴</h2>
      <p>{tile.id}번 타일이 선택되었습니다.</p>
      <img src={tile.image} alt={tile.id} />
    </div>
  );
}

export default function App() {
  const tiles = useGameStore((state) => state.tiles);

  return (
    <div className="app">
      <div className="left">
        <Board3D tiles={tiles} />
        <PlayerCameraTile />
      </div>
      <div className="right">
        <UiPanel />
        <FinalReveal />
      </div>
    </div>
  );
}

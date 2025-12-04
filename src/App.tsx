import { useEffect, useState } from 'react';
import Board3D from './components/Board3D';
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
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    const handleToggle = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, []);

  return (
    <div className="app">
      <div className="left">
        <Board3D tiles={tiles} />
      </div>
      <div className={`admin-panel ${isAdminOpen ? 'admin-panel--open' : ''}`}>
        <div className="admin-panel__header">
          <p>옵션 키로 관리자 모드 전환</p>
          <button className="ghost" onClick={() => setIsAdminOpen(false)}>
            닫기
          </button>
        </div>
        <UiPanel />
        <FinalReveal />
      </div>
    </div>
  );
}

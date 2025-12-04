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
      <h2>Predicted Look-alike</h2>
      <p>Tile {tile.id} was selected.</p>
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
          <p>Press Option to toggle admin mode</p>
          <button className="ghost" onClick={() => setIsAdminOpen(false)}>
            Close
          </button>
        </div>
        <UiPanel />
        <FinalReveal />
      </div>
    </div>
  );
}

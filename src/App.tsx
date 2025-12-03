import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { useGameStore } from './state/gameStore';
import Board3D from './components/Board3D';
import ChatPanel from './components/ChatPanel';
import StatusPanel from './components/StatusPanel';
import ReasoningPanel from './components/ReasoningPanel';
import { getRemainingTiles } from './domain/phase';

function App() {
  const { tiles, round, phase, isLoading, error } = useGameStore();
  const remainingTiles = useMemo(() => getRemainingTiles(tiles), [tiles]);
  const [showProfile, setShowProfile] = useState(true);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Who Guessed?</h1>
          <p className="subtitle">LLM 기반 외모 추론 보드 게임</p>
        </div>
        <div className="toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={showProfile}
              onChange={(e) => setShowProfile(e.target.checked)}
            />
            <span>프로필/해설 보기</span>
          </label>
        </div>
      </header>
      <main className="layout">
        <section className="panel">
          <StatusPanel round={round} phase={phase} remaining={remainingTiles.length} />
          <ChatPanel isLoading={isLoading} />
          {error && <div className="error">LLM 요청 실패: {error}</div>}
        </section>
        <section className="board">
          <Canvas camera={{ position: [0, 8, 12], fov: 50 }} shadows>
            <color attach="background" args={["#0f172a"]} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <Suspense fallback={null}>
              <Board3D tiles={tiles} />
            </Suspense>
            <OrbitControls enablePan={false} minDistance={8} maxDistance={18} />
          </Canvas>
        </section>
        {showProfile && (
          <section className="panel side">
            <ReasoningPanel />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

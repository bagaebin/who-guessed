import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
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

function OutroOverlay() {
  const { tiles, reset } = useGameStore();
  const remaining = tiles.filter((t) => !t.isEliminated && t.isVisible !== false);

  if (remaining.length !== 1) return null;

  return (
    <button className="outro-replay" onClick={reset}>
      Replay
    </button>
  );
}

export default function App() {
  const tiles = useGameStore((state) => state.tiles.filter((tile) => tile.isVisible !== false));
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const isInputLocked = useGameStore((state) => state.isInputLocked);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showLogo, setShowLogo] = useState(true);

  const logoSpring = useSpring({
    from: { opacity: 0 }, // Ensure initial opacity is set
    to: { opacity: showLogo ? 1 : 0 }, // Explicitly define the target opacity
    config: { duration: 1000 },
    onChange: (props) => {
      console.log('Spring props:', props); // Log the entire props object for debugging
      console.log('Opacity is changing:', props.opacity); // Log opacity changes
    },
    onRest: () => {
      console.log('Animation complete. showLogo:', showLogo); // Log when animation completes
      if (!showLogo) {
        console.log('Fade-out complete, keeping logo in DOM.');
      }
    },
  });

  useEffect(() => {
    const handleToggle = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowLogo(false), 3000); // Fade out after 3 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const bgm = new Audio('/bgm_Who Guessed.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;

    const intro1 = new Audio('/who-guessed.mp3');
    const intro2 = new Audio('/you-are-guessed.mp3');

    const playAudio = async () => {
      try {
        await bgm.play();
        await intro1.play();
        intro1.onended = async () => {
          try {
            await intro2.play();
          } catch (e) {
            console.error('Failed to play second intro:', e);
          }
        };
      } catch (e) {
        console.error('Audio autoplay failed:', e);
      }
    };

    playAudio();

    return () => {
      bgm.pause();
      intro1.pause();
      intro2.pause();
    };
  }, []);

  return (
    <div className="app">
      <div className="animated-bg"></div>
      <div className="question-banner-wrapper">
        <div className="question-banner camera-bubble">
          <p className="question-banner__text">{currentQuestion || '질문을 준비 중이에요.'}</p>
        </div>
      </div>
      <animated.div
        style={{
          ...logoSpring,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          pointerEvents: 'none', // Prevent interaction
        }}
      >
        <img
          src="/logo_guessed-who.png"
          alt="Who Guessed? Logo"
          style={{
            width: 'clamp(150px, 80vw, 300px)', // Responsive size: min 150px, max 300px, 20% of viewport width
            height: 'auto', // Maintain aspect ratio
          }}
        />
      </animated.div>
      <div className="left">
        <Board3D tiles={tiles} />
      </div>
      <OutroOverlay />
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

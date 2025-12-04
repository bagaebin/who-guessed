import { FormEvent, useMemo } from 'react';
import { useGameStore } from '../state/gameStore';
import { eliminationRangeForPhase } from '../utils/phase';
import { AppearanceCore, CharacterTile, GamePhase } from '../types/appearance';

function ProfileList({ profile }: { profile: AppearanceCore }) {
  const entries = useMemo(() => Object.entries(profile), [profile]);
  return (
    <div className="profile">
      <h4>LLM Estimated Profile</h4>
      <ul>
        {entries.map(([key, value]) => (
          <li key={key}>
            <strong>{key}</strong>: {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasoningView({ reasoning }: { reasoning?: Record<string, string> }) {
  if (!reasoning) return null;
  return (
    <div className="reasoning">
      <h4>LLM Rationale</h4>
      <ul>
        {Object.entries(reasoning).map(([key, value]) => (
          <li key={key}>
            <strong>{key}</strong>: {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RemainingList({ tiles }: { tiles: CharacterTile[] }) {
  const remaining = tiles.filter((t) => !t.isEliminated);
  return (
    <p className="remaining">Remaining tiles: {remaining.length} / {tiles.length}</p>
  );
}

function PhaseHint({ phase }: { phase: GamePhase }) {
  const range = eliminationRangeForPhase(phase);
  return (
    <div className="phase-hint">
      <strong>Phase rules</strong>
      <p>
        In phase {phase}, {range.min}–{range.max} tiles will be flipped.
      </p>
    </div>
  );
}

function EliminationSummary({ ids, tiles }: { ids: string[]; tiles: CharacterTile[] }) {
  if (!ids.length) return null;
  const remainingLabel = new Map(tiles.map((tile) => [tile.id, tile.isEliminated ? 'Eliminated' : 'Safe']));
  return (
    <div className="elimination-summary">
      <h4>Tiles flipped this turn</h4>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <strong>{id}</strong> • {remainingLabel.get(id)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function UiPanel() {
  const {
    submitPlayerText,
    isLoading,
    round,
    phase,
    tiles,
    playerProfile,
    lastReasoning,
    statusMessage,
    reset,
    lastEliminatedIds,
    playerText,
    setPlayerText
  } = useGameStore();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = playerText.trim();
    if (!trimmed) return;
    await submitPlayerText(trimmed);
  };

  return (
    <div className="ui-panel">
      <div className="header">
        <div>
          <h1>Who Guessed?</h1>
          <p>Round {round} • Phase {phase}</p>
        </div>
        <button onClick={reset} className="ghost">New game</button>
      </div>

      <form onSubmit={handleSubmit} className="chat-box">
        <label htmlFor="playerText">Introduce yourself</label>
        <textarea
          id="playerText"
          value={playerText}
          onChange={(e) => setPlayerText(e.target.value)}
          rows={4}
          placeholder="e.g. I am..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send to LLM'}
        </button>
      </form>

      <RemainingList tiles={tiles} />
      <PhaseHint phase={phase} />

      <EliminationSummary ids={lastEliminatedIds} tiles={tiles} />

      {playerProfile && <ProfileList profile={playerProfile} />}
      <ReasoningView reasoning={lastReasoning} />
      {statusMessage && <div className="status">{statusMessage}</div>}
    </div>
  );
}

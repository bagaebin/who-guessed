import { FormEvent, useMemo } from 'react';
import { useGameStore } from '../state/gameStore';
import { eliminationRangeForPhase } from '../utils/phase';
import { AppearanceCore, CharacterTile, GamePhase } from '../types/appearance';

function ProfileList({ profile }: { profile: AppearanceCore }) {
  const entries = useMemo(() => Object.entries(profile), [profile]);
  return (
    <div className="profile">
      <h4>LLM 추정 프로필</h4>
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
      <h4>LLM 근거</h4>
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
    <p className="remaining">남은 타일: {remaining.length} / {tiles.length}</p>
  );
}

function PhaseHint({ phase }: { phase: GamePhase }) {
  const range = eliminationRangeForPhase(phase);
  return (
    <div className="phase-hint">
      <strong>Phase 규칙</strong>
      <p>
        {phase} 단계에서는 {range.min}–{range.max}장의 타일이 뒤집힙니다.
      </p>
    </div>
  );
}

function EliminationSummary({ ids, tiles }: { ids: string[]; tiles: CharacterTile[] }) {
  if (!ids.length) return null;
  const remainingLabel = new Map(tiles.map((tile) => [tile.id, tile.isEliminated ? '제거됨' : '생존']));
  return (
    <div className="elimination-summary">
      <h4>이번 턴에 뒤집힌 타일</h4>
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
          <p>라운드 {round} • 단계 {phase}</p>
        </div>
        <button onClick={reset} className="ghost">새 게임</button>
      </div>

      <form onSubmit={handleSubmit} className="chat-box">
        <label htmlFor="playerText">자신을 소개해 주세요</label>
        <textarea
          id="playerText"
          value={playerText}
          onChange={(e) => setPlayerText(e.target.value)}
          rows={4}
          placeholder="예) 저는 ..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '추론 중...' : 'LLM에게 보내기'}
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

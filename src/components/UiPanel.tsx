import { FormEvent, useMemo, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { AppearanceCore, CharacterTile } from '../types/appearance';

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

export default function UiPanel() {
  const { submitPlayerText, isLoading, round, phase, tiles, playerProfile, lastReasoning, statusMessage, reset } =
    useGameStore();
  const [text, setText] = useState('안녕하세요! 저는 단발머리에 캐주얼을 좋아해요.');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await submitPlayerText(text.trim());
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="예) 저는 ..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '추론 중...' : 'LLM에게 보내기'}
        </button>
      </form>

      <RemainingList tiles={tiles} />

      {playerProfile && <ProfileList profile={playerProfile} />}
      <ReasoningView reasoning={lastReasoning} />
      {statusMessage && <div className="status">{statusMessage}</div>}
    </div>
  );
}

import { FormEvent, useMemo } from 'react';
import { useGameStore } from '../state/gameStore';
import { eliminationRangeForPhase, isGenerationPhase } from '../utils/phase';
import {
  AppearanceCore,
  CharacterTile,
  EliminationPhase,
  GamePhase,
  GENERATION_PHASES,
  GenerationLogEntry
} from '../types/appearance';

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
  const visible = tiles.filter((t) => t.isVisible !== false);
  const remaining = visible.filter((t) => !t.isEliminated);
  return (
    <p className="remaining">Remaining tiles: {remaining.length} / {tiles.length}</p>
  );
}

function PhaseHint({ phase }: { phase: GamePhase }) {
  if (isGenerationPhase(phase)) {
    const targetByPhase: Record<typeof phase, string> = GENERATION_PHASES.reduce(
      (acc, current, index) => {
        acc[current] = `Stage ${index + 1} of 10: generate 1 image and unlock slot ${index + 1}.`;
        return acc;
      },
      {} as Record<typeof phase, string>
    );

    return (
      <div className="phase-hint">
        <strong>Generation phase</strong>
        <p>{targetByPhase[phase]}</p>
      </div>
    );
  }

  const range = eliminationRangeForPhase(phase as EliminationPhase);
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

function GenerationConsole({ logs }: { logs: GenerationLogEntry[] }) {
  if (!logs.length) return null;
  return (
    <div className="generation-console">
      <h3>Admin • Generation console</h3>
      {logs.slice(0, 3).map((log) => (
        <div key={log.timestamp} className="generation-console__entry">
          <div className="generation-console__meta">
            <strong>{log.stage.toUpperCase()}</strong>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="generation-console__prompt-label">Prompt sent</p>
          <pre className="generation-console__prompt">{log.prompt}</pre>
          <p className="generation-console__prompt-label">Question → Answer</p>
          <p className="generation-console__qa">{log.question} → {log.answer}</p>
          <div className="generation-console__images">
            {log.outputs.map((output) => (
              <figure key={output.id}>
                <img src={output.image} alt={`${output.id} placeholder`} />
                <figcaption>{output.id}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UiPanel() {
  const {
    submitPlayerText,
    isLoading,
    isInputLocked,
    round,
    phase,
    tiles,
    playerProfile,
    lastReasoning,
    statusMessage,
    reset,
    lastEliminatedIds,
    playerText,
    setPlayerText,
    currentQuestion,
    generationLogs
  } = useGameStore();

  const isSubmitDisabled = isInputLocked || (!isGenerationPhase(phase) && isLoading);

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
        <div className="question-block">
          <p className="question-label">이번 질문</p>
          <p className="question-text">{currentQuestion || '질문을 불러오는 중이에요.'}</p>
        </div>
        <label htmlFor="playerText">위 질문에 대한 답변</label>
        <textarea
          id="playerText"
          value={playerText}
          onChange={(e) => setPlayerText(e.target.value)}
          rows={4}
          placeholder="질문에 대한 생각을 알려주세요."
          disabled={isSubmitDisabled}
        />
        <button type="submit" disabled={isSubmitDisabled}>
          {isSubmitDisabled ? 'Waiting...' : 'Send to LLM'}
        </button>
      </form>

      <RemainingList tiles={tiles} />
      <PhaseHint phase={phase} />

      <EliminationSummary ids={lastEliminatedIds} tiles={tiles} />

      {playerProfile && <ProfileList profile={playerProfile} />}
      <ReasoningView reasoning={lastReasoning} />
      {statusMessage && <div className="status">{statusMessage}</div>}
      <GenerationConsole logs={generationLogs} />
    </div>
  );
}

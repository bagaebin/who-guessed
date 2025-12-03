import { GamePhase } from '../domain/gameState';

interface StatusPanelProps {
  round: number;
  phase: GamePhase;
  remaining: number;
}

const phaseLabels: Record<GamePhase, string> = {
  early: '초반 (3-4개 제거)',
  mid: '중반 (2-3개 제거)',
  late: '후반 (1-2개 제거)',
};

export default function StatusPanel({ round, phase, remaining }: StatusPanelProps) {
  return (
    <div className="card">
      <div className="card__header">
        <h2>게임 상태</h2>
      </div>
      <div className="status-grid">
        <div>
          <p className="label">라운드</p>
          <p className="value">{round}</p>
        </div>
        <div>
          <p className="label">페이즈</p>
          <p className="value">{phaseLabels[phase]}</p>
        </div>
        <div>
          <p className="label">남은 타일</p>
          <p className="value">{remaining}개</p>
        </div>
      </div>
    </div>
  );
}

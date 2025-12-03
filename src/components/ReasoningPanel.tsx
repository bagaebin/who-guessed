import { useGameStore } from '../state/gameStore';
import { AppearanceCore } from '../domain/appearance';

const profileLabels: Record<keyof AppearanceCore, string> = {
  ageGroup: '연령대',
  skinTone: '피부 톤',
  bodyShape: '체형',
  skinCondition: '피부 상태',
  hairLength: '머리 길이',
  hairStyle: '머리 스타일',
  hairColor: '머리 색상',
  glasses: '안경',
  facialHair: '얼굴 털',
  faceShape: '얼굴형',
  expressionBaseline: '표정',
  styleVibe: '스타일',
  makeupLevel: '메이크업',
  accessoriesPresence: '액세서리',
};

export default function ReasoningPanel() {
  const { playerProfile, lastReasoning } = useGameStore();

  return (
    <div className="card">
      <div className="card__header">
        <h2>LLM 추론 결과</h2>
        <p>플레이어 외모 프로필과 제거 사유</p>
      </div>
      {!playerProfile && <p className="muted">아직 추론되지 않았습니다. 채팅을 입력해보세요.</p>}
      {playerProfile && (
        <div className="profile-grid">
          {Object.entries(profileLabels).map(([key, label]) => (
            <div key={key} className="profile-row">
              <span className="label">{label}</span>
              <span className="value">{playerProfile[key as keyof AppearanceCore]}</span>
            </div>
          ))}
        </div>
      )}
      {lastReasoning && (
        <div className="reasoning">
          <h3>제거 이유</h3>
          <ul>
            {Object.entries(lastReasoning).map(([tileId, reason]) => (
              <li key={tileId}>
                <strong>{tileId}:</strong> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

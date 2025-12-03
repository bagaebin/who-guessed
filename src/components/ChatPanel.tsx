import { FormEvent, useState } from 'react';
import { useGameStore } from '../state/gameStore';

interface ChatPanelProps {
  isLoading: boolean;
}

export default function ChatPanel({ isLoading }: ChatPanelProps) {
  const [text, setText] = useState('안녕하세요! 저는 안경을 쓰고 부드러운 스타일을 좋아해요.');
  const submitTurn = useGameStore((s) => s.submitTurn);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await submitTurn(text);
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2>플레이어 채팅</h2>
        <p>LLM이 텍스트를 읽고 외모를 추론합니다.</p>
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="자신을 소개해주세요"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '분석 중...' : '추론 요청'}
        </button>
      </form>
    </div>
  );
}

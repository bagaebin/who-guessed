import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
export default function ChatPanel({ isLoading }) {
    const [text, setText] = useState('안녕하세요! 저는 안경을 쓰고 부드러운 스타일을 좋아해요.');
    const submitTurn = useGameStore((s) => s.submitTurn);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim())
            return;
        await submitTurn(text);
    };
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "\uD50C\uB808\uC774\uC5B4 \uCC44\uD305" }), _jsx("p", { children: "LLM\uC774 \uD14D\uC2A4\uD2B8\uB97C \uC77D\uACE0 \uC678\uBAA8\uB97C \uCD94\uB860\uD569\uB2C8\uB2E4." })] }), _jsxs("form", { className: "chat-form", onSubmit: handleSubmit, children: [_jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 4, placeholder: "\uC790\uC2E0\uC744 \uC18C\uAC1C\uD574\uC8FC\uC138\uC694" }), _jsx("button", { type: "submit", disabled: isLoading, children: isLoading ? '분석 중...' : '추론 요청' })] })] }));
}

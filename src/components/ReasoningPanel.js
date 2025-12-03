import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGameStore } from '../state/gameStore';
const profileLabels = {
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
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h2", { children: "LLM \uCD94\uB860 \uACB0\uACFC" }), _jsx("p", { children: "\uD50C\uB808\uC774\uC5B4 \uC678\uBAA8 \uD504\uB85C\uD544\uACFC \uC81C\uAC70 \uC0AC\uC720" })] }), !playerProfile && _jsx("p", { className: "muted", children: "\uC544\uC9C1 \uCD94\uB860\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uCC44\uD305\uC744 \uC785\uB825\uD574\uBCF4\uC138\uC694." }), playerProfile && (_jsx("div", { className: "profile-grid", children: Object.entries(profileLabels).map(([key, label]) => (_jsxs("div", { className: "profile-row", children: [_jsx("span", { className: "label", children: label }), _jsx("span", { className: "value", children: playerProfile[key] })] }, key))) })), lastReasoning && (_jsxs("div", { className: "reasoning", children: [_jsx("h3", { children: "\uC81C\uAC70 \uC774\uC720" }), _jsx("ul", { children: Object.entries(lastReasoning).map(([tileId, reason]) => (_jsxs("li", { children: [_jsxs("strong", { children: [tileId, ":"] }), " ", reason] }, tileId))) })] }))] }));
}

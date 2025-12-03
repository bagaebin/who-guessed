import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const phaseLabels = {
    early: '초반 (3-4개 제거)',
    mid: '중반 (2-3개 제거)',
    late: '후반 (1-2개 제거)',
};
export default function StatusPanel({ round, phase, remaining }) {
    return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h2", { children: "\uAC8C\uC784 \uC0C1\uD0DC" }) }), _jsxs("div", { className: "status-grid", children: [_jsxs("div", { children: [_jsx("p", { className: "label", children: "\uB77C\uC6B4\uB4DC" }), _jsx("p", { className: "value", children: round })] }), _jsxs("div", { children: [_jsx("p", { className: "label", children: "\uD398\uC774\uC988" }), _jsx("p", { className: "value", children: phaseLabels[phase] })] }), _jsxs("div", { children: [_jsx("p", { className: "label", children: "\uB0A8\uC740 \uD0C0\uC77C" }), _jsxs("p", { className: "value", children: [remaining, "\uAC1C"] })] })] })] }));
}

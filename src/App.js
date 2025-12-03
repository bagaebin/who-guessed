import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { useGameStore } from './state/gameStore';
import Board3D from './components/Board3D';
import ChatPanel from './components/ChatPanel';
import StatusPanel from './components/StatusPanel';
import ReasoningPanel from './components/ReasoningPanel';
import { getRemainingTiles } from './domain/phase';
function App() {
    const { tiles, round, phase, isLoading, error } = useGameStore();
    const remainingTiles = useMemo(() => getRemainingTiles(tiles), [tiles]);
    const [showProfile, setShowProfile] = useState(true);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "app__header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Who Guessed?" }), _jsx("p", { className: "subtitle", children: "LLM \uAE30\uBC18 \uC678\uBAA8 \uCD94\uB860 \uBCF4\uB4DC \uAC8C\uC784" })] }), _jsx("div", { className: "toggles", children: _jsxs("label", { className: "toggle", children: [_jsx("input", { type: "checkbox", checked: showProfile, onChange: (e) => setShowProfile(e.target.checked) }), _jsx("span", { children: "\uD504\uB85C\uD544/\uD574\uC124 \uBCF4\uAE30" })] }) })] }), _jsxs("main", { className: "layout", children: [_jsxs("section", { className: "panel", children: [_jsx(StatusPanel, { round: round, phase: phase, remaining: remainingTiles.length }), _jsx(ChatPanel, { isLoading: isLoading }), error && _jsxs("div", { className: "error", children: ["LLM \uC694\uCCAD \uC2E4\uD328: ", error] })] }), _jsx("section", { className: "board", children: _jsxs(Canvas, { camera: { position: [0, 8, 12], fov: 50 }, shadows: true, children: [_jsx("color", { attach: "background", args: ["#0f172a"] }), _jsx("ambientLight", { intensity: 0.4 }), _jsx("directionalLight", { position: [5, 10, 5], intensity: 1, castShadow: true }), _jsx(Suspense, { fallback: null, children: _jsx(Board3D, { tiles: tiles }) }), _jsx(OrbitControls, { enablePan: false, minDistance: 8, maxDistance: 18 })] }) }), showProfile && (_jsx("section", { className: "panel side", children: _jsx(ReasoningPanel, {}) }))] })] }));
}
export default App;

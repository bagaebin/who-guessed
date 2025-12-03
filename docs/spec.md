# "Who Guessed?" 사양 및 작업 계획 (한국어)

## 1. 목표
- 3D 보드 UI(React + React Three Fiber)로 캐릭터 타일을 배치하고 뒤집기 애니메이션 제공.
- Tier 1 AppearanceCore 스키마 기반 캐릭터/플레이어 프로필 모델 정의.
- 외부 LLM API 연동 함수(inferPlayerAppearance) 작성 및 응답 검증.
- 게임 상태(phase, round, tile 수)에 따른 제거 로직 구현.
- 모듈형 구조: `types`, `state`, `api`, `components`, `utils` 분리.

## 2. 기술 스택
- Vite + React + TypeScript
- React Three Fiber / drei로 3D 보드 표현
- Zustand 상태 관리
- Zod로 API 응답 검증

## 3. 파일 구조 계획
- `src/types/appearance.ts`: AppearanceCore, CharacterTile, GameState 정의
- `src/state/gameStore.ts`: Zustand 스토어, phase 계산 및 타일 제거 로직
- `src/api/appearanceClient.ts`: inferPlayerAppearance (mock + 실제 엔드포인트 훅) 및 응답 스키마 검증
- `src/data/tiles.ts`: 초기 타일 목록(seed)
- `src/components/Board3D.tsx`: 3D 씬/카메라/조명, 타일 렌더링
- `src/components/TileCard.tsx`: 개별 타일 메시, 뒤집기 애니메이션
- `src/components/UiPanel.tsx`: 입력창, 상태 표시, LLM reasoning 표시
- `src/utils/phase.ts`: 라운드별 phase 결정, 제거 수 범위 유틸
- `src/main.tsx`, `src/App.tsx`: 앱 엔트리 및 레이아웃

## 4. 게임 진행 시나리오
1) 플레이어가 소개 텍스트 입력 → `submitPlayerText` 호출
2) `inferPlayerAppearance`가 남은 타일 목록과 텍스트를 LLM에 전달 → profile/eliminatedIds/reasoning 수신
3) 매 응답마다 playerProfile을 최신 추론 결과로 갱신하고, 제거 리스트에 따라 타일 상태 변경 + flip 애니메이션 트리거
4) 남은 타일 수 기반 phase 업데이트(early/mid/late) 및 라운드 증가
5) 타일이 1장 남으면 최종 예측 화면 표시

## 5. 예외 및 폴백
- LLM 실패 시: mock 응답 반환 + 사용자 메시지 표시
- 응답 검증 실패 시: 제거 없이 경고 토스트/메시지(간단한 오류 텍스트)

## 6. 작업 우선순위
1) 타입/데이터/유틸 작성
2) Zustand 스토어와 mock API 연결
3) 3D 보드 + 타일 컴포넌트(기본 재질, flip 애니메이션)
4) UI 패널 및 입력 흐름 구현
5) 최소 테스트 및 스크립트 정비

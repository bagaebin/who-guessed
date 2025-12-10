# "Who Guessed?" 사양 및 작업 계획 (한국어)

## 1. 목표
- 3D 보드 UI(React + React Three Fiber)로 캐릭터 타일을 배치하고 뒤집기 애니메이션 제공.
- Tier 1 AppearanceCore 스키마 기반 캐릭터/플레이어 프로필 모델 정의.
- 외부 LLM API 연동 함수(inferPlayerAppearance) 작성 및 응답 검증.
- **이미지 생성 1~4기** 선행 단계를 통해 플레이어 텍스트를 기반으로 AppearanceCore 추론 및 새 캐릭터 타일 이미지를 생성/배치.
- 게임 상태(phase, round, tile 수)에 따른 제거 로직 구현(이미지 생성 4기 이후부터 기존 early/mid/late 단계 적용).
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
1) 게임 시작 시 플레이어 카메라 타일을 제외한 중앙에는 **빈 슬롯 1개만** 표시한다(24개 슬롯을 한꺼번에 노출하지 않음).
2) 플레이어가 소개 텍스트 입력 → `submitPlayerText` 호출.
3) **이미지 생성 1~4기**를 순차 수행하며, 기수별 요구 수량(1·3·8·12장)의 AppearanceCore 추론과 이미지 생성을 진행해 빈 캐릭터 타일을 채운다. 2~4기에서는 이전 응답을 누적 고려하며, 각 기수는 독립/분기된 추론 체인을 갖는다. 각 기수 진입 시 필요한 빈 슬롯을 **주변에 추가 생성**해 배치한다(1기: 기존 1칸, 2기 진입 시 3칸 추가, 3기 진입 시 8칸까지 확장, 4기 진입 시 12칸까지 확장).
4) 이미지 생성 4기에서는 새롭게 입력된 **네 번째 텍스트**를 반영해 기존 12개 추론 체인의 값을 모두 갱신한 뒤 이미지를 다시 생성/배치한다.
5) 이미지 생성 4기까지 완료되면 기존 단계(early → mid → late)로 전환하고, 이후 라운드마다 `inferPlayerAppearance`를 호출해 profile/eliminatedIds/reasoning 수신.
6) 매 응답마다 playerProfile을 최신 추론 결과로 갱신하고, 제거 리스트에 따라 타일 상태 변경 + flip 애니메이션 트리거.
7) 남은 타일 수 기반 phase 업데이트(early/mid/late) 및 라운드 증가. 타일이 1장 남으면 최종 예측 화면 표시.

## 5. 단계(phase) 정의
- **이미지 생성 1기**: 1장 생성. 초기 AppearanceCore 추론 1개와 해당 이미지로 첫 빈 슬롯을 채움.
- **이미지 생성 2기**: 3장 생성. 이전 텍스트 맥락을 고려하되 3개의 독립 추론 체인으로 새 AppearanceCore 3개를 생성하고, 1기 타일 주변에 추가된 3개 빈 슬롯에 배치.
- **이미지 생성 3기**: 8장 생성. 1·2기에서 확장된 4개 추론 체인 각각에서 2개씩 분기해 총 8개 AppearanceCore 추론을 생성하고, 빈 슬롯을 8칸까지 확장해 채움.
- **이미지 생성 4기**: 12장 생성. 네 번째 플레이어 텍스트를 받아 1~3기에서 유지한 12개 추론 체인의 AppearanceCore 값을 모두 최신화한 뒤, 빈 슬롯을 12칸까지 확장해 각 추론을 이미지화.
- **early/mid/late**: 이미지 생성 4기 완료 후 기존 제거 단계로 진입. 제거 수 범위는 게임플레이 문서에 정의된 기존 규칙을 따른다.

## 6. 예외 및 폴백
- LLM 실패 시: mock 응답 반환 + 사용자 메시지 표시
- 응답 검증 실패 시: 제거 없이 경고 토스트/메시지(간단한 오류 텍스트)

## 7. 작업 우선순위
1) 타입/데이터/유틸 작성
2) Zustand 스토어와 mock API 연결
3) 3D 보드 + 타일 컴포넌트(기본 재질, flip 애니메이션)
4) UI 패널 및 입력 흐름 구현
5) 최소 테스트 및 스크립트 정비

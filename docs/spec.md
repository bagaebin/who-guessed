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
2) 플레이어가 질문에 답변하면 `submitPlayerText`가 호출되고, **현재 질문 텍스트와 해당 답변**을 영어 형용구(예: "a person who …")로 정리해 기본 이미지 프롬프트(화이트 배경, 증명사진 스타일, 사실적 톤) 안에 삽입한다.
3) **이미지 생성 1~4기**를 순차 수행하며, 기수별 요구 수량(1·3·8·12장)을 이번 턴의 프롬프트로 생성한다. 생성된 이미지를 AI가 분석해 AppearanceCore를 추출/갱신하고, 각 결과를 빈 캐릭터 타일에 채워 넣는다. 기수 진입 시 필요한 빈 슬롯을 **주변에 추가 생성**해 배치한다(1기: 기존 1칸, 2기 진입 시 3칸 추가, 3기 진입 시 8칸까지 확장, 4기 진입 시 12칸까지 확장).
4) 이미지 생성 4기에서는 새롭게 입력된 **네 번째 텍스트**만으로 구성한 동일 프롬프트를 12장 생성에 적용하고, 생성된 이미지 분석 결과로 모든 AppearanceCore를 덮어쓴다(기존 분기 추론 체인은 보관하지 않으며 턴별 프롬프트에만 의존). 생성 직후 AppearanceCore 값이 고정되며 이후 제거 단계에서 활용한다.
5) 이미지 생성 4기까지 완료되면 기존 단계(early → mid → late)로 전환하고, 이후 라운드마다 `inferPlayerAppearance`를 호출해 profile/eliminatedIds/reasoning 수신.
6) 매 응답마다 playerProfile을 최신 추론 결과로 갱신하고, 제거 리스트에 따라 타일 상태 변경 + flip 애니메이션 트리거.
7) 남은 타일 수 기반 phase 업데이트(early/mid/late) 및 라운드 증가. 타일이 1장 남으면 최종 예측 화면 표시.

## 5. 단계(phase) 정의
- **이미지 생성 1기**: 1장 생성. 질문+답변 기반 프롬프트로 이미지를 생성하고, 해당 이미지를 분석해 얻은 AppearanceCore로 첫 빈 슬롯을 채움.
- **이미지 생성 2기**: 3장 생성. 같은 턴의 질문+답변 프롬프트를 3장 배치 생성해 분석·AppearanceCore를 추출하고, 1기 슬롯 주변에 추가된 3개 빈 슬롯에 채워 넣음.
- **이미지 생성 3기**: 8장 생성. 해당 턴의 질문·답변으로 작성한 프롬프트를 8장 배치 생성해 분석한 AppearanceCore 8개로 슬롯을 8칸까지 확장해 채움(분기 체인 미사용, 턴 프롬프트 단발).
- **이미지 생성 4기**: 12장 생성. **네 번째 질문·답변만**으로 구성한 프롬프트를 12장 생성·분석해 AppearanceCore 12개를 최신화하고, 슬롯을 12칸까지 확장해 채움. AppearanceCore는 생성 직후 고정되며 제거 단계에서 그대로 사용한다.
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

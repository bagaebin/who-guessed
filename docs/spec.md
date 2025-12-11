# "Who Guessed?" 사양 및 작업 계획 (한국어)

## 1. 목표
- 3D 보드 UI(React + React Three Fiber)로 캐릭터 타일을 배치하고 뒤집기 애니메이션 제공.
- Tier 1 AppearanceCore 스키마 기반 캐릭터/플레이어 프로필 모델 정의.
- 외부 LLM API 연동 함수(inferPlayerAppearance) 작성 및 응답 검증.
- **이미지 생성 1~10기** 선행 단계를 통해 플레이어 텍스트를 기반으로 AppearanceCore 추론 및 새 캐릭터 타일 이미지를 생성/배치.
- AI가 생성한 이미지를 다시 분석해 AppearanceCore를 작성·갱신하고, 이후 제거 단계에서 이 분석 결과를 활용하도록 흐름 명시.
- 질문은 DB에서 중복 없이 무작위로 선택되며, 윈도우 상단 배너에 camera-bubble 스타일로 표시된다. 답변 제출 후 이미지 생성·분석이 끝나기 전이라도 **3초 지연** 뒤에 다음 질문이 열려 연속 입력할 수 있으며, 10개 답변 후에는 이미지 완료까지 11번째 질문 입력을 잠근다.
- 게임 상태(phase, round, tile 수)에 따른 제거 로직 구현(이미지 생성 10기 이후부터 기존 early/mid/late 단계 적용).
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
1) 게임 시작 시 플레이어 카메라 타일을 제외한 중앙에는 **빈 슬롯 1개만** 표시한다(10개 슬롯을 한꺼번에 노출하지 않음).
2) 플레이어가 질문에 답변하면 `submitPlayerText`가 호출되고, **현재 질문 텍스트와 해당 답변**을 영어 형용구(예: "a person who …")로 정리해 기본 이미지 프롬프트(화이트 배경, 증명사진 스타일, 사실적 톤) 안에 삽입한다.
3) **이미지 생성 1~10기**를 순차 수행하며, 각 기수마다 1장을 이번 턴의 프롬프트로 생성한다. 생성된 이미지를 AI가 분석해 AppearanceCore를 추출/갱신하고, 각 결과를 빈 캐릭터 타일에 채워 넣는다. 매 기수 종료 시 캐릭터 타일을 **1개씩 추가 생성**해 총 10개 슬롯만 순차적으로 확장한다.
4) 10기까지 완료되면 기존 단계(early → mid → late)로 전환하고, 이후 라운드마다 `inferPlayerAppearance`를 호출해 profile/eliminatedIds/reasoning 수신.
5) 매 응답마다 playerProfile을 최신 추론 결과로 갱신하고, 제거 리스트에 따라 타일 상태 변경 + flip 애니메이션 트리거.
6) 남은 타일 수 기반 phase 업데이트(early/mid/late) 및 라운드 증가. 타일이 1장 남으면 최종 예측 화면 표시.

## 5. 단계(phase) 정의
- **이미지 생성 1~10기 공통**
  - 턴의 질문·답변을 프롬프트로 1장을 생성한 뒤, 이미지를 분석해 AppearanceCore를 추출·갱신한다.
  - 분석 결과는 생성된 슬롯에 바로 매핑되며, 10기 완료 시점까지 누적·대체된 최신 AppearanceCore가 이후 제거 단계의 판단 근거가 된다.
  - 이미지 분석/검증이 실패하면 해당 생성분을 폐기하고 이전 AppearanceCore를 유지하며, 사용자에게 재시도/폴백 메시지를 표시한다.
- **이미지 생성 1~10기**: 각 기수마다 질문+답변 기반 프롬프트로 이미지를 1장 생성·분석하고, 매 턴 종료 시 새 캐릭터 타일 슬롯을 1개씩 추가해 최대 10개 슬롯만 확보한다. 질문은 DB에서 무작위로 중복 없이 순환하며, 생성·분석이 끝나기 전이라도 **3초 지연 후** 다음 질문이 제시되어 연속 답변할 수 있다.
- **early/mid/late**: 이미지 생성 10기 완료 후 기존 제거 단계로 진입. 제거 수 범위는 게임플레이 문서에 정의된 기존 규칙을 따른다.

## 6. 예외 및 폴백
- LLM 실패 시: mock 응답 반환 + 사용자 메시지 표시
- 이미지 분석 실패 시: 해당 생성 건을 폐기하고 이전 AppearanceCore 유지, 오류 안내 표시
- 응답 검증 실패 시: 제거 없이 경고 토스트/메시지(간단한 오류 텍스트)

## 7. 작업 우선순위
1) 타입/데이터/유틸 작성
2) Zustand 스토어와 mock API 연결
3) 3D 보드 + 타일 컴포넌트(기본 재질, flip 애니메이션)
4) UI 패널 및 입력 흐름 구현
5) 최소 테스트 및 스크립트 정비

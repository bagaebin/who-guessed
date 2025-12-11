# "Who Guessed?" 게임 경험 세부 사양

본 문서는 플레이어 소개 텍스트 → 이미지 생성/분석 → LLM 제거 루프까지의 실제 코드 흐름을 정리한다. Tier 1 AppearanceCore 스키마를 기준으로 하며, UI/상태/LLM 연동을 모듈화하여 확장 가능한 구조를 제공한다.

## 1. 화면 & UX
- **3D 보드**: React Three Fiber 기반 **5열 계단형** 배치. 타일 수에 따라 행/열이 동적으로 결정되며, 카메라는 보드 전체를 담는 단일 고정 구도만 사용한다(드래그/줌/포커스 같은 사용자 조작 기능 없음). 행간 높이는 기본 0.32이며 `VITE_TILE_ROW_STEP` 환경 변수로 조정 가능.
- **플레이어 카메라 타일**: 보드 전면 하단(2배 크기). 웹캠(모바일 전면 카메라) 스트림을 비디오 텍스처로 표시하고 실패 시 동일 위치에 오류 메시지를 출력한다. `VITE_CAMERA_TILE_Z_ADJUST` 환경 변수로 타일 높낮이를 보정할 수 있다.
- **우측 패널**: Alt 키로 열리는 관리자 패널. 질문/답변 입력, 라운드·단계 표시, 남은 타일 수, LLM 추정 프로필, 마지막 제거 목록, 추론 근거, 최근 3건의 생성 프롬프트/이미지를 보여주는 generation 콘솔을 포함한다.
- **질문 배너**: 윈도우 상단에 현재 질문을 별도 UI로 노출하며, camera-bubble 스타일을 재사용한다.
- **최종 연출**: 타일 1장만 남으면 "예측된 닮은꼴" 카드와 이미지를 표시한다.

## 2. 핵심 데이터 모델 (Tier 1 강제)
- `AppearanceCore`: gender, race, ageGroup, skinTone, bodyShape, skinCondition, hairLength, hairStyle, hairColor, glasses, facialHair, faceShape, expressionBaseline, styleVibe, makeupLevel, accessoriesPresence. 모든 필드는 필수이며 `unknown` 없음.
- `CharacterTile`: { id, core: AppearanceCore, image, isEliminated, isVisible?, isGenerated? }.
- `GameState`: { tiles, playerProfile?, round, phase, isLoading, lastReasoning?, statusMessage?, lastEliminatedIds, generationLogs, pendingGenerations, generationInFlight, questionTimerId?, askedQuestionIds, playerHistory, questionHistory, generationAnswers, currentQuestion, currentQuestionId? }.
  - `tiles`: 생성/제거 상태를 포함한 전체 캐릭터 타일 배열.
  - `playerProfile?`: LLM이 추정한 최신 AppearanceCore 프로필.
  - `round`: 제거 루프 기준 진행 라운드(1부터 시작).
  - `phase`: `"early" | "mid" | "late" | "generating"` 등 단계 상태.
  - `isLoading`: 이미지 생성·분석 또는 LLM 호출 중 로딩 플래그.
  - `lastReasoning?`: 최근 LLM 응답의 근거 메시지 맵.
  - `statusMessage?`: 사용자에게 노출되는 상태/오류 안내 문자열.
  - `lastEliminatedIds`: 가장 최근 제거된 타일 ID 목록.
  - `generationLogs`: 생성 요청/프롬프트/썸네일을 기록한 로그 큐.
  - `pendingGenerations`: 아직 처리되지 않은 생성 요청 대기열.
  - `generationInFlight`: 현재 진행 중인 생성 요청 ID 또는 플래그.
  - `questionTimerId?`: 다음 질문 노출을 지연시키는 타이머 핸들.
  - `askedQuestionIds`: 이미 사용된 질문 ID 집합.
  - `playerHistory`: 플레이어 입력/세션 정보를 추적하는 기록.
  - `questionHistory`: 질문과 답변 페어의 순서를 보존하는 로그.
  - `generationAnswers`: 질문 ID별 플레이어 답변 캐시.
  - `currentQuestion`: 현재 입력창/배너에 노출되는 질문 텍스트.
  - `currentQuestionId?`: 현재 질문의 ID.

## 3. 게임 흐름
### 이미지 생성 전반부
1. 시작 시 10개 체인 슬롯(`chain-1`~`chain-10`)을 플레이스홀더로 준비하고 첫 슬롯만 보인다.
2. 질문 풀에서 무작위 질문을 선택해 상단 배너와 입력 필드에 노출하며, 한 번 노출된 ID는 다시 사용하지 않는다.
3. 답변 제출 시 `submitPlayerText`가 질문/답변을 결합한 **ID 사진 스타일** 프롬프트를 만들고, 해당 체인 1장을 생성 요청한다. 요청은 큐에 쌓여 순차 처리되며 실패 시 status 메시지를 남긴다.
4. 생성물은 즉시 이미지 분석 엔드포인트에 전송되어 AppearanceCore로 역추출되고, 해당 슬롯을 가시화한다. generation 로그에는 프롬프트, 질문/답변, 이미지 썸네일이 기록된다.
5. 답변 후 **3초 뒤** 다음 무작위 질문을 배너/입력에 표시한다. 10번째 답변 이후에는 생성 큐가 비워질 때까지 입력이 잠긴다.
6. 10칸이 모두 채워지면 phase가 early/mid/late로 전환되고, 이후 라운드마다 LLM이 제거 ID와 reasoning을 반환한다.

### 질문 제공 및 입력 흐름
1. 질문은 데이터베이스에 저장된 목록에서 무작위로 선택되며, 이미 나온 질문 ID는 `askedQuestionIds`에 기록되어 중복되지 않는다.
2. 플레이어가 답변을 제출하면 이미지 생성·분석 완료를 기다리지 않고 **3초 지연 후** 다음 질문이 상단 배너와 입력 필드에 표시되어 연속 답변할 수 있다.
3. 10개의 질문에 모두 답변하면 이미지 생성/분석이 끝날 때까지 11번째 질문 입력창과 전송 버튼이 잠금 상태로 전환된다.

### 기존 제거 루프
7. 남은 타일과 단계(early/mid/late)를 함께 LLM 엔드포인트에 POST한다.
8. 응답(`profile`, `eliminatedIds`, `reasoning`)을 Zod로 검증 후, `normalizeEliminations`로 단계별 허용 범위(early 3–4, mid 2–3, late 1–2)와 최소 1장 잔존 규칙을 강제한다.
9. 응답마다 `playerProfile`을 최신 추론 결과로 갱신하고, 제거 ID에 따라 타일 `isEliminated` 토글 + flip 애니메이션을 트리거한다.
10. 남은 타일 수 기반으로 phase를 재계산하고 round 증가. 1장 이하이면 종료 메시지 노출.
11. 실패 시 mock 응답 + 상태 메시지로 사용자에게 알림.

## 4. 단계(phase) 규칙
- **이미지 생성 1~10기**: 질문·답변 프롬프트로 각 체인 1장만 생성·분석한다. 성공 시 해당 체인을 가시화하고 generation 콘솔에 기록한다. 엔드포인트가 없으면 에러를 띄우고 진행을 중단한다.
- **early**: 3–4장 제거
- **mid**: 2–3장 제거
- **late**: 1–2장 제거
- 제거 계산 시 항상 최소 1장 이상 보드에 남도록 제한한다.

## 5. LLM 연동 계약
- 엔드포인트: `POST ${VITE_LLM_ENDPOINT}` (없으면 mock 분기)
- 바디: `{ playerText: string, remainingTiles: CharacterTile[], phase: 'early'|'mid'|'late' }`
- 응답: `{ profile: AppearanceCore, eliminatedIds: string[], reasoning?: Record<string,string> }` (Tier 1 값만 허용)
- 실패/검증 오류 시: 시드 AppearanceCore 기반 mock + 단계별 랜덤 제거 ID로 폴백.

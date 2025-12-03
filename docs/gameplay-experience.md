# "Who Guessed?" 게임 경험 세부 사양

본 문서는 플레이어 소개 텍스트 → LLM 외부 엔드포인트 → 3D 보드 반영까지의 흐름을 정의한다. Tier 1 AppearanceCore 스키마를 기반으로 하며, UI/상태/LLM 연동을 모듈화하여 확장 가능한 구조를 제공한다.

## 1. 화면 & UX
- **3D 보드**: React Three Fiber 기반 정면 시점. 타일은 8×3 격자로 배치하며 뒤집기(tilt + fade) 애니메이션을 지원하고, 각 행은 살짝씩 높아지는 계단형으로 쌓인다. 기본 카메라는 보드를 정면으로 바라보며, 드래그 시 회전 대신 카메라 위치를 평행 이동(pan)한다. 계단 높이는 기본 0.32이며 `VITE_TILE_ROW_STEP` 환경 변수를 통해 더 넓게(예: `0.5`) 조정할 수 있다.
- **플레이어 카메라 타일**: 보드 전면 하단에 3D 타일로 배치하며 보드 타일 대비 약 2배 크기. 캐릭터 타일보다 전면 간격을 넉넉히 띄워 시야를 가리지 않도록 했으며, 웹캠(모바일은 전면 카메라) 실시간 영상을 출력하고 실패 시 동일 위치에 오류 메시지를 표시한다. 전면 여유 거리는 고정이며, `VITE_CAMERA_TILE_Z_ADJUST` 환경 변수를 통해 타일의 높낮이를 위/아래로 보정할 수 있다(예: `-0.3`으로 더 낮추기).
- **우측 패널**: 채팅 입력, 라운드·단계 표시, 남은 타일 수, LLM 추정 프로필, 마지막 제거 목록, 추론 근거 표시.
- **최종 연출**: 타일 1장만 남으면 "예측된 닮은꼴" 카드와 이미지를 표시.

## 2. 핵심 데이터 모델 (Tier 1 강제)
- `AppearanceCore`: gender, race, ageGroup, skinTone, bodyShape, skinCondition, hairLength, hairStyle, hairColor, glasses, facialHair, faceShape, expressionBaseline, styleVibe, makeupLevel, accessoriesPresence. 모든 필드는 필수이며 `unknown` 없음.
- `CharacterTile`: { id, core: AppearanceCore, image, isEliminated }.
- `GameState`: { tiles, playerProfile?, round, phase, isLoading, lastReasoning?, statusMessage?, lastEliminatedIds }.

## 3. 게임 흐름
1. 플레이어가 텍스트 입력 → `submitPlayerText` 호출.
2. 남은 타일과 단계(early/mid/late)를 함께 LLM 엔드포인트에 POST.
3. 응답(`profile`, `eliminatedIds`, `reasoning`)을 Zod로 검증 후, 제거 ID를 단계별 허용 범위에 맞춰 보정(최소/최대 제거 수, 마지막 1장 보호).
4. 첫 응답 시 `playerProfile` 고정, 제거 ID에 따라 타일 `isEliminated` 토글 + flip 애니메이션.
5. 남은 타일 수 기반으로 phase 재계산, round 증가. 1장 이하이면 종료 메시지 노출.
6. 실패 시 mock 응답 + 상태 메시지로 사용자에게 알림.

## 4. 단계(phase) 규칙
- `early`: 3–4장 제거
- `mid`: 2–3장 제거
- `late`: 1–2장 제거
- 제거 계산 시 항상 최소 1장 이상 보드에 남도록 제한한다.

## 5. LLM 연동 계약
- 엔드포인트: `POST ${VITE_LLM_ENDPOINT}`
- 바디: `{ playerText: string, remainingTiles: CharacterTile[], phase: 'early'|'mid'|'late' }`
- 응답: `{ profile: AppearanceCore, eliminatedIds: string[], reasoning?: Record<string,string> }` (Tier 1 값만 허용)
- 실패/검증 오류 시: mock 프로필 + 단계별 랜덤 제거 ID로 폴백.

## 6. 모듈 책임 분리
- `types/appearance.ts`: 모든 타입 선언.
- `utils/phase.ts`: 남은 타일 수로 phase 산출, 단계별 제거 범위 반환.
- `utils/elimination.ts`: LLM 제거 ID 정제(중복/존재 여부 필터) 및 단계별 최소/최대 맞춤.
- `api/appearanceClient.ts`: LLM 호출, 응답 검증, mock 분기, 정제 헬퍼 제공.
- `state/gameStore.ts`: submit/reset 로직, phase 업데이트, 타일 상태 반영.
- `components/Board3D.tsx`, `TileCard.tsx`: 3D 씬과 타일 메시, flip 애니메이션.
- `components/PlayerCameraTile.tsx`: 3D 플레이어 카메라 타일(보드 전면 하단), 전면 카메라/웹캠 실시간 피드 + 오류 안내 표시.
- `components/UiPanel.tsx`: 입력 흐름, 요약/프로필/근거/제거 정보 표시.

## 7. 확장 포인트
- 이미지 자산 교체: `CharacterTile.image`에 프롬프트 기반 생성물 연결 가능.
- 애니메이션 강화: TileCard 스프링 파라미터 및 머티리얼 커스텀.
- 평가/리플레이 로깅: `reasoning` 및 제거 히스토리를 추가 스토어 필드로 기록 가능.

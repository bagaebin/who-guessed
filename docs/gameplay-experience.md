# "Who Guessed?" 게임 경험 세부 사양

본 문서는 플레이어 입력 → 이미지 생성/분석 → 3D 보드 반영 → 제거 루프까지 **현재 구현된 코드**를 기준으로 설명한다.

## 1. 화면 & UX
- **3D 보드**: 5열 계단형 격자. 카메라는 고정 시점이며 사용자 조작이 없고, ContactShadows로 입체감만 추가한다.【F:src/components/Board3D.tsx†L15-L105】
- **플레이어 카메라 타일**: 전면 하단에 큰 타일로 배치되고 웹캠을 시도한다. 실패 시 오류 메시지/색상 패널을 노출한다.【F:src/components/PlayerCameraTile.tsx†L14-L156】
- **질문 배너**: 창 상단에 camera-bubble 스타일 배너가 고정되어 현재 질문을 노출한다.【F:src/App.tsx†L17-L78】
- **우측(admin) 패널**: Alt 키로 열고 닫는다. 라운드/페이즈, 질문/답변 폼, LLM 프로필/근거, 이번 턴 제거 목록, 생성 로그를 확인한다.【F:src/App.tsx†L20-L78】【F:src/components/UiPanel.tsx†L79-L155】
- **최종 연출**: 남은 타일이 1장일 때 "Predicted Look-alike" 카드와 선택된 이미지를 표시한다.【F:src/App.tsx†L1-L25】

## 2. 데이터 모델(Tier 1 강제)
- `AppearanceCore`: 성별·인종·연령·피부·체형·헤어·표정·스타일·액세서리 등 15개 필드 모두 필수이며 `unknown` 없음.【F:src/types/appearance.ts†L1-L66】
- `CharacterTile`: { id, core, image, isEliminated, isVisible?, isGenerated? }.
- `GameState`: 질문·답변 히스토리, generation 큐, round/phase, LLM 결과, 마지막 제거 ID, generation 로그를 포함한다.【F:src/types/appearance.ts†L92-L136】

## 3. 게임 흐름
### 이미지 생성 1~10기
1. **시작 상태**: 10개 chain 슬롯이 예약되어 있으나 gen1에서는 첫 슬롯만 보인다. 나머지는 generation 단계별로 순차 해제된다.【F:src/state/gameStore.ts†L87-L135】
2. **프롬프트 구성**: 현재 질문과 답변을 영어 구문으로 합쳐 화이트 배경 증명사진 스타일 프롬프트를 만든다.【F:src/state/gameStore.ts†L141-L188】
3. **생성/분석**: `VITE_IMAGE_ENDPOINT`로 1장을 생성하고, `VITE_IMAGE_ANALYSIS_ENDPOINT`에 묶음으로 보내 AppearanceCore를 추출한다. 엔드포인트가 없으면 에러로 중단되고 모킹되지 않는다.【F:src/api/imageClient.ts†L31-L58】【F:src/api/imageAnalysisClient.ts†L20-L53】
4. **슬롯 반영**: 분석 결과(또는 파생 코어)를 슬롯에 기록하고 이미지 텍스처를 바꾼 뒤, generation 로그에 프롬프트/질문/답변/결과 이미지를 남긴다.【F:src/state/gameStore.ts†L305-L373】
5. **질문 회전**: 제출 직후 입력을 잠그고 3초 타이머 후 다음 무작위 질문으로 교체한다. generation 답변이 10개 누적되면 생성/분석 완료까지 입력이 잠긴다.【F:src/state/gameStore.ts†L38-L110】【F:src/state/gameStore.ts†L424-L498】

### 기존 제거 루프
6. 10기 완료 후 남은 타일 수로 early/mid/late를 재계산하고, `inferPlayerAppearance`를 호출한다. LLM 엔드포인트 미설정 시 seed 기반 mock 프로필 + 랜덤 제거가 적용된다.【F:src/state/gameStore.ts†L261-L305】【F:src/api/appearanceClient.ts†L44-L86】
7. 응답을 Zod로 검증 후 제거 ID를 단계별 min/max에 맞춰 보정하고, 뒤집기 애니메이션으로 표시한다.【F:src/api/appearanceClient.ts†L1-L43】【F:src/utils/elimination.ts†L14-L46】
8. round 증가 및 phase 업데이트 후, 남은 타일이 1장일 때 최종 예측 카드가 노출된다.【F:src/state/gameStore.ts†L498-L536】【F:src/App.tsx†L1-L25】

## 4. 페이즈 규칙 & 제거 범위
- **생성 단계(gen1~gen10)**: 각 단계마다 슬롯 1개를 unlock + 1장 생성/분석. 가시 슬롯은 단계 수만큼으로 제한된다.【F:src/state/gameStore.ts†L235-L260】
- **early**: 남은 타일 > 60% (최소 6장)일 때, 3~4장 제거.【F:src/utils/phase.ts†L8-L19】
- **mid**: 남은 타일 > 30%일 때, 2~3장 제거.【F:src/utils/phase.ts†L8-L19】
- **late**: 그 이하, 1~2장 제거. 항상 1장 이상 보존.【F:src/utils/phase.ts†L8-L25】【F:src/utils/elimination.ts†L14-L46】

## 5. 예외/리스크 알림
- 이미지 엔드포인트 누락 시 생성 단계가 즉시 실패하며 자동 폴백이 없다. `.env.example` 및 운영 매뉴얼이 필요하다.【F:src/api/imageClient.ts†L31-L58】
- 생성 실패 슬롯은 placeholder로 남지만 재시도 로직이 없어 관리자가 수동 개입해야 한다.【F:src/state/gameStore.ts†L305-L373】
- 질문 풀이 모두 소진될 수 있으므로, 빈 질문 상태 안내 또는 풀 확장 지침을 추가해야 한다.【F:src/state/gameStore.ts†L38-L110】
- LLM 엔드포인트 미설정 시 제거 결과가 랜덤이므로 테스트/운영 환경 구분 표시가 필요하다.【F:src/api/appearanceClient.ts†L44-L86】

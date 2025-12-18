# "Who Guessed?" 현재 사양 및 코드 구조 정리

## 1. 핵심 목표(현재 코드 기준)
- React + React Three Fiber로 **5열 격자** 보드와 플레이어 카메라 타일을 렌더링하고, 타일 드롭/뒤집기 애니메이션을 제공한다.【F:src/components/Board3D.tsx†L15-L108】【F:src/components/TileCard.tsx†L1-L120】
- Tier 1 **AppearanceCore** 스키마를 강제하며, LLM 추론·이미지 생성/분석 결과를 모두 이 스키마로 검증·보정한다.【F:src/types/appearance.ts†L1-L91】【F:src/api/appearanceClient.ts†L1-L43】
- **이미지 생성 1~10기**를 선행해 슬롯을 하나씩 해제하고, 각 턴의 질문·답변으로 만든 단일 프롬프트로 이미지를 생성 → 외부 분석으로 AppearanceCore를 추출한다.【F:src/state/gameStore.ts†L141-L226】【F:src/state/gameStore.ts†L305-L371】
- 생성된 슬롯이 10개 모두 채워지면 기존 **early/mid/late 제거 단계**로 전환해 LLM 응답에 따라 타일을 제거한다.【F:src/state/gameStore.ts†L261-L305】【F:src/utils/phase.ts†L5-L25】
- 질문은 **DB 풀에서 무작위·무중복**으로 선택되고, 답변을 제출하면 **3초 지연 후** 다음 질문이 배너와 입력 필드에 열린다. 10개 답변을 제출하고 생성/분석이 끝날 때까지 입력이 잠긴다.【F:src/state/gameStore.ts†L38-L110】【F:src/state/gameStore.ts†L424-L498】

## 2. 주요 기술 스택
- Vite + React + TypeScript
- React Three Fiber / drei (3D 씬, 섀도우, 텍스처 처리)
- Zustand + immer로 단일 스토어 관리
- Zod로 외부 응답 검증
- 환경 변수: `VITE_IMAGE_ENDPOINT`, `VITE_IMAGE_ANALYSIS_ENDPOINT`, `VITE_LLM_ENDPOINT`, `VITE_TILE_ROW_STEP`, `VITE_CAMERA_TILE_Z_ADJUST`, `VITE_TILE_DROP_DELAY`

## 3. 실제 파일 구조와 책임
- `src/types/appearance.ts`: AppearanceCore, GameState, 단계 열거형, Generation 로그 타입 정의.
- `src/state/gameStore.ts`: 질문 회전(3초 지연), 10회 생성 큐, 가시 슬롯/페이즈 관리, LLM 제거 루프, 상태 메시지/로그 축적.
- `src/api/imageClient.ts`: 프롬프트 + chainId 묶음으로 **실제 이미지 엔드포인트만** 호출(모킹 없음).
- `src/api/imageAnalysisClient.ts`: 생성 이미지 묶음을 외부 분석 서비스에 전송해 AppearanceCore를 받아오며, 데이터 URL을 512px 기준으로 압축.
- `src/api/appearanceClient.ts`: LLM 추론 호출 및 mock 폴백(엔드포인트 미설정 시 랜덤 제거).
- `src/components/Board3D.tsx`: 고정 카메라/조명, 플레이어 카메라 타일, ContactShadows, 5열 격자 타일 배치, 인트로 드롭 순서 관리.
- `src/components/TileCard.tsx`: 엘리미네이션(90° 전방 회전) 및 드롭 스프링, 텍스처 로딩, 불투명도/경사 제어.
- `src/components/PlayerCameraTile.tsx`: 웹캠 피드 비율 보정, 글로벌 키 입력 포커스, 3D 말풍선 입력 처리.
- `src/components/UiPanel.tsx`: 라운드/페이즈, 질문/답변 폼, LLM 프로필·근거, 제거 결과, 생성 로그(admin) 표시.

## 4. 진행 시나리오(현 구조)
1) 초기 슬롯은 10개가 예약되어 있으며, **gen1**에서 첫 슬롯만 `isVisible` 상태로 시작한다.【F:src/state/gameStore.ts†L87-L135】
2) 플레이어 답변을 받으면 해당 턴의 질문·답변으로 프롬프트를 구성하고, `VITE_IMAGE_ENDPOINT`로 1장 생성 → `VITE_IMAGE_ANALYSIS_ENDPOINT`로 AppearanceCore 추출 후 슬롯을 채운다. 실패 시 동일 슬롯을 placeholder로 유지하고 상태 메시지를 남긴다.【F:src/state/gameStore.ts†L165-L226】【F:src/state/gameStore.ts†L305-L373】
3) 답변 제출 직후 **입력 잠금 + 3초 타이머**가 걸리고, 타이머가 끝나면 다음 무작위 질문으로 교체된다. 10개의 답변이 등록되면 생성/분석 완료까지 추가 입력이 잠긴다.【F:src/state/gameStore.ts†L38-L110】【F:src/state/gameStore.ts†L424-L498】
4) 10기 생성이 모두 끝나면 `getPhaseFromRemaining` 규칙(60%/30% 경계)으로 early/mid/late를 산정하고, `inferPlayerAppearance` 호출로 제거 및 추론 프로필을 갱신한다.【F:src/state/gameStore.ts†L261-L305】【F:src/utils/phase.ts†L8-L25】
5) 타일 1장만 남으면 최종 예측 카드가 표시되고, 새 게임 버튼으로 상태를 리셋한다.【F:src/App.tsx†L1-L85】【F:src/state/gameStore.ts†L498-L536】

## 5. 단계 규칙
- **gen1~gen10**: 각 단계마다 슬롯을 하나씩 해제하고, 해당 턴 질문·답변으로 구성한 단일 프롬프트로 1장 생성·분석한다. 가시 슬롯 수는 단계 인덱스+1 로 제한된다.【F:src/state/gameStore.ts†L235-L260】
- **early/mid/late**: 남은 타일 수(최초 10장 기준 60%/30%)에 따라 결정되며, 제거 범위는 phase 유틸이 반환하는 min/max를 따른다.【F:src/utils/phase.ts†L8-L25】【F:src/utils/elimination.ts†L14-L46】

## 6. 예외·취약 지점
- 이미지 생성/분석 엔드포인트가 설정되지 않으면 **생성 큐가 에러로 종료**되며, 자동 모킹이 없다. .env 샘플 공유가 필요하다.【F:src/api/imageClient.ts†L31-L58】【F:src/api/imageAnalysisClient.ts†L20-L53】
- LLM 엔드포인트가 없을 때는 seed 프로필을 기반으로 랜덤 제거가 이뤄지므로, 테스트/운영 분리를 명시해야 한다.【F:src/api/appearanceClient.ts†L44-L86】
- generation 실패 시 선택한 슬롯은 placeholder로 남고 round는 증가하지만, 실패 슬롯 재시도 루틴이 없다(관리자 대응 필요).【F:src/state/gameStore.ts†L305-L373】
- 질문 풀이 모두 소진되면 `currentQuestion`가 빈 문자열로 남아 안내 문구가 필요하다.【F:src/state/gameStore.ts†L38-L110】

## 7. 추가 문서 제안
- `.env.example` 또는 **엔드포인트 운영 가이드**: 이미지/분석/LLM 세 엔드포인트를 모두 요구하므로 필수.
- **운영 플레이북**: 생성 실패 슬롯을 어떻게 재시도/수동 패치할지, 질문 풀이 소진됐을 때 UX 처리 방침 등을 기록.

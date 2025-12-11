# "Who Guessed?" 사양 및 코드 동기화 (한국어)

## 1. 목표
- React + React Three Fiber로 **10칸 한정**의 3D 캐릭터 보드를 구성하고, 각 타일에 뒤집기/낙하 애니메이션을 부여한다.
- Tier 1 AppearanceCore 스키마 기반 타입을 유지하고, LLM 및 이미지 생성/분석 엔드포인트를 거쳐 AppearanceCore를 검증한다.
- **이미지 생성 1~10기**를 거치며 각 턴의 질문·답변으로만 프롬프트를 구성해 이미지를 1장씩 생성한다. 생성물은 즉시 분석해 AppearanceCore를 채우고, 생성된 슬롯만 단계적으로 공개한다.
- 질문 풀은 중복 없이 무작위로 순회하며, 답변 제출 후 **3초 지연** 뒤 다음 질문을 띄워 연속 입력을 허용한다. 10번째 답변 이후에는 생성/분석이 끝날 때까지 입력을 잠근다.
- 10기 완료 시점부터 early/mid/late 제거 규칙으로 전환하며, 남은 타일 수로 phase를 재계산한다.
- 모듈 분리(`types`, `state`, `api`, `components`, `utils`)와 Zod 검증, 상태 로깅(생성 콘솔) 흐름을 코드와 일치하도록 문서화한다.

## 2. 기술 스택
- Vite + React + TypeScript
- React Three Fiber / drei로 3D 보드 표현
- Zustand 상태 관리
- Zod로 API 응답 검증

## 3. 주요 파일 매핑
- `src/types/appearance.ts`: AppearanceCore/CharacterTile/GameState, 10단계 generation phase, generation 로그/작업 큐 타입.
- `src/state/gameStore.ts`: 질문 무중복 추출, 3초 지연 스케줄링, 이미지 생성 작업 큐 처리, Zod 기반 LLM/이미지 API 통합, phase/round 업데이트, 가시 슬롯 제어(기수별 1칸씩 공개).
- `src/api/appearanceClient.ts`: LLM 호출 및 mock 폴백, 단계별 제거 수 범위 적용.
- `src/api/imageClient.ts`: VITE_IMAGE_ENDPOINT 필수, 프롬프트/chainIds POST 전송.
- `src/api/imageAnalysisClient.ts`: VITE_IMAGE_ANALYSIS_ENDPOINT 필수, 생성 이미지 압축 후 AppearanceCore 역추출.
- `src/data/tiles.ts`: 시드 AppearanceCore와 플레이스홀더 이미지(첫 10개만 슬롯에 사용).
- `src/components/Board3D.tsx`: 5열 계단식 배치, 최대 24장까지 순차 낙하 인트로, 고정 시점 카메라.
- `src/components/TileCard.tsx`: tilt + fade 뒤집기, 인트로 낙하 스프링.
- `src/components/UiPanel.tsx`: 질문/답변 입력, phase 규칙 안내, 제거/생성 로그 표시.
- `src/components/PlayerCameraTile.tsx`: 전면 카메라 스트림, camera-bubble 입력, 키보드 포커스 단축키 처리.
- `src/App.tsx`: 상단 질문 배너, Alt 키 기반 관리자 패널 토글, 로고 페이드/오디오 처리.

## 4. 게임 진행 시나리오
1) 시작 시 10칸짜리 체인 ID(`chain-1`~`chain-10`)를 플레이스홀더로 준비하고, 첫 슬롯만 가시 상태로 만든다.
2) 질문 풀에서 무작위 1개를 선택해 상단 배너와 입력 필드에 노출한다. Alt 키로 관리자 패널을 토글할 수 있다.
3) 플레이어가 답변을 제출하면 `submitPlayerText`가 질문/답변을 조합해 **ID 사진 톤**의 프롬프트를 만들고, 해당 체인에 1장 이미지 요청 → 생성물 분석 → AppearanceCore 주입을 백그라운드로 진행한다.
4) 생성 작업은 큐에 쌓여 순차 실행된다. 실패 시 환경 변수 누락/404 안내 메시지가 status로 기록된다.
5) 답변 직후 **3초 뒤** 다음 질문을 무작위·무중복으로 표시한다. 생성 10회가 끝나면 새 질문/입력을 잠그고 처리 완료를 기다린다.
6) 10칸 모두 채워지면 phase를 early/mid/late로 전환하고, 이후 라운드마다 LLM을 호출해 제거 ID와 reasoning을 반영한다.
7) 남은 타일 수에 따라 phase를 재산정하며, 1장만 남으면 "Predicted Look-alike" 화면을 표시한다.

## 5. 단계(phase) 정의
- **이미지 생성 gen1~gen10**
  - 매 턴 질문/답변으로 만든 프롬프트로 해당 체인 1장을 생성한다.
  - `requestImages`는 엔드포인트 미설정 시 즉시 에러를 던지고, `analyzeGeneratedImages`는 JPEG로 축소·압축 후 AppearanceCore를 역추출한다(엔드포인트 필수).
  - 생성/분석 성공 시 슬롯을 가시화하고 `generationLogs`에 프롬프트와 결과 이미지를 기록한다.
  - 실패 시 슬롯은 플레이스홀더 유지, status 메시지로 원인을 노출한다.
- **early/mid/late 제거 단계**
  - `inferPlayerAppearance`가 LLM 응답을 Zod로 검증하고, 실패 시 시드 타일 기반 mock + 단계별 랜덤 제거를 반환한다.
  - `normalizeEliminations`가 존재하는 ID만 남기고, phase별 최소/최대(early 3–4, mid 2–3, late 1–2)와 "최소 1장 남김" 제약을 강제한다.
  - 남은 타일 수로 phase를 재계산하며 round를 증가시킨다.

## 6. 예외 및 폴백
- LLM 실패 시: mock AppearanceCore/랜덤 제거 ID, reasoning에 mock 메시지 포함.
- 이미지 생성 엔드포인트 누락: 즉시 오류를 던져 큐 진행을 중단하고 status로 알린다.
- 이미지 분석 실패 시: 에러를 상태 메시지로 노출하고 슬롯은 플레이스홀더 유지.
- 모든 예외에서 입력 필드는 적절히 잠금/해제되며, 작업 큐가 비워지면 잠금을 해제한다.

## 7. 동작/테스트 체크포인트
- 질문은 중복 없이 순회하고 답변 10회 후 입력이 잠기는지 확인.
- 이미지 엔드포인트가 없을 때 status 메시지가 노출되고 큐가 중단되는지 확인.
- gen1~gen10 완료 후 phase가 early/mid/late로 전환되고 제거 범위가 적용되는지 검증.
- 타일 남은 수가 1일 때 Final reveal 패널이 나타나는지 확인.

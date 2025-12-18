# Architecture & Risk Overview

이 문서는 현재 코드베이스의 모듈 구성, 데이터 흐름, 리스크, 추가 문서 필요성을 요약한다.

## 시스템 구성
- **렌더링**: `src/components/Board3D.tsx`가 고정 카메라와 5열 격자, 인트로 드롭 상태를 제어하고, `TileCard`/`PlayerCameraTile`이 실제 메시와 입력을 담당한다.【F:src/components/Board3D.tsx†L15-L139】【F:src/components/TileCard.tsx†L1-L120】
- **상태 관리**: `src/state/gameStore.ts` 단일 스토어가 질문 회전, generation 큐, elimination, 로그/히스토리를 모두 관리한다. Generation 10단계가 끝나야 elimination으로 전환한다.【F:src/state/gameStore.ts†L38-L110】【F:src/state/gameStore.ts†L235-L305】
- **데이터 모델**: Tier 1 AppearanceCore와 GameState/Generation 로그 타입을 `src/types/appearance.ts`에서 정의하고 모든 외부 응답에 Zod 검증을 적용한다.【F:src/types/appearance.ts†L1-L136】【F:src/api/appearanceClient.ts†L1-L43】
- **API 클라이언트**: 이미지 생성(`imageClient`), 이미지 분석(`imageAnalysisClient`), LLM 추론(`appearanceClient`)이 각각 독립 모듈로 분리되어 있으며, 생성/분석은 엔드포인트 미설정 시 에러를 던지고 멈춘다.【F:src/api/imageClient.ts†L31-L58】【F:src/api/imageAnalysisClient.ts†L20-L53】【F:src/api/appearanceClient.ts†L44-L86】

## 흐름 요약
1. 질문/답변을 받아 프롬프트 생성 → 이미지 생성 요청 → 이미지 분석 요청 → 슬롯 갱신 → generation 로그 기록.
2. 답변 제출 직후 3초 후 다음 질문으로 교체하며, 10회 답변 완료 시 생성/분석 완료까지 입력 잠금.
3. 10기 생성 완료 후 LLM 추론으로 제거 ID/프로필을 수신하고, phase 규칙(min/max)으로 보정해 타일을 제거.

## 주요 리스크/취약점
- **엔드포인트 의존**: 이미지 생성·분석은 모킹이 없어 .env 미설정 시 게임이 진행되지 않는다. LLM 엔드포인트 없으면 랜덤 제거가 실행된다.
- **재시도 부재**: generation 실패 시 해당 슬롯이 placeholder로 남고 자동 재시도가 없다. 운영 재시도 방법을 정해야 한다.
- **질문 고갈**: 질문 풀이 모두 소진되면 빈 문자열이 노출된다. 보강 UX 또는 질문 확장 규칙이 필요하다.
- **오디오/웹캠 권한**: `App.tsx`와 `PlayerCameraTile` 모두 브라우저 권한에 의존하며, 실패 시 fallback 메시지가 전면 노출된다.

## 이미지 생성 속도 개선 전략
- **백엔드 추론 비용 축소**: 생성 엔드포인트에서 해상도·스텝 수·CFG 스케일을 낮추고, 모델·LoRA를 미리 로딩해 워밍업(첫 요청 지연 완화)을 적용한다. 캐시된 VAE/텍스처를 재활용하면 GPU 메모리 할당이 줄어든다.
- **프롬프트·입력 최적화**: `chainIds`를 그대로 전달해 중복 프롬프트 생성을 피하고, 불필요한 수식어(스타일/배경 고정 문구)를 템플릿에서 제거해 토큰 길이를 줄인다. 고정된 negative prompt를 재사용해 토큰화를 캐시할 수 있다.
- **배치/병렬 처리**: 단일 인스턴스가 여러 장을 배치 처리할 수 있다면 `chainIds` 묶음 생성으로 HTTP 오버헤드를 줄인다. 반대로 GPU가 여럿이면 생성 워커를 병렬로 띄우고 앞단에서 라운드로빈으로 분산한다.
- **압축·전송 최적화**: 생성물을 클라이언트로 보낼 때 JPEG 품질을 서버에서 먼저 조정하거나 WebP로 내려주면 네트워크 지연을 줄이고 `imageAnalysisClient`가 실행하는 512p 리사이즈 전에 용량을 줄일 수 있다.【F:src/api/imageAnalysisClient.ts†L23-L72】
- **큐 운영**: 현재 프런트는 한 번에 한 슬롯씩 `pendingGenerations` 큐로 직렬 처리한다. 백엔드가 감당 가능할 경우 동일 라운드의 슬롯을 2~3장씩 한 번에 보내도록 큐 파라미터(배치 크기, 동시 요청 제한)를 조정하는 옵션을 운영 가이드로 추가한다.

## 추가 문서/운영 가이드 제안
- **.env.example**: `VITE_IMAGE_ENDPOINT`, `VITE_IMAGE_ANALYSIS_ENDPOINT`, `VITE_LLM_ENDPOINT`, `VITE_TILE_ROW_STEP`, `VITE_CAMERA_TILE_Z_ADJUST`, `VITE_TILE_DROP_DELAY` 샘플 값 포함.
- **운영 플레이북**: 생성 실패 슬롯을 재시도/수동 교체하는 절차, 질문 고갈 시 처리 지침, 엔드포인트 장애 시 안내 문구 템플릿.
- **보안/프라이버시 메모**: 브라우저 카메라·오디오 권한 요청에 대한 공지/동의 문구, 로그(질문·답변) 보관 정책을 명문화.

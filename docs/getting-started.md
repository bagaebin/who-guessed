# "Who Guessed?" 초보자용 초기 셋업 가이드

이 문서는 처음으로 프로젝트를 받아 로컬에서 실행해 보려는 분들을 위한 단계별 안내입니다. Node.js와 npm만 설치되어 있으면 바로 시작할 수 있습니다.

## 1. 사전 준비물
- **Node.js 18+**(권장)와 **npm**이 필요합니다. 설치 여부는 다음 명령으로 확인할 수 있습니다.
  ```bash
  node -v
  npm -v
  ```
- 그래픽 드라이버가 최신 상태라면 React Three Fiber 렌더링이 더 매끄럽게 동작합니다.

## 2. 프로젝트 클론 및 의존성 설치
```bash
git clone <repository-url>
cd who-guessed
npm install
```
- 사내/국가별 레지스트리 제한이 있는 경우 `npm config get registry`로 현재 레지스트리를 확인한 뒤, 접근 가능한 레지스트리로 일시 변경한 후 다시 설치해 주세요.

## 3. 환경 변수 설정 (선택)
- 실제 LLM 엔드포인트를 연결하려면 프로젝트 루트에 `.env` 파일을 생성하고 아래 변수를 지정합니다.
  ```bash
  VITE_LLM_ENDPOINT=https://your-llm-endpoint.example.com
  ```
- 값을 지정하지 않으면 코드에 포함된 **mock 응답**이 자동으로 사용되며, 게임 흐름을 테스트할 수 있습니다.

## 4. 개발 서버 실행
```bash
npm run dev
```
- Vite 개발 서버 기본 포트는 `5173`입니다. 브라우저에서 `http://localhost:5173`으로 접속하세요.
- 코드 변경 시 HMR(Hot Module Replacement)로 즉시 반영됩니다.

## 5. 품질 검사 및 빌드
- 타입 검사/린트: `npm run lint`
- 프로덕션 빌드: `npm run build`
- 빌드 결과 프리뷰: `npm run preview`

## 6. 디렉터리 개요
- `src/types/appearance.ts`: Tier 1 스키마, 타일/게임 상태 타입 정의
- `src/api/appearanceClient.ts`: LLM 호출 및 응답 검증, mock 처리
- `src/state/gameStore.ts`: Zustand 스토어, 단계/제거 로직
- `src/components/*`: 3D 보드, 타일, UI 패널 등 뷰 컴포넌트
- `src/data/tiles.ts`: 캐릭터 타일 시드 데이터
- `docs/spec.md`: 한국어 사양 및 작업 계획

## 7. 흔한 문제 해결
- **의존성 설치 실패(403/네트워크 차단)**: 접근 가능한 npm 레지스트리를 설정한 뒤 재시도하거나, 오프라인 환경에서는 기존 `node_modules`를 복사해 사용합니다.
- **LLM 호출 실패**: `.env`를 설정했는지 확인하고, 미설정 시 mock 응답이 동작하는지 확인합니다.
- **화면이 비거나 느린 경우**: 브라우저 콘솔 에러를 확인하고, GPU 드라이버 업데이트 후 다시 실행해 보세요.

즐겁게 개발을 시작해 보세요!

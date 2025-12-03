# Who Guessed?

LLM이 플레이어의 텍스트를 읽고 외모 프로필을 추론한 뒤 3D 보드의 타일을 제거하는 웹 게임입니다. React + TypeScript + React Three Fiber를 사용하며, 게임 로직과 LLM 연동 지점을 모듈화했습니다.

## 프로젝트 구조
- `src/domain`: Tier 1 스키마, 게임 타입, 페이즈 계산 유틸
- `src/data`: 캐릭터 타일 초기 데이터
- `src/state`: Zustand 기반 전역 스토어
- `src/services`: LLM API 클라이언트 및 목업, 응답 검증(zod)
- `src/components`: 3D 보드와 UI 패널 컴포넌트
- `src/styles`: 전역 스타일

## 실행 (의존성 설치 필요)
네트워크 제약으로 패키지가 설치되어 있지 않을 수 있습니다. 패키지 설치 후 아래 명령을 실행하세요.
```bash
npm install
npm run dev
```

테스트:
```bash
npm run test
```

환경 변수:
- `VITE_LLM_ENDPOINT`: 실제 LLM 추론 API URL. 미설정 시 목업 응답을 사용합니다.

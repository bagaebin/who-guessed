# "Who Guessed?" 구현 사양 및 계획

## 1. 목표
웹 기반 인터랙티브 게임 "Who Guessed?"의 3D 보드 UI와 게임 로직, LLM 연동을 TypeScript + React + React-Three-Fiber로 구현한다. 플레이어 입력을 LLM API로 전달해 외모 프로필과 제거할 타일 목록을 받아 게임 상태에 반영한다.

## 2. 기술 스택
- Vite + React + TypeScript
- Zustand: 전역 게임 상태 관리
- React Three Fiber + Drei: 3D 보드 및 타일 렌더링
- Axios: LLM API 연동
- Vitest + React Testing Library: 핵심 로직 테스트

## 3. 주요 도메인 모델
- **AppearanceCore**: 명시된 Tier 1 카테고리 필드를 모두 포함하는 필수 타입
- **CharacterTile**: 타일 ID, AppearanceCore, 이미지 경로, isEliminated
- **GameState**: 타일 배열, playerProfile, round, phase("early" | "mid" | "late")
- **LLM 응답**: profile, eliminatedIds, reasoning

## 4. 게임 흐름
1. 플레이어 텍스트 입력 → `submitPlayerTurn` 호출
2. LLM API(`inferPlayerAppearance`)로 요청 → profile, eliminatedIds 수신
3. playerProfile이 없으면 설정, 타일 제거 후 라운드/페이즈 업데이트
4. 타일 플립 애니메이션 및 남은 타일 수 UI 갱신
5. 1개 남으면 최종 화면 표시

## 5. 아키텍처
- `src/domain`: 타입 정의, 상수, 유틸리티
- `src/state`: Zustand 스토어, 액션
- `src/services`: LLM API 클라이언트(실제/목업), 검증
- `src/components`: 3D 보드, UI 패널, 채팅 입력, 상태 표시
- `src/hooks`: 게임 로직 훅, API 요청 훅
- `src/assets`: 기본 타일 이미지(플레이스홀더)

## 6. 작업 계획
1. Vite React-TS 초기화 및 기본 설정(tsconfig, eslint)
2. 도메인 타입(AppearanceCore 등)과 페이즈 계산 유틸 작성
3. LLM 서비스: 목업 + 실제 API 인터페이스, 응답 검증
4. Zustand 스토어: 게임 상태, 타일 제거 액션, 라운드/페이즈 관리
5. UI 구성
   - 채팅 입력/LLM 응답 섹션
   - 남은 타일 수/라운드 표시
   - React Three Fiber 보드와 타일 카드(플립 애니메이션 포함)
6. 기본 샘플 타일 데이터 삽입 및 로딩
7. Vitest 기반 핵심 유닛 테스트(페이즈 계산, 제거 로직, 응답 검증)
8. 패키지 스크립트 정리 및 실행 지침 README 업데이트

## 7. 테스트 전략
- 유닛: 페이즈 판정, 타일 업데이트, 응답 검증 함수
- 컴포넌트: 입력-액션 흐름 스냅샷/상호작용(필요 시)
- 목업 LLM을 이용해 상태 전이를 검증

## 8. 리스크 및 대응
- LLM 실패 시: 목업/백오프 사용, 에러 상태 UI 제공
- 3D 성능: 타일 수 제한, Drei helpers 활용
- 데이터 무결성: 응답 스키마 검증 함수로 필수 필드 확인

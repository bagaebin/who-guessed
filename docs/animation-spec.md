# Who Guessed? 애니메이션 & 씬 스펙

## 카메라 & 씬 구성
- **고정 구도**: Perspective 카메라가 보드 중심을 바라보며 위치/타겟이 변하지 않는다. 사용자 조작(OrbitControls 등)이나 자동 보간이 없으므로 시점 스냅/락 리스크가 제거된다.【F:src/components/Board3D.tsx†L58-L105】
- **격자 배치**: 타일은 5열 간격(`2.2u`)으로 배치되며, 행마다 `STAIR_STEP`(기본 0.32, `VITE_TILE_ROW_STEP`로 조정) 높이가 더해진 계단형 레이아웃을 유지한다.【F:src/components/Board3D.tsx†L15-L54】
- **카메라 타일 위치 보정**: 플레이어 카메라 타일은 전면 하단에 배치되고, `VITE_CAMERA_TILE_Z_ADJUST`로 높낮이를 보정할 수 있다.【F:src/components/Board3D.tsx†L15-L37】
- **조명/섀도우**: hemisphere/ambient/directional light와 ContactShadows로 기본 입체감을 제공한다.【F:src/components/Board3D.tsx†L60-L96】

## 인트로 드롭 시퀀스
- **대상**: 초기 보드 최대 24장의 타일만 드롭 애니메이션을 가진다(추가 슬롯은 바로 배치).【F:src/components/Board3D.tsx†L33-L54】
- **타이밍**: introState가 `dropping`일 때 각 타일은 순서 기반 지연(기본 320ms + index×50ms) 후 시작하며, 높이 `~6u`에서 낙하한다. `VITE_TILE_DROP_DELAY`로 기본 지연을 덮어쓸 수 있다.【F:src/components/Board3D.tsx†L18-L32】【F:src/components/TileCard.tsx†L10-L69】
- **완료 조건**: 스프링 `dropOffset`가 평면에 수렴하면 `onComplete` 콜백을 호출해 intro 카운터를 증가시키고, 모든 대상이 끝나면 stage가 `done`으로 전환된다.【F:src/components/TileCard.tsx†L50-L87】【F:src/components/Board3D.tsx†L107-L139】

## 타일 상태 & 동작
- **활성 상태**: 기본 -0.2rad 기울기, 불투명도 1.0, 색상 가이드는 tileStyleGuide의 active 팔레트에 따른다.【F:src/components/TileCard.tsx†L21-L52】【F:src/utils/tileStyleGuide.ts†L1-L34】
- **제거 상태**: -90° 앞쪽 회전 + Y축 -0.25u 이동, 불투명도 35%까지 감소한다.【F:src/components/TileCard.tsx†L21-L52】
- **텍스처**: 슬롯마다 image를 plane 텍스처로 매핑하며, 드롭/제거 스프링에 맞춰 불투명도를 조정한다.【F:src/components/TileCard.tsx†L73-L105】

## 플레이어 카메라 타일
- **기울기/크기**: 0.22rad 앞으로 기울어진 3.2×4×0.16u 박스로, 캐릭터 타일 대비 약 2배 크기를 유지한다.【F:src/components/PlayerCameraTile.tsx†L14-L86】
- **웹캠 피드**: `getUserMedia`로 전면 카메라를 요청하고, 비율 불일치 시 반복/오프셋을 조정해 크롭한다. 실패 시 액센트 색상 패널과 오류 텍스트를 표시한다.【F:src/components/PlayerCameraTile.tsx†L20-L83】【F:src/components/PlayerCameraTile.tsx†L115-L156】
- **입력 말풍선**: 3D 말풍선(`Html`)에 텍스트 입력/전송 UI가 붙어 있으며, 전역 키 입력이 포커스를 요청한다.【F:src/components/PlayerCameraTile.tsx†L87-L158】【F:src/components/PlayerCameraTile.tsx†L167-L197】

## 인터랙션 포인트
- **글로벌 키 입력**: 입력 포커스가 비어 있을 때 키를 치면 카메라 타일 말풍선이 포커스를 가져오고, Enter 제출을 지원한다.【F:src/components/PlayerCameraTile.tsx†L87-L145】
- **관리자 모드**: Alt 키로 admin 패널을 토글하며, 생성 로그/LLM 결과를 실시간 확인한다.【F:src/App.tsx†L20-L67】【F:src/components/UiPanel.tsx†L79-L155】

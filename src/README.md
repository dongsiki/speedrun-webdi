# 소스 안내

각 스테이지의 `.template.html`은 화면 마크업과 **기존 실행 순서**를 담습니다. CSS는 `style.css`, 동작은 역할별 `.js`에서 수정합니다. `game.js`는 해당 스테이지의 조작·갱신 루프이며, 미로의 예전 `maze-app.js`에 해당하는 파일도 `maze/game.js`입니다.

`play.template.html`은 실제용, `dev-game.template.html`은 개발용 게임 본체입니다. 같은 파일은 공유하고, 실제로 다른 소스는 `.dev.js`·`.dev.css`로 구분합니다. 미로 동선 차이를 지우려고 두 버전을 덮어쓰지 않습니다.

`shell/standalone/`은 개발자 모음 속 단독 게임 프레임입니다. 게임 본체를 다시 큰 문자열로 저장하지 않고 `document.json`의 `entry`로 스테이지 템플릿을 가리킵니다. `shell/dev/documents.json`은 메뉴 항목을 이 프레임 또는 직접 실행 가능한 템플릿과 연결합니다.

## 빌드 지시문

ES module로 재작성하지 않고 기존 클래식 스크립트의 스코프와 순서를 보존합니다.

- `/* @inline 경로 */`: 해당 파일을 그 위치에 삽입합니다.
- `/* @json 경로 */ null`: JSON을 자바스크립트 값으로 내장합니다.
- `/* @jsonraw 경로 */ null`: 기존 수치 표기까지 유지해야 하는 모델 JSON을 그대로 내장합니다.
- `@@data:자산경로@@`: 파일을 원래 MIME의 base64 data URI로 내장합니다.
- `@documents`, `@standalone`: JSON 목록이 가리키는 게임을 재귀 빌드해 기존 `iframe.srcdoc` 문서로 묶습니다.

`common/progress-store.js`와 `common/stage-transition.js`는 원래 부모 함수 내부 코드를 분리한 **인라인 조각**입니다. 기존 부모 스코프에서 실행되므로 독립적인 외부 `<script src>`로 바꾸지 않습니다. 미로 입력은 `maze/game.js` 안에 그대로 있습니다.

## 공통 파일

| 파일 | 역할 |
|---|---|
| `common/flow.js` | 발견물 → 게임 매핑과 화면 상태 전이 |
| `common/progress-store.js` | 기존 기록 형식, localStorage 읽기·쓰기 |
| `common/stage-transition.js` | 프레임 생성·제거, 복귀·흰 전환·실패 되감기 |
| `common/save-compatibility.js` | 기존 저장 기록 호환 |
| `common/clear-rules.js` | 기존 전체 클리어 판정 |
| `common/guides.js`, `motion.js` | 기존 안내·모션 관련 규칙 |
| `intro/ai-gate.js`, `hand-cursor.js` | 현재 AI 관문과 손 움직임 |

같은 코드를 공유하는 범위만 공통화했습니다. 각 게임의 좌표·입력·게임 규칙을 하나의 새 엔진으로 바꾸지 않았습니다.

`.gitattributes`는 가져온 코드·자산의 바이트가 Windows 체크아웃 과정에서 줄바꿈 변환으로 달라지지 않도록 합니다. 기존 스크립트·스타일의 공백도 초기 동일성 검증을 위해 보존했습니다.

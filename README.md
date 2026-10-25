# 스피드런

흑백 점묘로 표현한 불편한 미니게임 모음. 땅파기에서 물건을 발견하면 해당 게임으로 이동하고, 종료하면 땅파기로 돌아옵니다.

**[플레이](https://dongsiki.github.io/speedrun-webdi/01_speedrun_play.html) · [개발자용 게임 모음](https://dongsiki.github.io/speedrun-webdi/02_speedrun_dev.html)**

## 실행

- 온라인: 위 링크를 엽니다.
- 오프라인·USB: `01_speedrun_play.html` 또는 `02_speedrun_dev.html`과 `assets/video/` 폴더를 같은 상대 위치에 두고 브라우저에서 엽니다. 게임 코드·모델·그림·음성은 HTML에 내장하고, 시작하는 10초 변신 영상은 두 실행본이 같은 분리 파일을 사용합니다.
- 소스 수정: `src/`와 `assets/`를 수정하고 빌드합니다. `.template.html`은 빌드 입력이므로 직접 실행하지 않습니다.
- 미로 등 키보드·마우스 조작은 PC 기준입니다. 이번 정리가 모바일 조작을 추가한 것은 아닙니다.

## 코드 읽는 순서

1. [플레이 화면](src/shell/play/index.template.html): 화면 구조와 게임 연결 위치.
2. [화면 이동](src/common/stage-transition.js), [게임 흐름](src/common/flow.js): 인트로 → 땅파기 → 미니게임 → 복귀.
3. [스테이지별 소스](src/stages): 해당 게임의 `game.js`, `style.css`, 화면 템플릿.
4. [자산 안내](assets/README.md): 그림·음성·모델과 사용 위치.
5. [빌드](scripts/build.cjs): 원본들을 읽어 실행용 HTML 두 개를 만듭니다.

```text
src/
  shell/                  실제·개발자 화면, 개발용 단독 게임 껍데기
  common/                 흐름·저장·복귀·기존 안내 규칙
  intro/                  10초 변신 인트로·AI ON/OFF 관문·손 커서
  stages/
    digging/              땅파기 로비
    switches/             전구 퍼즐
    maze/                 미로
    memory/               기억 속 일상
    last-walk/            마지막 걸음
    needle/               실 꿰기
    suitcase/             짐 싸기
    mri/                  MRI
  extras/                 개발자 모음의 춤·클리어 화면 미리보기
assets/                   이미지·음성·모델·데이터·Three.js·분리 시작 영상
scripts/                  빌드와 검사
01_speedrun_play.html      생성된 실제 게임
02_speedrun_dev.html       생성된 개발자 모음
index.html                기존 접속 경로
```

## 무엇을 어디서 수정하나요?

| 수정할 내용 | 원본 위치 |
|---|---|
| AI ON/OFF 방해·손 | `src/intro/` |
| 두 실행본의 시작 영상 | `src/intro/transformation.js`, `transformation.css`, `assets/video/` |
| 발견물과 게임 연결 | `src/common/flow.js`, `src/shell/play/documents.json` |
| 저장·반항 기록 | `src/common/progress-store.js`, `src/shell/play/rebellion.js` |
| 전구·억까·반사상 | `src/stages/switches/game.js` |
| 미로 이동·벽 충돌 | `src/stages/maze/engine.js` |
| 미로 시점·키 입력·그리기 | `src/stages/maze/game.js` |
| 미로 공간·NPC·자세 | `src/stages/maze/world.js`, `npc-model.js`, `npc-poses.js`, `alley.js` |
| 기억 스테이지·거울·방 이동 | `src/stages/memory/game.js`, `elder-model.js` |
| 마지막 걸음·숨쉬기·아이·중환자실 | `src/stages/last-walk/game.js` |
| 실 꿰기 | `src/stages/needle/game.js` |
| 짐 싸기 규칙·그림·조작 | `src/stages/suitcase/rules.js`, `scene.js`, `game.js` |
| MRI 기다림 | `src/stages/mri/game.js` |
| 개발자 모음 메뉴 | `src/shell/dev/` |

실제용과 다른 개발자용 코드는 `.dev.js`·`.dev.css`로 구분합니다. 미로의 실제용 동선과 개발자용 직선 시연 동선도 유지합니다. 자세한 내장 방식은 [소스 안내](src/README.md)를 참고하세요.

## 빌드·검사

Node.js 18 이상이면 빌드에 추가 패키지가 필요 없습니다.

```sh
npm run build
npm test
```

빌드는 **이 저장소의 `src/`, `assets/`, `scripts/`만** 읽습니다. 다른 드라이브, 예전 날짜의 HTML, PC의 `work/` 폴더는 필요하지 않습니다. 생성된 루트 HTML도 함께 커밋하므로 GitHub Pages는 별도 서버 빌드 없이 실행됩니다.

`npm run test:baseline`은 최초 소스 분리 시점의 SHA-256과 비교합니다. 게임 내용을 의도적으로 바꾼 후에는 기본 `npm test`와 해당 동작 검증을 사용합니다. 초기 분리의 검증과 한계는 [검증 기록](docs/VERIFICATION.md)에 구분합니다.

`npm run test:browser`는 선택 검사입니다. Playwright와 Chromium이 설치된 환경이 필요하며, 기존 Chrome을 사용하려면 `SPEEDRUN_CHROME`에 실행 파일 경로를 지정합니다. `SPEEDRUN_PLAYWRIGHT`에는 별도로 설치된 Playwright 패키지 경로를 지정할 수 있습니다. 테스트 결과는 Git에서 제외한 `test-results/`에 저장합니다.

## 합본 크기

게임의 모델·그림·음성은 USB에서 실행되도록 계속 내장합니다. 시작 영상만 `assets/video/elder-transformation-10s.mp4`로 분리하여 약 41MB·54MB의 두 HTML에 영상을 중복해서 넣지 않습니다. 오프라인에서는 이 상대 폴더를 함께 복사합니다. 영상이 없거나 재생할 수 없으면 기존 시작 화면으로 돌아옵니다. 자동 재생이 막히면 영상을 클릭하거나 Enter/Space로 시작하고, Escape로 건너뛸 수 있습니다.

시작 영상 뒤 실제 게임은 기존 AI 화면으로, 개발자용은 바로가기 목록으로 이어집니다. 실제용 AI 끄기 방해는 개발자용에 들어가지 않습니다. 후속 글리치나 3페이즈 스토리는 이번 인트로 연결 범위에 포함하지 않습니다.

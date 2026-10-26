# 휴대폰 터치 조작 (개발자용 새 항목)

- 페이지: `src/dev-pages/mobile-touch/index.html` (02에서 이 주소로 링크. 01·02·게임 소스는 고치지 않음)
- 동작: 키보드가 꼭 필요한 **마지막 걸음**(왼발·오른발·숨·눈)과 **미로**(▲◀▶▼ 이동, ↶↷ 90° 회전, 화면 끌기로 둘러보기)에 화면 버튼을 붙임. 버튼은 게임이 원래 받는 키(A·D·Space·E / W·A·S·D·←·→)를 그대로 보냄.
- 나머지(땅파기·인트로 AI 관문·전구·기억·실 꿰기·짐 싸기·MRI)는 원래 터치로 조작되어 버튼 없음.
- 위 막대: 개발자용(02) / 본편(01) 바꿔 보기.
- 주의: `file://`로 열면 브라우저 보안 때문에 버튼이 안 붙음. 주소(http)로 열어야 함.

## 실기기 확인 방법

1. **깃허브에 올린 뒤(가장 쉬움):** 폰에서 `https://<깃허브 페이지 주소>/src/dev-pages/mobile-touch/index.html` 열기.
2. **지금 PC로(안드로이드 + USB):** PC에서 site 폴더에서 `node src/dev-pages/mobile-touch/serve.cjs` → 폰 USB 연결·USB 디버깅 켬 → PC 크롬 `chrome://inspect/#devices` → Port forwarding에 `8080` → `localhost:8080` → 폰 크롬에서 `http://localhost:8080/src/dev-pages/mobile-touch/index.html`.
3. **지금 PC로(같은 와이파이, 아이폰도 가능):** `node src/dev-pages/mobile-touch/serve.cjs --lan` → 출력되는 「폰에서:」 주소를 폰에서 열기. 윈도우 방화벽 창이 뜨면 「개인 네트워크」만 허용. 끝나면 Ctrl+C.

확인할 것: 버튼을 누르는 동안 캐릭터가 움직이는지, 두 손가락(이동 + 화면 끌기)이 같이 되는지, 소리가 나는지(처음 한 번 화면을 톡 쳐야 날 수 있음), 가로·세로 화면.

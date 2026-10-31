/* 게임 스타트 화면(2026-10-29, Claude Code).
   사용자 원문(10/27): 「인트로, 개임스타트 화면, ai버튼 스태이지로 레이어를 하자고」 → 변신 인트로가 끝나면
   스타트 그림 한 장을 띄우고, 아무 곳이나 누르거나 아무 키를 누르면 기존 AI 버튼 스테이지가 보인다.
   AI 관문·저장·페이즈 규칙은 바꾸지 않는다. 인트로를 건너뛰는 경우(이미 본 인트로, 02 자동 바로가기)엔 같이 건너뛴다. */
(() => {
  'use strict';
  if (window.GameStartScreen) return;
  const body = document.body, intro = window.TransformationIntro;
  const skip = !intro || intro.status === 'seen' || !!document.getElementById('phase-demo-cover');
  let resolveDone, active = false;
  const done = new Promise(resolve => { resolveDone = resolve; });
  window.GameStartScreen = Object.freeze({ get active() { return active; }, finished: done });
  if (skip) { resolveDone('skipped'); return; }

  const screen = document.createElement('div');
  screen.id = 'game-start';
  screen.tabIndex = 0;
  screen.setAttribute('role', 'button');
  screen.setAttribute('aria-label', '게임 시작. 아무 곳이나 누르거나 아무 키를 누르세요.');
  const art = document.createElement('img');
  art.src = '@@data:assets/images/game-start-title.png@@';
  art.alt = '';
  art.draggable = false;
  screen.append(art);

  const main = () => document.querySelector('body > main');
  let shownAt = 0, prevInert = false;
  function guard(event) {
    if (!active) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    if (performance.now() - shownAt < 250) return; // 인트로를 넘긴 바로 그 입력으로 함께 넘어가지 않게
    if ((event.type === 'keydown' && !event.repeat) || (event.type === 'pointerdown' && screen.contains(event.target))) close('start');
  }
  const kinds = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'contextmenu', 'keydown', 'keyup'];
  function show() {
    if (active || body.dataset.stage !== 'intro') return resolveDone('not-intro');
    active = true;
    shownAt = performance.now();
    const m = main();
    if (m) { prevInert = m.inert; m.inert = true; }
    body.dataset.gameStart = 'shown';
    body.append(screen);
    for (const k of kinds) window.addEventListener(k, guard, { capture: true, passive: false });
    screen.focus({ preventScroll: true });
  }
  function close(reason) {
    if (!active) return;
    active = false;
    for (const k of kinds) window.removeEventListener(k, guard, { capture: true });
    screen.remove();
    const m = main();
    if (m) m.inert = prevInert;
    delete body.dataset.gameStart;
    const end = () => { resolveDone(reason); window.dispatchEvent(new CustomEvent('gamestart:end', { detail: { reason } })); };
    // 10/31 사용자: 첫 플레이는 스타트 클릭 → 클리어 1초 → 인트로 다시 → 커서가 건너뛰기 → AI 버튼(first-run.js).
    if (reason === 'start' && window.FirstRunGag) window.FirstRunGag.play().then(end, end); else end();
  }
  const domReady = document.readyState === 'loading'
    ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true })) : Promise.resolve();
  intro.finished.then(reason => (reason === 'pagehide' ? resolveDone('pagehide') : domReady.then(show)));
})();

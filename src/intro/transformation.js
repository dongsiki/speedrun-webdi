/* One opening per page load. No stage, save or AI gate rules are changed. */
(() => {
  'use strict';
  if (window.TransformationIntro) return;
  // 10/26 사용자: 개발자용에서 누를 때마다 인트로가 다시 나오지 않게(한 번 보면 이 탭에서는 생략).
  // SpeedrunIntroOnce는 개발자용 02와 02의 발표용 바로가기(#demo)만 켠다. 본편 01을 그냥 열면 늘 나온다.
  const seenKey = 'speedrun-intro-seen';
  let seen = false;
  try { seen = sessionStorage.getItem(seenKey) === '1'; } catch (_) {}
  if (seen && window.SpeedrunIntroOnce) {
    window.TransformationIntro = Object.freeze({ active: false, status: 'seen', finished: Promise.resolve('seen') });
    return;
  }
  try { sessionStorage.setItem(seenKey, '1'); } catch (_) {}
  const body = document.body;
  const originalFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  const video = document.createElement('video');
  const inertRoots = new Map();
  const cleanups = [];
  let active = true, status = 'loading', playPending = false, watchdog, music = null;
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  window.TransformationIntro = Object.freeze({
    get active() { return active; },
    get status() { return status; },
    finished
  });
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  }
  function state(next) {
    status = next;
    body.dataset.transformation = next;
    video.setAttribute('aria-label', next === 'awaiting-gesture'
      ? '변신 인트로. 클릭하거나 Enter 또는 Space를 눌러 재생. Escape로 건너뛰기.'
      : '변신 인트로. Escape로 건너뛰기.');
  }
  function finish(reason) {
    if (!active) return;
    active = false;
    status = reason;
    clearTimeout(watchdog);
    if (music) music.stop(reason !== 'ended');
    for (const cleanup of cleanups.splice(0)) cleanup();
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.remove();
    for (const [element, previous] of inertRoots) element.inert = previous;
    inertRoots.clear();
    delete body.dataset.transformation;
    if (reason !== 'pagehide' && originalFocus && originalFocus !== body && originalFocus.isConnected) {
      originalFocus.focus({ preventScroll: true });
    }
    resolveFinished(reason);
    window.dispatchEvent(new CustomEvent('transformationintro:end', { detail: { reason } }));
  }
  function armWatchdog() {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => finish('media-timeout'), 18000);
  }
  function protectRoots() {
    if (!active) return;
    for (const element of body.querySelectorAll(':scope > main')) {
      if (!inertRoots.has(element)) inertRoots.set(element, element.inert);
      element.inert = true;
    }
  }
  async function play() {
    if (!active || playPending || !video.paused) return;
    playPending = true;
    try {
      await video.play();
    } catch (error) {
      if (!active) return;
      if (error.name === 'NotAllowedError') {
        clearTimeout(watchdog);
        state('awaiting-gesture');
      } else if (error.name !== 'AbortError') finish('media-error');
    } finally {
      playPending = false;
    }
  }
  function guard(event) {
    if (!active) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    // 10/26: 브라우저가 소리를 막아 두었으면 첫 클릭·키에서 인트로 음악을 켠다.
    if (music && /^(pointerdown|mousedown|touchend|keydown)$/.test(event.type) && event.key !== 'Escape') music.unlock();
    if (event.type === 'keydown' && event.key === 'Escape') return finish('skipped');
    if (event.type === 'keydown' && (status === 'awaiting-gesture' || ['Enter', ' '].includes(event.key))) {
      armWatchdog();
      void play();
    } else if (event.type === 'pointerdown' && dialog.contains(event.target)) {
      armWatchdog();
      void play();
    }
  }
  dialog.className = 'transformation-intro';
  dialog.setAttribute('aria-label', '변신 인트로');
  video.src = 'assets/video/elder-transformation-10s.mp4?v=13eb1e890d6b';
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = false; // 10/27: 음악이 준비되면 같이 시작(아래 prepare)
  video.playsInline = true;
  video.preload = 'auto';
  video.tabIndex = 0;
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  dialog.append(video);
  state('loading');
  body.append(dialog);
  // 10/26 사용자: 인트로가 나올 때마다 마법소녀 변신풍 음악(src/intro/intro-music.js, 작게).
  try { if (window.IntroMusic) music = window.IntroMusic.create(video, dialog); } catch (_) { music = null; }
  for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu', 'keydown', 'keyup']) {
    on(window, name, guard, { capture: true, passive: false });
  }
  on(window, 'focusin', event => {
    if (active && !dialog.contains(event.target)) video.focus({ preventScroll: true });
  }, true);
  on(dialog, 'cancel', event => { event.preventDefault(); finish('skipped'); });
  on(video, 'playing', () => { clearTimeout(watchdog); state('playing'); });
  on(video, 'waiting', armWatchdog);
  on(video, 'ended', () => finish('ended'));
  on(video, 'error', () => finish('media-error'));
  on(window, 'pagehide', () => finish('pagehide'));
  on(document, 'DOMContentLoaded', protectRoots, { once: true });
  protectRoots();
  try {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    video.focus({ preventScroll: true });
    armWatchdog();
    // 10/27 사용자: 컷신마다 음악이 처음부터 같이 나오게. 음악 합성이 끝나면(최대 2.5초) 영상을 튼다.
    // 10/27 사용자: 깃허브 링크로 열어도 음악이 같이. 브라우저가 소리를 막아 둔 첫 인트로는 첫 장면에서 멈춰 기다리다가
    // 아무 데나 한 번 누르거나 아무 키를 누르면 영상과 음악이 0초부터 같이 시작한다(버튼·글자 없음).
    const start = () => {
      if (!active) return;
      if (music && music.state !== 'running') { clearTimeout(watchdog); state('awaiting-gesture'); }
      else void play();
    };
    if (music && music.prepare) music.prepare(2500).then(start, start);
    else void play();
  } catch (_) {
    finish('media-error');
  }
})();

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
  let active = true, status = 'loading', playPending = false, watchdog;
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
    if (event.type === 'keydown' && event.key === 'Escape') return finish('skipped');
    if (event.type === 'keydown' && ['Enter', ' '].includes(event.key)) {
      armWatchdog();
      void play();
    } else if (event.type === 'pointerdown' && dialog.contains(event.target)) {
      armWatchdog();
      void play();
    }
  }
  dialog.className = 'transformation-intro';
  dialog.setAttribute('aria-label', '변신 인트로');
  video.src = 'assets/video/elder-transformation-10s.mp4?v=001c729e9eba';
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.tabIndex = 0;
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  dialog.append(video);
  state('loading');
  body.append(dialog);
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
    void play();
  } catch (_) {
    finish('media-error');
  }
})();

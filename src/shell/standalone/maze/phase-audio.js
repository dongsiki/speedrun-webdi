/* 개발자용 02 미로의 2페 소리용(2026-10-27, Claude Code). phase/fx.js가 쓰는 오디오만 early.js와 같게 준비한다.
   본편 저장 기록(페이즈 상태)은 읽지도 쓰지도 않는다. */
(() => {
  'use strict';
  let ctx = null, master = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  for (const name of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(name, () => audio(), { capture: true, passive: true });
  window.SpeedrunPhase = { audio, get master() { audio(); return master; } };
})();

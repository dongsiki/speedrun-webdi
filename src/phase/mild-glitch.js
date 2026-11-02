/* 「전체 2」 모든 곳에 마일드한 글리치(2026-10-29, Claude Code).
   사용자: 「내래이션도 그렇고 모든 곳에 글리치가 있어야함. 그렇다고 막 불쾌감을 게임 전반적으로 주지 말고,
   글리치가 있다 라는 정보만 마일드하게 주는 수준으로」 — 모든 페이즈.
   7~15초에 한 번, 0.1초 남짓 화면이 1~3px 밀리고 가는 줄 하나가 지나간다. 색 반전·큰 찢김·큰 소리는 없다.
   본편 01·개발자용 02 맨 위 문서에 넣으면 그 안의 게임 화면까지 함께 덮는다. */
(() => {
  'use strict';
  if (window.MildGlitch) return;
  const style = document.createElement('style');
  style.textContent = '#mild-glitch{position:fixed;left:0;right:0;height:3px;z-index:2147482500;pointer-events:none;display:none;'
    + 'background:repeating-linear-gradient(90deg,#000 0 3px,#fff 3px 7px,#000 7px 8px,transparent 8px 14px);mix-blend-mode:difference;opacity:.7}'
    + 'html[data-mild-glitch] #mild-glitch{display:block}'
    + 'html[data-mild-glitch] body>*:not(#mild-glitch){translate:var(--mg-x,0) 0}';
  const line = document.createElement('div'); line.id = 'mild-glitch'; line.setAttribute('aria-hidden', 'true');
  function mount() { document.head.append(style); document.body.append(line); schedule(); }
  // 11/02 사용자: 「11은 1.5페이즈에서 약한 글리치를 약간 더 쎄게 해서 1.5페이즈부터 하게 해.」 → 1페에는 없음, 1.5페부터.
  function glitchPhase() { const b = document.querySelector('#dev-phase-bar:not([hidden]) button[aria-pressed="true"][data-p]'); if (b) return Number(b.dataset.p); if (document.body && document.body.dataset.devPhase) return Number(document.body.dataset.devPhase); const P = window.SpeedrunPhase; return P && P.state ? P.state.phase : 1; }
  function tick() {
    if (document.hidden || glitchPhase() < 1.5) return;
    const root = document.documentElement;
    root.style.setProperty('--mg-x', `${(Math.random() < .5 ? -1 : 1) * (2 + Math.floor(Math.random() * 4))}px`);
    line.style.top = `${Math.floor(Math.random() * 96)}%`;
    line.style.height = `${3 + Math.floor(Math.random() * 5)}px`;
    root.dataset.mildGlitch = '1';
    try { window.PhaseFX && PhaseFX.crackle(.07, .035, 'hiss'); } catch (_) {}
    setTimeout(() => { delete root.dataset.mildGlitch; }, 90 + Math.random() * 90);
  }
  function schedule() { setTimeout(() => { tick(); schedule(); }, 6000 + Math.random() * 6000); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  window.MildGlitch = { tick };
})();

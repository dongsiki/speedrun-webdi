/* 페이즈 상태(2026-10-26, Claude Code). 1 = 병맛, 2 = 글리치·공포, 3 = 도움 요청(구현 예정).
   이 파일은 변신 인트로보다 먼저 실행된다. 기존 저장(반항 기록)은 건드리지 않는다. */
(() => {
  'use strict';
  const KEY = 'speedrun-phase-v1';
  const games = ['switches', 'maze', 'routine', 'limb', 'needle', 'suitcase', 'mri'];
  const blank = () => ({ v: 1, phase: 1, corrupted: [], run2: [], swapUsed: false });
  let state = blank();
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.v === 1) state = { ...blank(), ...raw }; } catch (_) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }

  // 발표용 바로가기: 01_speedrun_play.html#demo=...
  //  finale1  = 1페이즈 결과 화면(공포 컷 2번)까지 바로
  //  phase2   = 2페이즈 처음(글리치 인트로부터)
  //  phase2-last = 2페이즈에서 여섯 곳을 깬 상태(남은 한 곳: 전구 퍼즐)
  //  scare    = AI 스위치를 끄면 바로 경고 → 점프스케어
  //  reset    = 1페이즈로 초기화
  const demo = (location.hash.match(/demo=([\w-]+)/) || [])[1] || null;
  if (demo === 'reset' || demo === 'finale1') state = blank();
  if (demo === 'phase2') state = { ...blank(), phase: 2 };
  if (demo === 'phase2-last' || demo === 'scare') {
    const done = games.filter(g => g !== 'switches');
    state = { ...blank(), phase: 2, run2: done, corrupted: ['maze', 'routine', 'limb', 'needle', 'suitcase', 'mri'], swapUsed: true };
  }
  if (demo) { save(); history.replaceState(null, '', location.pathname + location.search); }
  // 02의 바로가기로 들어오면 이미 본 인트로는 건너뛴다. 단 '2페이즈 처음부터'는 글리치 인트로가 볼거리라 그대로 둔다.
  if (demo && demo !== 'phase2') window.SpeedrunIntroOnce = true;

  document.body.dataset.phase = String(state.phase);

  // 소리: 인트로가 클릭을 가로채기 전에 먼저 듣고, 첫 손짓에서 오디오를 깨운다.
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

  window.SpeedrunPhase = {
    KEY, games, demo,
    get state() { return state; },
    set(patch) { state = { ...state, ...patch }; save(); document.body.dataset.phase = String(state.phase); },
    audio, get master() { audio(); return master; }
  };
})();

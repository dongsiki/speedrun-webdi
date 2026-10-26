/* 페이즈 상태(2026-10-26, Claude Code). 1 = 병맛, 2 = 글리치·공포, 3 = 도움 요청(구현 예정).
   이 파일은 변신 인트로보다 먼저 실행된다. 기존 저장(반항 기록)은 건드리지 않는다. */
(() => {
  'use strict';
  const KEY = 'speedrun-phase-v2'; // 10/27: v1에는 바로가기로 덮어쓴 2·3페이즈 기록이 섞여 있어 새 이름으로 시작(본편은 1페이즈부터)
  const games = ['switches', 'maze', 'routine', 'limb', 'needle', 'suitcase', 'mri'];
  const blank = () => ({ v: 1, phase: 1, corrupted: [], run2: [], swapUsed: false });
  // 10/27: 02의 발표용 바로가기(#demo)로 들어간 판은 이 탭 안에서만(sessionStorage) 기억한다.
  // 전에는 바로가기가 본편 진행 기록(localStorage)을 2·3페이즈로 덮어써서, 01을 그냥 열어도 글리치 인트로가 나왔다.
  // file://로 연 파일은 모두 같은 저장소를 쓰므로 02·시안 페이지에서 한 일이 01에 그대로 남았던 것.
  const DEMO_FLAG = 'speedrun-phase-demo-tab';
  const demoHash = (location.hash.match(/demo=([\w-]+)/) || [])[1] || null;
  let demoTab = false;
  try {
    if (demoHash && demoHash !== 'reset') sessionStorage.setItem(DEMO_FLAG, '1');
    if (demoHash === 'reset') sessionStorage.removeItem(DEMO_FLAG);
    demoTab = sessionStorage.getItem(DEMO_FLAG) === '1';
  } catch (_) {}
  // 10/27 사용자: 「페이즈 1클리어만 했는데, 이전에 1클리어한 정보가 남아있어서, 1페이즈가 아닌 2페이즈 클리어가 되는 그런 일은 없게 해.」
  // → 페이즈 기록은 본편도 이 탭 안(sessionStorage)에서만 이어진다. RE?로 다시 시작(같은 탭 새로고침)하면 2페이즈로 이어지고,
  //   창·탭을 새로 열면 예전 기록과 상관없이 늘 1페이즈부터. 바로가기 판은 키를 따로 써서 본편과 섞이지 않는다.
  // 10/27 사용자: 「여타 다른 개발자 목차들도 … 정보가 초기화되지 않고, 그대로 돼서 막 이상하게 되고 그런 일은 없게 해」
  // 개발자용에서 연 판(02 바로가기, dev-pages 시안, 다른 페이지 안에 띄운 01)은 본편 기록(반항 기록·도전과제 등
  // localStorage)을 읽지도 쓰지도 않고, 이 페이지 안 메모리에서만 쓴다 → 열 때마다 깨끗하게 시작, 본편에 안 남음.
  let framed = false; try { framed = window.top !== window; } catch (_) { framed = true; }
  const devPage = /\/dev-pages\//.test(decodeURIComponent(location.pathname));
  const isolated = demoTab || devPage || framed;
  if (isolated) {
    const mem = new Map();
    const shim = { getItem: k => (mem.has(String(k)) ? mem.get(String(k)) : null), setItem: (k, v) => { mem.set(String(k), String(v)); },
      removeItem: k => { mem.delete(String(k)); }, clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
    try { Object.defineProperty(window, 'localStorage', { configurable: true, get: () => shim }); } catch (_) {}
    document.documentElement.dataset.storage = 'isolated';
  }
  const STORE_KEY = demoTab ? KEY + '-demo' : KEY;
  const fresh = devPage || framed; // 시안 페이지·액자 안에서는 페이즈도 매번 처음부터
  const store = () => sessionStorage;
  let state = blank();
  if (!fresh) { try { const raw = JSON.parse(store().getItem(STORE_KEY)); if (raw && raw.v === 1) state = { ...blank(), ...raw }; } catch (_) {} }
  function save() { if (fresh) return; try { store().setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {} }

  // 발표용 바로가기: 01_speedrun_play.html#demo=...
  //  finale1  = 1페이즈 결과 화면(공포 컷 2번)까지 바로
  //  phase2   = 2페이즈 처음(글리치 인트로부터)
  //  phase2-last = 2페이즈에서 여섯 곳을 깬 상태(남은 한 곳: 전구 퍼즐)
  //  scare    = AI 스위치를 끄면 바로 경고 → 점프스케어
  //  reset    = 1페이즈로 초기화
  const demo = demoHash;
  if (demo === 'reset' || demo === 'finale1') state = blank();
  if (demo === 'phase2') state = { ...blank(), phase: 2 };
  if (demo === 'phase2-last' || demo === 'scare') {
    const done = games.filter(g => g !== 'switches');
    state = { ...blank(), phase: 2, run2: done, corrupted: ['maze', 'routine', 'limb', 'needle', 'suitcase', 'mri'], swapUsed: true };
  }
  if (demo) { save(); history.replaceState(null, '', location.pathname + location.search); }
  // 02의 바로가기로 들어오면 이미 본 인트로는 건너뛴다. 단 '2페이즈 처음부터'는 글리치 인트로가 볼거리라 그대로 둔다.
  if (demo && demo !== 'phase2') window.SpeedrunIntroOnce = true;
  // 10/27 사용자: 「스위치 화면 쳐 없애고 1페 클리어 화면으로 시작해」 → 결과 화면·마지막 게임·점스 바로가기는
  // 인트로도 AI 스위치 화면도 보이지 않고 그 장면으로 바로 시작한다(스위치는 흰 화면 뒤에서 자동으로 넘김).
  // 「이거도 ai스위치랑 인트로 스킵해」(T9 도전과제 메뉴 처음부터) → 땅파기 로비에서 바로 시작.
  // T7 음성 내레이션은 AI 스위치 화면의 놀리는 음성이 볼거리라 인트로만 건너뛴다.
  const pagePath = decodeURIComponent(location.pathname);
  const autoTarget = { finale1: 'finale', 'phase2-last': 'last', scare: 'scare' }[demo]
    || (devPage && /achievement-dock/.test(pagePath) ? 'lobby' : null);
  const skipIntro = !!autoTarget || (devPage && /voice-narration/.test(pagePath));
  if (skipIntro) { try { sessionStorage.setItem('speedrun-intro-seen', '1'); } catch (_) {} window.SpeedrunIntroOnce = true; }
  const autoStart = !!autoTarget;
  if (autoStart) {
    const cover = document.createElement('div'); cover.id = 'phase-demo-cover';
    cover.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#fff';
    document.body.append(cover);
  }

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
    KEY, games, demo, autoTarget,
    get state() { return state; },
    set(patch) { state = { ...state, ...patch }; save(); document.body.dataset.phase = String(state.phase); },
    audio, get master() { audio(); return master; }
  };
})();

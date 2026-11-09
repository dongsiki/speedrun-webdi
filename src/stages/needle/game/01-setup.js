  // ── 1장. 준비: 화면·손 그림·처음 상태 ──
  const channel = 'speedrun-midterm-v1';
  const canvas = document.getElementById('cloth'), ctx = canvas.getContext('2d');
  const status = document.getElementById('status'), again = document.getElementById('again');
  const dev = window.NeedleDev === true;
  // Codex: generated opaque-white / transparent-background pen-and-ink hand.
  const handSprite = new Image();
  handSprite.decoding = 'async';
  handSprite.src = '@@data:assets/images/needle-hand.webp@@';
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const T = {
    passes: 3,           // 이만큼 꿰어야 끝(10/29 사용자 「3번 꿰야 패스」)
    notches: 4,          // 실타래에 남은 실(자를 수 있는 횟수)
    frayMax: 3,          // 이만큼 풀리면 잘라 낸다
    shake: 9.5,          // 평소 떨림(px, 화면 비율 s 곱함)
    shakeHeld: 2.6,      // 숨 참을 때
    holdEase: .55,       // 숨 참고 떨림이 줄어드는 시간
    holdMax: 2.7,        // 이 뒤로는 참을수록 다시 떨림
    holdBreak: 3.5,      // 여기서 숨이 터진다
    gasp: 1.15,          // 숨이 터진 뒤 못 참는 시간
    fatigue: .55,        // 실을 한 번 자를 때마다 늘어나는 떨림
    follow: 11,          // 손이 커서를 따라오는 빠르기
    bumpCooldown: .7,
    rub: 34              // 바늘귀 안에서 실이 나아가는 빠르기(px/초, s 곱함)
  };
  let W = 1, H = 1, s = 1, ratio = .5;
  const rand = (() => { let x = (crypto.getRandomValues(new Uint32Array(1))[0] || 7) >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; })();
  const phases = Array.from({ length: 8 }, () => rand() * TAU);
  let st;
  function fresh() {
    return {
      phase: 'play', t: 0, start: performance.now(), target: null, hand: null, tip: { x: 0, y: 0 },
      holding: false, holdT: 0, gaspT: 0, everHeld: false, fray: 0, notches: T.notches, cuts: 0, bumps: 0,
      cool: 0, side: 'L', threading: false, endT: 0, snipT: 0, bits: [], shakeNow: T.shake, guideSeen: false, holdSeen: false,
      pull: 0, reported: false, near: false, focus: 0, done: 0, strands: []
    };
  }
  st = fresh();

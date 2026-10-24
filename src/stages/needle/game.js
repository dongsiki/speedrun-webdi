
/* 실 꿰기 (2026-10-19, Claude Code). 불편함: 정밀한 조작의 긴장 — 생각대로 따라주지 않는 손.
 * 조작: 마우스(또는 방향키)로 실 끝을 옮긴다. 손은 늘 떨린다. 누르고 있으면(Space도) 숨을 참아 덜 떨리지만,
 * 숨은 오래 못 참는다. 바늘 몸에 부딪히면 실 끝이 풀리고, 세 번 풀리면 가위로 끝을 잘라 낸다.
 * 실타래가 다 닳으면 실패. 바늘귀(구멍)를 왼쪽에서 오른쪽으로 통과하면 끝.
 * 움직임은 Windows 애니메이션 효과(동작 줄이기) 설정과 상관없이 돈다. 그림은 모두 이 파일 안에서 그린다. */
(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  const canvas = document.getElementById('cloth'), ctx = canvas.getContext('2d');
  const status = document.getElementById('status'), again = document.getElementById('again');
  const dev = window.NeedleDev === true;
  // Codex: generated opaque-white / transparent-background pen-and-ink hand.
  const handSprite = new Image();
  handSprite.decoding = 'async';
  handSprite.src = '@@data:assets/images/game-c92a579205fa.png@@';
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const T = {
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
      pull: 0, reported: false, near: false, focus: 0
    };
  }
  st = fresh();

  // ---- 자리 ------------------------------------------------------------------------------
  const geo = {};
  function layout() {
    W = innerWidth; H = innerHeight; s = Math.min(W, H) / 440;
    canvas.width = Math.ceil(W * ratio); canvas.height = Math.ceil(H * ratio);
    geo.nx = W * .64; geo.top = H * .05; geo.bottom = H * 1.08; geo.tilt = Math.tan(4 * Math.PI / 180);
    geo.eyeY = geo.top + 46 * s; geo.eh = 8.5 * s; geo.ew = 3.6 * s;
    geo.spool = { x: W * .47, y: H * .85 };
    geo.pinch = 28 * s; // 손가락 끝에서 실 끝까지
    if (!st.hand) { st.hand = { x: W * .34, y: geo.eyeY + 60 * s }; st.target = { ...st.hand }; }
  }
  const cxAt = y => geo.nx + (y - geo.top) * geo.tilt;
  function halfWidth(y) {
    const L = geo.bottom - geo.top, u = (y - geo.top) / L;
    if (u < 0 || u > 1) return 0;
    if (u < .03) return 9 * s * Math.sqrt(1 - (1 - u / .03) ** 2);
    if (u < .17) return 9 * s;
    if (u < .3) return lerp(9, 6, (u - .17) / .13) * s;
    if (u < .82) return 6 * s;
    return 6 * s * (1 - (u - .82) / .18);
  }

  // ---- 소리 ------------------------------------------------------------------------------
  let audio = null, master = null, noise = null;
  function wake() {
    try {
      if (!audio) {
        const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
        audio = new A(); master = audio.createGain(); master.gain.value = .5; master.connect(audio.destination);
        noise = audio.createBuffer(1, audio.sampleRate * .8, audio.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }
  function hiss(t0, dur, f, q, peak, f2) {
    if (!audio) return;
    const a = audio, n = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    n.buffer = noise; bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur); bp.Q.value = q;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.02, dur / 3)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t, Math.random() * .3); n.stop(t + dur + .02);
    n.onended = () => { n.disconnect(); bp.disconnect(); g.disconnect(); };
  }
  function tick() {
    if (!audio) return;
    const a = audio, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(2300 + Math.random() * 500, t);
    g.gain.setValueAtTime(.09, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .08); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  const snipSound = () => { hiss(0, .05, 5200, 2, .32); hiss(.11, .06, 4600, 2, .36); };
  const gaspSound = () => hiss(0, .75, 900, .6, .16, 300);
  const throughSound = () => hiss(0, .9, 2600, 1.2, .12, 700);

  // ---- 입력 ------------------------------------------------------------------------------
  const keys = new Set();
  let usingKeys = false;
  canvas.addEventListener('pointermove', e => { if (st.phase !== 'play') return; usingKeys = false; st.target = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerdown', e => {
    wake(); canvas.focus({ preventScroll: true });
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    st.target = { x: e.clientX, y: e.clientY }; hold(true);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const up = () => hold(false);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); wake(); if (!e.repeat) hold(true); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); wake(); usingKeys = true; keys.add(e.key); }
  });
  addEventListener('keyup', e => {
    if (e.key === ' ' || e.code === 'Space') hold(false);
    keys.delete(e.key);
  });
  addEventListener('blur', () => { keys.clear(); hold(false); });
  function hold(on) {
    if (st.phase !== 'play') { st.holding = false; return; }
    if (on && st.gaspT > 0) return; // 숨이 터진 직후엔 다시 못 참는다
    if (on && !st.holding) { st.holdT = 0; st.everHeld = true; st.holdSeen = true; }
    st.holding = on;
  }

  // ---- 판정 ------------------------------------------------------------------------------
  const tipR = () => (1.6 + st.fray * 1.9) * s;
  function say(text) { status.textContent = text; }
  function bump() {
    st.bumps++; st.cool = T.bumpCooldown; st.fray++; tick(); st.guideSeen = true;
    if (st.fray >= T.frayMax) snip(); else say(st.fray === 1 ? '실 끝이 바늘에 걸려 풀렸습니다.' : '실 끝이 더 풀렸습니다.');
  }
  function snip() {
    st.fray = 0; st.notches--; st.cuts++; st.snipT = .55; snipSound();
    st.bits.push({ x: st.tip.x - 4 * s + rand() * 8 * s, y: H * (.9 + rand() * .07), a: rand() * TAU, k: rand() });
    st.hand.x -= 30 * s; st.threading = false;
    if (st.notches <= 0) { finish('fail'); return; }
    say(`풀린 끝을 잘랐습니다. 실이 ${st.notches}번 자를 만큼 남았습니다.`);
  }
  function finish(kind) {
    if (st.phase !== 'play') return;
    st.phase = kind === 'complete' ? 'pulled' : 'failed'; st.endT = 0; st.holding = false;
    if (kind === 'complete') { throughSound(); say('실을 꿰었습니다.'); }
    else say('실이 다 닳았습니다.');
  }
  function report(kind) {
    if (st.reported) return; st.reported = true;
    const ms = Math.round(performance.now() - st.start);
    parent.postMessage({ channel, type: 'needle-result', outcome: kind, held: st.everHeld, bumps: st.bumps, cuts: st.cuts, ms }, '*');
    parent.postMessage({ channel, type: kind }, '*');
    if (dev) { again.hidden = false; again.focus({ preventScroll: true }); }
  }
  again.addEventListener('click', () => { again.hidden = true; st = fresh(); layout(); canvas.focus({ preventScroll: true }); say(''); });

  // ---- 움직임 ----------------------------------------------------------------------------
  function shakeAmount(dt) {
    let want = T.shake + st.cuts * T.fatigue;
    if (st.gaspT > 0) { st.gaspT -= dt; want = (T.shake + 4.5) + st.cuts * T.fatigue; }
    else if (st.holding) {
      st.holdT += dt;
      const settled = lerp(want, T.shakeHeld, clamp(st.holdT / T.holdEase, 0, 1));
      const strain = clamp((st.holdT - T.holdMax) / (T.holdBreak - T.holdMax), 0, 1);
      want = lerp(settled, T.shake + 3, strain * strain);
      if (st.holdT >= T.holdBreak) { st.holding = false; st.gaspT = T.gasp; gaspSound(); say('숨이 찼습니다.'); }
    }
    st.shakeNow = lerp(st.shakeNow, want, 1 - Math.exp(-dt * 9));
    st.focus = lerp(st.focus, st.holding && st.gaspT <= 0 ? 1 : 0, 1 - Math.exp(-dt * (st.holding ? 2.2 : 4)));
    return st.shakeNow * s;
  }
  function tremor(t, a) {
    const p = phases;
    const x = .55 * Math.sin(TAU * 5.3 * t + p[0]) + .3 * Math.sin(TAU * 8.9 * t + p[1]) + .25 * Math.sin(TAU * 1.07 * t + p[2]) + .12 * Math.sin(TAU * 13.1 * t + p[3]);
    const y = .5 * Math.sin(TAU * 4.7 * t + p[4]) + .33 * Math.sin(TAU * 7.6 * t + p[5]) + .27 * Math.sin(TAU * .83 * t + p[6]) + .12 * Math.sin(TAU * 11.7 * t + p[7]);
    return { x: x * a, y: y * a };
  }
  function step(dt) {
    st.t += dt;
    if (st.phase === 'play') {
      if (usingKeys && keys.size) {
        const v = 210 * s * dt;
        if (keys.has('ArrowLeft')) st.target.x -= v; if (keys.has('ArrowRight')) st.target.x += v;
        if (keys.has('ArrowUp')) st.target.y -= v; if (keys.has('ArrowDown')) st.target.y += v;
      }
      st.target.x = clamp(st.target.x, 0, W); st.target.y = clamp(st.target.y, 0, H);
      const k = 1 - Math.exp(-dt * T.follow);
      st.hand.x += (st.target.x - st.hand.x) * k; st.hand.y += (st.target.y - st.hand.y) * k;
      if (st.snipT > 0) st.snipT -= dt;
      if (st.cool > 0) st.cool -= dt;
      const a = shakeAmount(dt), w = tremor(st.t, a);
      let x = st.hand.x + w.x, y = st.hand.y + w.y;
      const r = tipR(), cx = cxAt(y), hw = halfWidth(y);
      const onNeedle = y >= geo.top - r && y <= geo.bottom && hw > 0;
      const left = cx - hw - r, right = cx + hw + r;
      const inBand = onNeedle && x > left && x < right;
      const inSlot = Math.abs(y - geo.eyeY) <= geo.eh - r;
      if (!inBand) {
        if (st.threading && x >= right) { if (x > cx + 36 * s) { st.tip = { x, y }; finish('complete'); return; } }
        else st.threading = false;
        if (!st.threading) st.side = x < cx ? 'L' : 'R';
      } else if (inSlot && (st.threading || (st.side === 'L' && st.cool <= 0))) {
        // 바늘귀 안: 실이 구멍에 쓸려 천천히만 들어간다. 그동안에도 손은 떨린다.
        st.threading = true;
        const maxX = Math.max(st.tip.x, left) + T.rub * s * dt;
        if (x > maxX) { st.hand.x -= (x - maxX); x = maxX; }
      } else {
        // 바늘 몸에 걸림: 그 자리에 막힌다(손은 계속 민다)
        const edge = st.side === 'L' ? left : right;
        if (st.cool <= 0) { bump(); if (st.phase !== 'play') return; }
        st.threading = false;
        x = edge; st.hand.x = lerp(st.hand.x, edge - w.x + (st.side === 'L' ? -3 : 3) * s, .5);
      }
      st.tip = { x, y };
      st.near = Math.hypot(x - cxAt(geo.eyeY), y - geo.eyeY) < 80 * s;
      if (st.near) st.guideSeen = true;
    } else {
      st.endT += dt;
      if (st.phase === 'pulled') { st.pull = Math.min(1, st.endT / 1.3); st.tip.x += 140 * s * dt * (1 - st.pull); if (st.endT > 1.7) report('complete'); }
      if (st.phase === 'failed' && st.endT > 1.3) report('fail');
    }
  }

  // ---- 그림 ------------------------------------------------------------------------------
  // 손으로 그린 선이 1초에 8번 조금씩 다시 그려진다(셀 애니메이션처럼).
  let boil = 0;
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263 + boil * 2246822519, 3266489917); h ^= h >>> 15; return ((h >>> 0) % 1000) / 1000 - .5; };
  const wob = (x, y, k, amt = .9) => [x + hash(k, 1) * amt * s, y + hash(k, 2) * amt * s];
  function path(points, k, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => { const [a, b] = wob(x, y, k + i); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
    if (close) ctx.closePath();
  }
  let dither = null;
  function pattern(level) {
    // 4x4 Bayer 점묘. level 0..16
    const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d');
    const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); g.fillStyle = '#000';
    m.forEach((v, i) => { if (v < level) g.fillRect(i % 4, Math.floor(i / 4), 1, 1); });
    const p = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix([1 / ratio, 0, 0, 1 / ratio, 0, 0])); return p;
  }
  function draw() {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (!dither) dither = { mid: pattern(8), light: pattern(4), dark: pattern(12) };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
    drawBits(); drawSpool(); drawNeedle(); drawThread(false); drawHand(); drawThread(true); drawGuide(); drawBreath(); drawSnip();
  }
  function drawNeedle() {
    // 노안: 바늘이 흐릿하게 하나 더 겹쳐 보인다(점선). 숨을 참으면 초점이 맞아 겹침이 줄어든다. 판정은 실선 바늘만.
    const blur = lerp(13, 2.5, st.focus) * s, gx = Math.sin(st.t * .71 + phases[2]) * blur, gy = Math.cos(st.t * .53 + phases[5]) * blur * .8;
    ctx.save(); ctx.translate(gx, gy); ctx.setLineDash([5 * s, 4 * s]); ctx.lineWidth = 1.4 * s;
    { const n = 40, L = [], R = []; for (let i = 0; i <= n; i++) { const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), hh = halfWidth(y); L.push([c - hh, y]); R.unshift([c + hh, y]); } path([...L, ...R], 150, true); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cxAt(geo.eyeY), geo.eyeY, geo.ew, geo.eh, geo.tilt, 0, TAU); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]);
    const n = 60, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), h = halfWidth(y);
      L.push([c - h, y]); R.unshift([c + h, y]);
    }
    path([...L, ...R], 100, true);
    ctx.fillStyle = dither.light; ctx.fill(); ctx.lineWidth = 2.2 * s; ctx.stroke();
    // 그림자 쪽 빗금
    ctx.lineWidth = 1 * s;
    for (let i = 6; i < n - 6; i += 4) {
      const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), h = halfWidth(y);
      path([[c + h * .35, y], [c + h * .85, y + 7 * s]], 200 + i); ctx.stroke();
    }
    // 바늘귀: 뚫린 구멍(흰 종이가 보임)
    const ex = cxAt(geo.eyeY);
    ctx.beginPath(); ctx.ellipse(...wob(ex, geo.eyeY, 300, .4), geo.ew, geo.eh, geo.tilt, 0, TAU);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.8 * s; ctx.stroke();
  }
  function threadFrom() { return { x: geo.spool.x + 10 * s, y: geo.spool.y - 30 * s }; }
  function drawThread(front) {
    const a = threadFrom(), f = { x: st.tip.x - geo.pinch, y: st.tip.y + 2 * s };
    ctx.lineWidth = 1.7 * s; ctx.strokeStyle = "#000";
    if (!front) {
      // 실타래에서 손가락까지 늘어진 실(손 뒤로 들어간다)
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x + 40 * s, a.y + 50 * s, f.x - 90 * s, f.y + 110 * s + hash(9, 9) * 4 * s, f.x - 20 * s, f.y + 8 * s); ctx.stroke();
      return;
    }
    // 손가락 밖으로 나온 실 끝
    const pulled = st.phase === "pulled";
    const tip = st.tip, through = pulled || st.threading;
    if (through) {
      const ex = cxAt(geo.eyeY);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo((f.x + ex) / 2, (f.y + geo.eyeY) / 2 + 3 * s, ex, geo.eyeY);
      ctx.lineTo(tip.x, tip.y + (pulled ? st.pull * 18 * s : 0)); ctx.stroke();
    } else {
      path([[f.x, f.y], [(f.x + tip.x) / 2, (f.y + tip.y) / 2 + 1.5 * s], [tip.x, tip.y]], 400); ctx.stroke();
    }
    // 풀린 끝: 가닥이 갈라진다
    if (st.fray > 0 && !through) {
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < st.fray * 2 + 1; i++) {
        const ang = (i - st.fray) * .42 + hash(500 + i, 3) * .5, len = (5 + st.fray * 3 + hash(520 + i, 4) * 4) * s;
        ctx.beginPath(); ctx.moveTo(tip.x - 3 * s, tip.y); ctx.lineTo(tip.x - 3 * s + Math.cos(ang) * len, tip.y + Math.sin(ang) * len); ctx.stroke();
      }
    }
  }
  function drawHand() {
    // The sprite's thumb/index contact (1148,218) is the actual thread pinch.
    // Its forearm continues off-screen. Movement follows the existing tip/shake.
    if (!handSprite.complete || !handSprite.naturalWidth) return;
    const px = st.tip.x - geo.pinch, py = st.tip.y + 2 * s;
    const width = 430 * s, height = width * handSprite.naturalHeight / handSprite.naturalWidth;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(handSprite, px - width * (1148 / 1254), py - height * (218 / 1254), width, height);
    ctx.restore();
  }
  function drawSpool() {
    const { x, y } = geo.spool;
    ctx.lineWidth = 2 * s; ctx.fillStyle = '#fff';
    // 나무 실패
    path([[x - 34 * s, y - 40 * s], [x + 34 * s, y - 40 * s], [x + 34 * s, y - 32 * s], [x - 34 * s, y - 32 * s]], 800, true); ctx.fill(); ctx.stroke();
    path([[x - 34 * s, y + 32 * s], [x + 34 * s, y + 32 * s], [x + 34 * s, y + 40 * s], [x - 34 * s, y + 40 * s]], 810, true); ctx.fill(); ctx.stroke();
    path([[x - 12 * s, y - 32 * s], [x + 12 * s, y - 32 * s], [x + 12 * s, y + 32 * s], [x - 12 * s, y + 32 * s]], 820, true); ctx.fill(); ctx.stroke();
    // 감긴 실: 남은 만큼만 두껍다
    const wide = (12 + st.notches * 4.5) * s;
    if (st.notches > 0) {
      path([[x - wide, y - 31 * s], [x + wide, y - 31 * s], [x + wide, y + 31 * s], [x - wide, y + 31 * s]], 830, true);
      ctx.fillStyle = dither.mid; ctx.fill(); ctx.stroke();
      ctx.lineWidth = .9 * s;
      for (let i = -27; i < 30; i += 5) { path([[x - wide, y + i * s], [x + wide, y + (i + 2.5) * s]], 840 + i); ctx.stroke(); }
    }
  }
  function drawBits() {
    ctx.lineWidth = 1.2 * s;
    st.bits.forEach((b, i) => {
      ctx.beginPath();
      for (let j = 0; j <= 6; j++) { const u = j / 6, xx = b.x + Math.cos(b.a) * u * 16 * s, yy = b.y + Math.sin(b.a) * u * 16 * s + Math.sin(u * 9 + b.k * 6) * 2.5 * s; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    });
  }
  function drawGuide() {
    // 가이드 아닌 가이드: 누가 연필로 그어 둔 점선 화살표와, 마우스를 꾹 누르라는 낙서.
    if (st.phase !== 'play') return;
    ctx.lineWidth = 1.3 * s;
    if (!st.guideSeen) {
      const ex = cxAt(geo.eyeY) - 22 * s, ey = geo.eyeY, sx = W * .34 + 24 * s, sy = geo.eyeY + 60 * s;
      ctx.setLineDash([6 * s, 7 * s]);
      ctx.beginPath(); ctx.moveTo(...wob(sx, sy, 900)); ctx.quadraticCurveTo(...wob((sx + ex) / 2, sy - 30 * s, 901), ...wob(ex, ey, 902)); ctx.stroke();
      ctx.setLineDash([]);
      path([[ex - 12 * s, ey - 7 * s], [ex, ey], [ex - 13 * s, ey + 6 * s]], 905); ctx.stroke();
    }
    if (!st.holdSeen) {
      // 마우스 낙서: 왼쪽 버튼만 빗금으로 칠해져 있다.
      const mx = W - 110 * s, my = H - 120 * s;
      ctx.lineWidth = 1.8 * s; ctx.fillStyle = '#fff';
      path([[mx, my], [mx + 44 * s, my - 2 * s], [mx + 46 * s, my + 66 * s], [mx + 2 * s, my + 68 * s]], 920, true); ctx.fill(); ctx.stroke();
      path([[mx + 1 * s, my + 24 * s], [mx + 45 * s, my + 23 * s]], 925); ctx.stroke();
      path([[mx + 23 * s, my - 1 * s], [mx + 23 * s, my + 24 * s]], 927); ctx.stroke();
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < 5; i++) { path([[mx + 3 * s, my + (4 + i * 4) * s], [mx + 20 * s, my + (2 + i * 4) * s]], 930 + i * 2); ctx.stroke(); }
      // "꾹" 손글씨(살짝 기울어짐)
      ctx.save(); ctx.translate(mx - 34 * s + hash(940, 1) * s, my + 10 * s); ctx.rotate(-.14 + hash(941, 1) * .03);
      ctx.fillStyle = '#000'; ctx.font = `700 ${Math.round(26 * s)}px "Segoe Print","Comic Sans MS","Gulim",sans-serif`; ctx.fillText('꾹', 0, 0); ctx.restore();
      path([[mx - 6 * s, my + 16 * s], [mx - 1 * s, my + 13 * s]], 945); ctx.stroke();
    }
  }
  function drawBreath() {
    // 숨을 오래 참으면 화면 가장자리부터 점묘로 어두워진다. 숨이 터지면 한 번 크게 번진다.
    let k = 0;
    if (st.holding) k = clamp((st.holdT - 1.2) / (T.holdBreak - 1.2), 0, 1);
    if (st.gaspT > 0) k = Math.max(k, st.gaspT / T.gasp);
    if (k <= 0) return;
    const band = Math.min(W, H) * .22 * k;
    ctx.fillStyle = k > .66 ? dither.dark : k > .33 ? dither.mid : dither.light;
    ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band); ctx.fillRect(0, 0, band, H); ctx.fillRect(W - band, 0, band, H);
  }
  function drawSnip() {
    if (st.snipT <= 0) return;
    // 가위가 잠깐 들어와 풀린 끝을 자른다.
    const x = st.tip.x + 20 * s, y = st.tip.y, open = st.snipT > .3 ? .5 : .08;
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2 * s; ctx.fillStyle = '#fff';
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.rotate(sgn * open);
      path([[0, 0], [-46 * s, sgn * 2 * s], [-42 * s, sgn * 10 * s], [0, sgn * 9 * s]], 960 + sgn, true); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(16 * s, sgn * 10 * s, 11 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- 돌리기 ----------------------------------------------------------------------------
  let last = performance.now(), lastBoil = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (now - lastBoil > 125) { boil = (boil + 1) % 4; lastBoil = now; }
    if (!paused) step(dt);
    draw();
    canvas.dataset.phase = st.phase; canvas.dataset.fray = String(st.fray); canvas.dataset.notches = String(st.notches);
    canvas.dataset.holding = String(st.holding); canvas.dataset.threading = String(st.threading);
    requestAnimationFrame(frame);
  }
  let paused = false;
  addEventListener('resize', layout);
  addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== channel) return;
    if (e.data.type === 'focus') { paused = false; canvas.focus({ preventScroll: true }); }
    if (e.data.type === 'pause') { paused = true; hold(false); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hold(false); last = performance.now(); });
  layout(); say('실 끝을 바늘귀로 옮기세요.');
  requestAnimationFrame(frame);
  // 확인용(자동 검사): 상태를 읽고 커서를 옮길 수 있게.
  window.NeedleTest = { get state() { return st; }, geo, get s() { return s; }, cxAt };
})();

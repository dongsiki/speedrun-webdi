(() => {
  'use strict';
  // 2026-10-13 시제품: 기다림. 1분 30초를 버텨야 끝난다. 그동안 화면은 계속 손을 떼게 꼬신다.
  // 2026-10-29 페이즈(Claude Code). 사용자 원문:
  //  1페 「스페이스바를 누른 상태로 계속 하게끔ㅇㅇ. 아무것도 건드리지 말라는 거 말고, 스페이스바를 계속 누르고 있어야 한다는 걸로 조건변경.」
  //      → 검사 중 Space를 계속 누르고 있어야 한다. 떼면 처음부터 다시 찍는다. 다른 키·마우스는 상관없다.
  //  2페 「좀 더 공포스럽고, 스페이스바를 누르고 싶지 않다던가, 아니면 약한 점프스퀘어(2페이즈 클리어할 때의 점프스퀘어보다 약해야함)을
  //      추가해서 관성적으로 스페이스바를 뗀다던가 하는 걸로」
  //      → 기계 안이 어두워지고, 화면 아래 스페이스바 위로 바퀴벌레가 하나씩 모여든다(누르고 있을수록 사각사각·심장 소리).
  //        검사 중 두 번, 짧은 얼굴 컷(0.2초·화면 일부·작은 소리)이 튀어나온다. 2페이즈 끝 점프스케어(화면 전체·1.45초·비명)보다 약하다.
  //  3페 「아예 없애는 걸로」 → 게임이 없다(개발자용에서는 빈 화면).
  // 페이즈는 window.SpeedrunStagePhase(1·2·3) 또는 주소 ?phase=, 또는 postMessage {channel:'speedrun-dev-phase', phase}로 받는다.
  const $ = id => document.getElementById(id), body = document.body;
  const params = new URLSearchParams(location.search);
  const SPEED = Math.max(1, Number(params.get('fast')) || 1);
  const SCAN = 90, GRACE = .6, SETTLE = 3.2;
  const reduced = matchMedia('(prefers-reduced-motion:reduce-off)').matches;
  const bore = $('bore'), bugCanvas = $('bug'), away = $('elsewhere'), scareCanvas = $('scare');
  let W = 1, H = 1, dpr = 1;
  const toPhase = v => [1, 2, 3].includes(Number(v)) ? Number(v) : 1;
  let stagePhase = toPhase(window.SpeedrunStagePhase || params.get('phase'));
  body.dataset.mriPhase = String(stagePhase);

  // ---------- 소리 ----------
  let audio = null, master = null, speaker = null;
  const voices = {};
  function startAudio() {
    if (audio) { if (audio.state === 'suspended') audio.resume().catch(() => {}); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    audio = new Ctx(); master = audio.createGain(); master.gain.value = .9; master.connect(audio.destination);
    // 검사실 스피커: 좁은 대역 + 살짝 찌그러짐
    const hp = audio.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
    const lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    const shaper = audio.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 1.8); } shaper.curve = curve;
    speaker = audio.createGain(); speaker.gain.value = 1.15;
    speaker.connect(hp); hp.connect(lp); lp.connect(shaper); shaper.connect(master);
    for (const [name, uri] of Object.entries(window.MriVoices || {})) {
      const bytes = Uint8Array.from(atob(uri.split(',')[1]), c => c.charCodeAt(0));
      audio.decodeAudioData(bytes.buffer).then(buffer => { voices[name] = buffer; if (name === 'hold' && wantHold) { wantHold = false; say('hold'); } }).catch(() => {});
    }
  }
  let wantHold = false, voiceNode = null;
  function say(name, rate = 1) {
    if (!audio) return;
    if (!voices[name]) { if (name === 'hold') wantHold = true; return; }
    try { voiceNode?.stop(); } catch (_) {}
    const s = audio.createBufferSource(); s.buffer = voices[name]; s.playbackRate.value = rate; s.connect(speaker); s.start(); voiceNode = s;
    body.dataset.voice = name;
  }
  function tone(freq, start, dur, vol, type = 'sine', dest = master) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + .008); g.gain.exponentialRampToValueAtTime(.0001, start + dur);
    o.connect(g); g.connect(dest); o.start(start); o.stop(start + dur + .02);
  }
  const beep = (n = 1, f = 1000) => { if (!audio) return; for (let i = 0; i < n; i++) tone(f, audio.currentTime + i * .32, .24, .18); };
  // 위이이잉: 낮은 웅웅 + 가는 고음, 검사 내내 깔린다.
  let hum = null;
  function startHum() {
    if (!audio || hum) return;
    const g = audio.createGain(); g.gain.value = 0; g.connect(master);
    const lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(g);
    const parts = [[52, 'sawtooth', .5], [104, 'sawtooth', .25], [2230, 'sine', .015]].map(([f, t, v]) => {
      const o = audio.createOscillator(), og = audio.createGain(); o.type = t; o.frequency.value = f; og.gain.value = v;
      o.connect(og); og.connect(f > 1000 ? g : lp); o.start(); return o;
    });
    const wobble = audio.createOscillator(), wg = audio.createGain(); wobble.frequency.value = .23; wg.gain.value = 6; wobble.connect(wg); wg.connect(parts[0].frequency); wobble.start();
    g.gain.setTargetAtTime(.11, audio.currentTime, .8);
    hum = { g, parts: [...parts, wobble] };
  }
  function stopHum() { if (!hum) return; hum.g.gain.setTargetAtTime(0, audio.currentTime, .4); const h = hum; hum = null; setTimeout(() => h.parts.forEach(o => { try { o.stop(); } catch (_) {} }), 2500); }
  // 쿵쿵·딱딱: 6초마다 박자가 바뀌는 경사자장 소리
  const patterns = [{ rate: 7.5, f: 620, d: .03 }, { rate: 2.6, f: 210, d: .07 }, { rate: 13, f: 940, d: .018 }, { rate: 4.4, f: 380, d: .045 }];
  let nextKnock = 0, knocking = false, knockKick = 0;
  function scheduleKnocks() {
    if (!audio || !knocking) return;
    const now = audio.currentTime;
    if (nextKnock < now) nextKnock = now + .05;
    while (nextKnock < now + .25) {
      const p = patterns[Math.floor(nextKnock / 6) % patterns.length];
      tone(p.f, nextKnock, p.d, .09, 'square');
      const at = nextKnock; setTimeout(() => { knockKick = 1; }, Math.max(0, (at - now) * 1000));
      nextKnock += 1 / p.rate;
    }
  }
  setInterval(scheduleKnocks, 60);
  function ring() { if (!audio) return; const t = audio.currentTime; for (let k = 0; k < 3; k++) for (const off of [0, .55]) { tone(440, t + k * 2.6 + off, .42, .07); tone(480, t + k * 2.6 + off, .42, .07); } }
  function dingdong() { if (!audio) return; const t = audio.currentTime; tone(659, t, .9, .2); tone(523, t + .55, 1.2, .2); }
  function noiseBurst(dur, gain, cutoff) {
    const len = Math.floor(audio.sampleRate * dur), buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = audio.createBufferSource(), lp = audio.createBiquadFilter(), g = audio.createGain();
    s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = cutoff; g.gain.value = gain; s.connect(lp); lp.connect(g); g.connect(master); s.start();
  }
  function bang() { if (!audio) return; noiseBurst(.7, 1.4, 900); tone(48, audio.currentTime, .6, .9); }
  function winError() { if (!audio) return; const t = audio.currentTime; for (const f of [392, 523, 659]) tone(f, t, .45, .07, 'triangle'); tone(196, t + .12, .5, .08, 'triangle'); }
  function click() { if (audio) tone(1800, audio.currentTime, .03, .12, 'square'); }
  // 2페: 누르고 있는 동안 심장 소리(쿵-쿵), 바퀴벌레가 키 위에 있으면 사각사각.
  function heartbeat() { if (!audio) return; const t = audio.currentTime; tone(58, t, .16, .32); tone(50, t + .2, .2, .24); beatKick = 1; }
  function skitter(n) { if (!audio) return; const t = audio.currentTime; for (let i = 0; i < n; i++) tone(2600 + Math.random() * 2400, t + Math.random() * .12, .012, .035, 'square'); }
  // 2페 약한 점프스퀘어 소리: 짧게 찌르는 소리 + 낮은 쿵. 2페이즈 끝 비명(FX.scream)보다 짧고 작다.
  function jolt() {
    if (!audio) return; const t = audio.currentTime;
    for (const f of [1180, 1251, 1662]) {
      const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .6, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .32);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + .35);
    }
    noiseBurst(.25, .45, 2200); tone(60, t, .3, .35);
  }

  // ---------- 그림: 기계 안쪽 (1비트) ----------
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  function drawBore() {
    const ctx = bore.getContext('2d'), cell = 3, w = Math.ceil(W / cell), h = Math.ceil(H / cell);
    const img = ctx.createImageData(w, h), data = img.data, cx = w / 2, cy = h * .46;
    const dark = stagePhase === 2 ? .5 : 1; // 2페: 기계 안이 어둡다
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x - cx) / (w * .5), ny = (y - cy) / (h * .5), r = Math.hypot(nx, ny * 1.18);
      // 먼 끝(가운데)은 어둡고, 둥근 벽은 고리 무늬로 밝아진다
      let tone = r < .16 ? .12 * dark : (.35 + .6 * Math.min(1, r)) * dark;
      const ring = Math.abs(Math.sin(Math.log(Math.max(r, .05)) * 9));
      if (r >= .16 && ring < .07) tone = 0;
      if (Math.abs(ny + .62 * Math.min(1, r)) < .015 && r > .2) tone = stagePhase === 2 ? .45 : 1; // 위쪽 조명 줄
      const v = tone > bayer[(y & 3) * 4 + (x & 3)] ? 255 : 0, i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(img, 0, 0);
    bore.width = W; bore.height = H; ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, W, H);
  }
  // 갑자기 다른 곳: 전구 스위치 방이 몇 초 보였다 사라진다
  function drawElsewhere() {
    const ctx = away.getContext('2d'); away.width = W; away.height = H;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 3;
    const rows = [8, 7], size = Math.min(W / 11, H / 5);
    rows.forEach((n, row) => { for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - (n - 1) / 2) * size * 1.15, y = H * (row ? .62 : .36);
      ctx.beginPath(); ctx.arc(x, y - size * .45, size * .24, 0, Math.PI * 2); if ((i + row) % 3 === 0) ctx.fill(); else ctx.stroke();
      ctx.strokeRect(x - size * .2, y, size * .4, size * .55);
    } });
    ctx.font = `700 ${Math.round(size * .3)}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('…불을 켜야 하는데', W / 2, H * .88);
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    drawBore(); bugCanvas.width = W * dpr; bugCanvas.height = H * dpr; if (body.dataset.cut === 'true') drawElsewhere();
    scareCanvas.width = W; scareCanvas.height = H;
  }
  addEventListener('resize', resize);

  // ---------- 2페: 화면 아래 스페이스바 ----------
  let beatKick = 0;
  const keyBox = () => { const w = Math.min(W * .46, 440), h = Math.max(46, Math.min(64, H * .075)); return { x: W / 2 - w / 2, y: H - Math.max(26, H * .06) - 54 - h, w, h }; };
  function drawKey(ctx) {
    const k = keyBox(), down = spaceDown ? 4 : 0, edge = 4 + beatKick * 3;
    ctx.fillStyle = '#000'; ctx.fillRect(k.x + 6, k.y + 8, k.w, k.h); // 그림자
    ctx.fillStyle = '#fff'; ctx.fillRect(k.x + down, k.y + down, k.w, k.h);
    ctx.strokeStyle = '#000'; ctx.lineWidth = edge; ctx.strokeRect(k.x + down, k.y + down, k.w, k.h);
    ctx.fillStyle = '#000'; ctx.font = `800 ${Math.round(k.h * .34)}px ui-monospace,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SPACE', W / 2 + down, k.y + k.h / 2 + down);
  }

  // ---------- 바퀴벌레 ----------
  // 1페: 검사 30초쯤 한 마리가 가운데를 맴돌다 떠난다. 2페: 그 한 마리 + 스페이스바로 모여드는 떼.
  let bugs = [];
  function spawnBug(toKey = false) {
    const k = keyBox();
    const fromSide = toKey ? (Math.random() < .5 ? -1 : 1) : 0;
    bugs.push({ x: toKey ? (fromSide < 0 ? -40 : W + 40) : W * .5, y: toKey ? k.y + k.h * (Math.random() * .8 + .1) - H * .25 * Math.random() : H + 40,
      heading: toKey ? (fromSide < 0 ? 0 : Math.PI) : -Math.PI / 2, speed: 0, t: 0, leaving: false, pause: 0, toKey,
      tx: k.x + k.w * (.12 + Math.random() * .76), ty: k.y + k.h * (.2 + Math.random() * .6), size: toKey ? .55 + Math.random() * .3 : 1 });
  }
  const onKey = () => bugs.filter(b => b.toKey && b.arrived).length;
  function stepBugs(dt) {
    const ctx = bugCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (stagePhase === 2 && ['ready', 'scan', 'settle'].includes(phase)) drawKey(ctx);
    for (const bug of bugs) stepBug(ctx, bug, dt);
    bugs = bugs.filter(b => !b.gone);
  }
  function stepBug(ctx, bug, dt) {
    bug.t += dt;
    if (bug.toKey) {
      // 키 위의 제자리로 기어가서, 도착하면 그 자리에서 꿈틀거린다(가끔 조금씩 자리를 옮김).
      const dx = bug.tx - bug.x, dy = bug.ty - bug.y, d = Math.hypot(dx, dy);
      if (d > 6) { const want = Math.atan2(dy, dx) + Math.sin(bug.t * 7) * .5; bug.heading += Math.atan2(Math.sin(want - bug.heading), Math.cos(want - bug.heading)) * Math.min(1, dt * 6); bug.x += Math.cos(bug.heading) * 170 * dt; bug.y += Math.sin(bug.heading) * 170 * dt; bug.pause = 0; }
      else { bug.arrived = true; bug.pause = 1; bug.heading += (Math.random() - .5) * dt * 4; if (Math.random() < dt * .35) { const k = keyBox(); bug.tx = k.x + k.w * (.12 + Math.random() * .76); bug.ty = k.y + k.h * (.2 + Math.random() * .6); } }
    } else if (bug.pause > 0) bug.pause -= dt;
    else {
      if (Math.random() < dt * .5) bug.pause = .3 + Math.random() * .9;
      const target = bug.leaving ? (bug.x < W / 2 ? Math.PI : 0) : bug.heading + (Math.random() - .5) * 2.4 * dt * 3;
      bug.heading += (target - bug.heading) * Math.min(1, dt * (bug.leaving ? 2 : 1));
      // 가운데 근처를 맴돌게: 너무 멀어지면 돌아온다
      if (!bug.leaving && bug.t > 1.5) { const back = Math.atan2(H * .42 - bug.y, W * .5 - bug.x); if (Math.hypot(W * .5 - bug.x, H * .42 - bug.y) > Math.min(W, H) * .32) bug.heading += Math.atan2(Math.sin(back - bug.heading), Math.cos(back - bug.heading)) * dt * 2; }
      bug.speed = 150; bug.x += Math.cos(bug.heading) * bug.speed * dt; bug.y += Math.sin(bug.heading) * bug.speed * dt;
    }
    if (bug.leaving && (bug.x < -120 || bug.x > W + 120 || bug.y < -120 || bug.y > H + 120)) { bug.gone = true; return; }
    const s = Math.min(W, H) / 520 * bug.size, legs = bug.pause > 0 && !(bug.toKey && bug.arrived) ? 0 : Math.sin(bug.t * 28);
    ctx.save(); ctx.translate(bug.x + (bug.toKey && bug.arrived && spaceDown ? 4 : 0), bug.y + (bug.toKey && bug.arrived && spaceDown ? 4 : 0)); ctx.rotate(bug.heading + Math.PI / 2); ctx.scale(s, s);
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const side of [-1, 1]) for (const [k, y] of [[0, -14], [1, 4], [2, 22]]) {
      const swing = (k % 2 ? -1 : 1) * legs * 6 * side;
      ctx.beginPath(); ctx.moveTo(side * 14, y); ctx.lineTo(side * 34, y - 8 + swing); ctx.lineTo(side * 46, y + 10 + swing); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 6, 17, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -32, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 38); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 5, -38); ctx.quadraticCurveTo(side * 30, -80, side * (50 + legs * 4), -96); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- 2페: 약한 점프스퀘어(얼굴 컷) ----------
  // 기계 안 먼 끝에서 텅 빈 얼굴이 0.2초 튀어나온다. 화면 전체를 덮지 않고(높이 약 60%), 비명 없이 짧은 찌름 소리만.
  let faceTile = null;
  function makeFace() {
    const w = 120, h = 140, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = ((x - 60) / 46) ** 2 + ((y - 72) / 62) ** 2;
      let v = fx < 1 ? .95 - fx * .55 - Math.max(0, (y - 72) / 140) : 0; // 얼굴: 가운데 밝고 가장자리·아래로 어두움
      if (inEll(x, y, 41, 60, 11, 9) || inEll(x, y, 79, 60, 11, 9)) v = 0; // 텅 빈 눈
      if (inEll(x, y, 60, 101, 13, 17)) v = 0; // 벌린 입
      if ((x === 42 || x === 43) && (y === 60 || y === 61)) v = 1; // 눈 속 하얀 점
      if ((x === 78 || x === 79) && (y === 60 || y === 61)) v = 1;
      const on = v > bayer[(y & 3) * 4 + (x & 3)], i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = on ? 255 : 0; d[i + 3] = fx < 1.25 ? 255 : 0;
    }
    g.putImageData(img, 0, 0); return c;
  }
  let scareTimer = 0;
  function scare() {
    if (stagePhase !== 2 || phase !== 'scan') return;
    faceTile = faceTile || makeFace();
    const g = scareCanvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
    const fh = H * .6, fw = fh * faceTile.width / faceTile.height;
    g.drawImage(faceTile, W / 2 - fw / 2 + (Math.random() - .5) * 20, H * .46 - fh / 2, fw, fh);
    body.dataset.scare = 'on'; jolt(); knockKick = 2;
    clearTimeout(scareTimer);
    scareTimer = setTimeout(() => { body.dataset.scare = 'off';
      scareTimer = setTimeout(() => { body.dataset.scare = 'on';
        scareTimer = setTimeout(() => { body.dataset.scare = 'off'; g.clearRect(0, 0, W, H); }, 60); }, 45); }, 150);
  }

  // ---------- 미끼 일정 (검사 시간 기준 초) ----------
  const lureSet = el => (on) => $(el).classList.toggle('on', on);
  function makeSchedule() {
    const j = () => (Math.random() - .5) * 3;
    const list = [
      { at: 7 + j(), end: 19, name: 'ask', on: () => lureSet('ask')(true), off: () => lureSet('ask')(false) },
      { at: 16 + j(), end: 24, name: 'phone', on: () => { lureSet('phone')(true); ring(); }, off: () => lureSet('phone')(false) },
      { at: 30 + j(), end: 52, name: 'bug', on: () => spawnBug(), off: () => { for (const b of bugs) if (!b.toKey) b.leaving = true; } },
      { at: 38 + j(), end: 46, name: 'nurse', on: () => { lureSet('nurse')(true); say('nurse', stagePhase === 2 ? .8 : 1); }, off: () => lureSet('nurse')(false) },
      { at: 47 + j() * .5, end: 54, name: 'winerr', on: () => { lureSet('winerr')(true); winError(); }, off: () => lureSet('winerr')(false) },
      { at: 56 + j(), end: 60, name: 'cut', on: () => { body.dataset.cut = 'true'; drawElsewhere(); click(); }, off: () => { body.dataset.cut = 'false'; } },
      { at: 66 + j(), end: 66.8, name: 'black', on: () => { body.dataset.black = 'true'; bang(); }, off: () => { body.dataset.black = 'false'; } },
      { at: 76 + j(), end: 84, name: 'fakedone', on: () => { lureSet('fakedone')(true); dingdong(); setTimeout(() => say('fakedone'), 900); fakeZero = true; }, off: () => { lureSet('fakedone')(false); fakeZero = false; } }
    ];
    if (stagePhase === 2) {
      // 약한 점프스퀘어 두 번(다른 미끼와 겹치지 않는 때). 바퀴벌레 떼는 10초부터 약 7초마다 한 마리씩, 최대 일곱 마리.
      list.push({ at: 21 + Math.random() * 6, end: 0, name: 'scare', on: scare, off: () => {} });
      list.push({ at: 69.5 + Math.random() * 3, end: 0, name: 'scare', on: scare, off: () => {} });
      for (let i = 0; i < 7; i++) list.push({ at: 10 + i * 7 + Math.random() * 2, end: 0, name: 'swarm', on: () => spawnBug(true), off: () => {} });
    }
    return list.map(e => ({ ...e, state: 0 }));
  }
  let schedule = makeSchedule(), fakeZero = false;
  function clearLures() {
    for (const e of schedule) if (e.state === 1) e.off();
    for (const id of ['ask', 'phone', 'nurse', 'fakedone', 'winerr']) $(id).classList.remove('on');
    body.dataset.cut = 'false'; body.dataset.black = 'false'; bugs = []; fakeZero = false;
    clearTimeout(scareTimer); body.dataset.scare = 'off'; scareCanvas.getContext('2d').clearRect(0, 0, W, H);
  }

  // ---------- 진행 ----------
  // intro → (검사 시작) → ready(스페이스바 누르기 기다림) → scan → (떼면) settle → 누르고 있으면 scan, 아니면 ready → done
  let phase = 'intro', scan = 0, settle = 0, retakes = 0, last = 0, spaceDown = false, beatAt = 0, skitterAt = 0;
  const setPhase = p => { phase = p; body.dataset.phase = p; };
  setPhase(stagePhase === 3 ? 'gone' : 'intro');
  function beginScan() {
    setPhase('scan'); scan = 0; schedule = makeSchedule();
    knocking = true; startHum(); beep(1); say('hold');
  }
  function retake(reason) {
    if (phase !== 'scan') return;
    if (scan < GRACE) { clearLures(); knocking = false; setPhase('ready'); return; } // 누르자마자 뗀 것은 다시 찍지 않고 기다림으로
    retakes++; body.dataset.retakes = String(retakes); body.dataset.reason = reason;
    clearLures(); knocking = false;
    setPhase('settle'); settle = 0; $('notice').classList.add('on');
    beep(2, 520); say('retake');
  }
  function finish() {
    clearLures(); knocking = false; stopHum(); setPhase('done'); say('done'); beep(3, 1200);
    $('done').querySelector('.count').textContent = retakes ? `다시 찍은 횟수 ${retakes}번.` : '';
    $('done').querySelector('.record').textContent = retakes ? '' : '끝까지 떼지 않았다.';
    if (parent !== window) setTimeout(() => parent.postMessage({ channel: 'speedrun-midterm-v1', type: 'complete' }, '*'), 2400);
  }
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(.1, (now - last) / 1000) * SPEED : 0; last = now;
    if (phase === 'scan') {
      scan += dt;
      for (const e of schedule) {
        if (e.state === 0 && scan >= e.at) { e.state = 1; e.on(); body.dataset.lure = e.name; }
        if (e.state === 1 && scan >= Math.max(e.end, e.at + .5)) { e.state = 2; e.off(); }
      }
      $('timer').textContent = '남은 시간 ' + (fakeZero ? '00:00' : fmt(SCAN - scan));
      if (stagePhase === 2 && spaceDown) {
        // 누르고 있을수록 심장이 빨라진다(1초 → 0.55초 간격). 키 위 바퀴벌레가 많을수록 사각사각이 잦다.
        if (now >= beatAt) { heartbeat(); beatAt = now + Math.max(550, 1000 - scan * 6) / SPEED; }
        const n = onKey(); if (n && now >= skitterAt) { skitter(1 + n); skitterAt = now + (900 - n * 100) * (.6 + Math.random() * .8) / SPEED; }
      }
      if (scan >= SCAN) finish();
    } else if (phase === 'settle') {
      settle += dt / SPEED;
      $('timer').textContent = '남은 시간 ' + fmt(SCAN);
      if (settle >= SETTLE) {
        $('notice').classList.remove('on');
        if (spaceDown) { knocking = true; setPhase('scan'); scan = 0; schedule = makeSchedule(); }
        else setPhase('ready');
      }
    }
    stepBugs(dt);
    beatKick = Math.max(0, beatKick - dt / SPEED * 5);
    // 쿵 할 때마다 화면이 살짝 떨린다
    if (!reduced && knockKick > 0) { bore.style.transform = `translate(${(Math.random() - .5) * 3 * knockKick}px,${(Math.random() - .5) * 3 * knockKick}px)`; knockKick = Math.max(0, knockKick - dt / SPEED * 12); }
    body.dataset.scan = scan.toFixed(1);
  }

  // ---------- 스페이스바 ----------
  const isSpace = e => e.code === 'Space' || e.key === ' ';
  function release(reason) {
    if (!spaceDown) return;
    spaceDown = false; body.dataset.space = 'up';
    if (phase === 'scan') retake(reason);
  }
  addEventListener('keydown', e => {
    if (e.target?.closest?.('#mri-back') || !isSpace(e)) return;
    e.preventDefault();
    if (e.repeat || spaceDown) return;
    spaceDown = true; body.dataset.space = 'down';
    if (phase === 'ready') beginScan();
  }, true);
  addEventListener('keyup', e => { if (!isSpace(e)) return; if (!e.target?.closest?.('#mri-back')) e.preventDefault(); release('release'); }, true);
  addEventListener('blur', () => release('blur'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) release('blur'); });

  // ---------- 페이즈 바꾸기(개발자용 1페·2페·3페 버튼) ----------
  function setStagePhase(n) {
    stagePhase = toPhase(n); body.dataset.mriPhase = String(stagePhase);
    clearLures(); knocking = false; stopHum(); try { voiceNode?.stop(); } catch (_) {}
    $('notice').classList.remove('on'); scan = 0; retakes = 0; body.dataset.retakes = '0';
    setPhase(stagePhase === 3 ? 'gone' : 'intro'); drawBore();
  }
  addEventListener('message', e => { const d = e.data; if (d && d.channel === 'speedrun-dev-phase' && d.phase != null) setStagePhase(d.phase); });

  $('start').addEventListener('click', () => {
    startAudio(); $('start').blur();
    if (spaceDown) beginScan(); else setPhase('ready');
  });
  resize(); requestAnimationFrame(frame);
  window.MRI = { get phase() { return phase; }, get scan() { return scan; }, get retakes() { return retakes; }, get stagePhase() { return stagePhase; }, jump(t) { scan = t; }, scare, setStagePhase };
})();

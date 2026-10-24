
(() => {
  'use strict';
  // 2026-10-13 시제품: 기다림. 1분 30초 동안 아무것도 누르거나 움직이지 않아야 끝난다.
  // 누르거나 움직이면 처음부터 다시 찍는다. 그동안 화면은 계속 손대게 꼬신다.
  const $ = id => document.getElementById(id), body = document.body;
  const params = new URLSearchParams(location.search);
  const SPEED = Math.max(1, Number(params.get('fast')) || 1);
  const SCAN = 90, GRACE = .6, SETTLE = 3.2;
  const reduced = matchMedia('(prefers-reduced-motion:reduce-off-off)').matches;
  const bore = $('bore'), bugCanvas = $('bug'), away = $('elsewhere');
  let W = 1, H = 1, dpr = 1;

  // ---------- 소리 ----------
  let audio = null, master = null, speaker = null;
  const voices = {};
  function startAudio() {
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
  function say(name) {
    if (!audio) return;
    if (!voices[name]) { if (name === 'hold') wantHold = true; return; }
    try { voiceNode?.stop(); } catch (_) {}
    const s = audio.createBufferSource(); s.buffer = voices[name]; s.connect(speaker); s.start(); voiceNode = s;
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
  function bang() {
    if (!audio) return;
    const len = audio.sampleRate * .7, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = audio.createBufferSource(), lp = audio.createBiquadFilter(), g = audio.createGain();
    s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 1.4; s.connect(lp); lp.connect(g); g.connect(master); s.start();
    tone(48, audio.currentTime, .6, .9);
  }
  function winError() { if (!audio) return; const t = audio.currentTime; for (const f of [392, 523, 659]) tone(f, t, .45, .07, 'triangle'); tone(196, t + .12, .5, .08, 'triangle'); }
  function click() { if (audio) tone(1800, audio.currentTime, .03, .12, 'square'); }

  // ---------- 그림: 기계 안쪽 (1비트) ----------
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  function drawBore() {
    const ctx = bore.getContext('2d'), cell = 3, w = Math.ceil(W / cell), h = Math.ceil(H / cell);
    const img = ctx.createImageData(w, h), data = img.data, cx = w / 2, cy = h * .46;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x - cx) / (w * .5), ny = (y - cy) / (h * .5), r = Math.hypot(nx, ny * 1.18);
      // 먼 끝(가운데)은 어둡고, 둥근 벽은 고리 무늬로 밝아진다
      let tone = r < .16 ? .12 : .35 + .6 * Math.min(1, r);
      const ring = Math.abs(Math.sin(Math.log(Math.max(r, .05)) * 9));
      if (r >= .16 && ring < .07) tone = 0;
      if (Math.abs(ny + .62 * Math.min(1, r)) < .015 && r > .2) tone = 1; // 위쪽 조명 줄
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
  }
  addEventListener('resize', resize);

  // ---------- 바퀴벌레 ----------
  let bug = null;
  function spawnBug() { bug = { x: W * .5, y: H + 40, heading: -Math.PI / 2, speed: 0, t: 0, leaving: false, pause: 0 }; }
  function stepBug(dt) {
    const ctx = bugCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!bug) return;
    bug.t += dt;
    if (bug.pause > 0) bug.pause -= dt;
    else {
      if (Math.random() < dt * .5) bug.pause = .3 + Math.random() * .9;
      const target = bug.leaving ? Math.atan2(-H, W * .6 - bug.x) * 0 + (bug.x < W / 2 ? Math.PI : 0) : bug.heading + (Math.random() - .5) * 2.4 * dt * 3;
      bug.heading += (target - bug.heading) * Math.min(1, dt * (bug.leaving ? 2 : 1));
      // 가운데 근처를 맴돌게: 너무 멀어지면 돌아온다
      if (!bug.leaving && bug.t > 1.5) { const back = Math.atan2(H * .42 - bug.y, W * .5 - bug.x); if (Math.hypot(W * .5 - bug.x, H * .42 - bug.y) > Math.min(W, H) * .32) bug.heading += Math.atan2(Math.sin(back - bug.heading), Math.cos(back - bug.heading)) * dt * 2; }
      bug.speed = 150; bug.x += Math.cos(bug.heading) * bug.speed * dt; bug.y += Math.sin(bug.heading) * bug.speed * dt;
    }
    if (bug.leaving && (bug.x < -120 || bug.x > W + 120 || bug.y < -120 || bug.y > H + 120)) { bug = null; return; }
    const s = Math.min(W, H) / 520, legs = bug.pause > 0 ? 0 : Math.sin(bug.t * 28);
    ctx.save(); ctx.translate(bug.x, bug.y); ctx.rotate(bug.heading + Math.PI / 2); ctx.scale(s, s);
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

  // ---------- 미끼 일정 (검사 시간 기준 초) ----------
  const lureSet = el => (on) => $(el).classList.toggle('on', on);
  function makeSchedule() {
    const j = () => (Math.random() - .5) * 3;
    return [
      { at: 7 + j(), end: 19, name: 'ask', on: () => lureSet('ask')(true), off: () => lureSet('ask')(false) },
      { at: 16 + j(), end: 24, name: 'phone', on: () => { lureSet('phone')(true); ring(); }, off: () => lureSet('phone')(false) },
      { at: 30 + j(), end: 52, name: 'bug', on: () => spawnBug(), off: () => { if (bug) bug.leaving = true; } },
      { at: 38 + j(), end: 46, name: 'nurse', on: () => { lureSet('nurse')(true); say('nurse'); }, off: () => lureSet('nurse')(false) },
      { at: 47 + j() * .5, end: 54, name: 'winerr', on: () => { lureSet('winerr')(true); winError(); }, off: () => lureSet('winerr')(false) },
      { at: 56 + j(), end: 60, name: 'cut', on: () => { body.dataset.cut = 'true'; drawElsewhere(); click(); }, off: () => { body.dataset.cut = 'false'; } },
      { at: 66 + j(), end: 66.8, name: 'black', on: () => { body.dataset.black = 'true'; bang(); }, off: () => { body.dataset.black = 'false'; } },
      { at: 76 + j(), end: 84, name: 'fakedone', on: () => { lureSet('fakedone')(true); dingdong(); setTimeout(() => say('fakedone'), 900); fakeZero = true; }, off: () => { lureSet('fakedone')(false); fakeZero = false; } }
    ].map(e => ({ ...e, state: 0 }));
  }
  let schedule = makeSchedule(), fakeZero = false;
  function clearLures() {
    for (const e of schedule) if (e.state === 1) e.off();
    for (const id of ['ask', 'phone', 'nurse', 'fakedone', 'winerr']) $(id).classList.remove('on');
    body.dataset.cut = 'false'; body.dataset.black = 'false'; bug = null; fakeZero = false;
  }

  // ---------- 진행 ----------
  let phase = 'intro', scan = 0, settle = 0, retakes = 0, moved = 0, last = 0;
  const setPhase = p => { phase = p; body.dataset.phase = p; };
  function beginScan() {
    setPhase('scan'); scan = 0; moved = 0; schedule = makeSchedule();
    knocking = true; startHum(); beep(1); say('hold');
  }
  function retake(reason) {
    if (phase !== 'scan' || scan < GRACE) return;
    retakes++; body.dataset.retakes = String(retakes); body.dataset.reason = reason;
    clearLures(); knocking = false;
    setPhase('settle'); settle = 0; $('notice').classList.add('on');
    beep(2, 520); say('retake');
  }
  function finish() {
    clearLures(); knocking = false; stopHum(); setPhase('done'); say('done'); beep(3, 1200);
    $('done').querySelector('.count').textContent = retakes ? `다시 찍은 횟수 ${retakes}번.` : '';
    $('done').querySelector('.record').textContent = retakes ? '' : '끝까지 움직이지 않았다.';
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
      if (scan >= SCAN) finish();
    } else if (phase === 'settle') {
      settle += dt / SPEED;
      $('timer').textContent = '남은 시간 ' + fmt(SCAN);
      if (settle >= SETTLE) { $('notice').classList.remove('on'); knocking = true; setPhase('scan'); scan = 0; schedule = makeSchedule(); }
    }
    stepBug(dt);
    // 쿵 할 때마다 화면이 살짝 떨린다
    if (!reduced && knockKick > 0) { bore.style.transform = `translate(${(Math.random() - .5) * 3 * knockKick}px,${(Math.random() - .5) * 3 * knockKick}px)`; knockKick = Math.max(0, knockKick - dt / SPEED * 12); }
    body.dataset.scan = scan.toFixed(1);
  }

  // ---------- 움직임 감지 ----------
  addEventListener('keydown', e => { if (phase === 'scan') { e.preventDefault(); retake('key'); } }, true);
  addEventListener('pointerdown', e => { if (phase === 'scan') { e.preventDefault(); retake('press'); } }, true);
  addEventListener('wheel', () => retake('wheel'), { capture: true, passive: true });
  addEventListener('touchstart', () => retake('touch'), { capture: true, passive: true });
  addEventListener('pointermove', e => { if (phase !== 'scan') return; moved += Math.hypot(e.movementX || 0, e.movementY || 0); if (moved > 2) retake('move'); }, true);

  $('start').addEventListener('click', () => { startAudio(); setPhase('settle'); settle = SETTLE - 1.2; $('notice').classList.remove('on'); setTimeout(beginScan, 1200 / SPEED); });
  resize(); requestAnimationFrame(frame);
  window.MRI = { get phase() { return phase; }, get scan() { return scan; }, get retakes() { return retakes; }, jump(t) { scan = t; } };
})();

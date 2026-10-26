/* 마지막 걸음 — 중환자실 엔딩 컷신 (2026-10-27, 개발자용 시안 src/dev-pages/icu-ending 을 그대로 옮김).
 * 노인이 끝까지 걸으면: 복도 노인 → 하얗게 번지며 아이 → 골목 → 헤드라이트 → 중환자실
 * → Space(또는 화면 누르기)로 숨만 4번 → 기계가 대신 숨 3번 → 인사 → 흰 화면 → onDone.
 * 그림·음성은 ending-assets.js(LAST_WALK_ENDING_ASSETS), 호흡 고리만 코드로 그림(조작 UI). */
const LastWalkEnding = (() => {
  'use strict';
  const A = LAST_WALK_ENDING_ASSETS;
  const SHOT = {
    walk: '01-elder-walk', white: '02-whiteout', child: '03-child-run', lights: '04-headlights',
    wide: '05-icu-wide', face: '06-icu-face', vent: '07-ventilator'
  };
  const VOICE = {
    mother: ['01-mother', '얘야! 거기 차 와!'],
    hear: ['02-hear', '환자분, 제 목소리 들리세요?'],
    breathe: ['03-breathe', '숨 쉬세요. 천천히, 들이쉬고, 내쉬고.'],
    good: ['04-good', '잘하고 계세요.'],
    machine: ['05-machine', '괜찮아요. 이제 기계가 대신 숨 쉬어 줄 거예요.'],
    rest: ['06-rest', '푹 쉬세요, 할아버지.']
  };
  // 기존 중환자실 리듬과 같은 값(들숨 2.2초, 날숨 2.6초, 맞춤 65%).
  const B = { inhale: 2.2, exhale: 2.6, match: .65, need: 4, machine: 3 };

  let root = null, shotEls = [], front = 0, veilEl, lineEl, keysEl, cv, cx, voiceEl;
  function build() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'lw-end'; root.hidden = true;
    root.innerHTML = '<img class="lw-shot" alt=""><img class="lw-shot" alt=""><canvas class="lw-breath" aria-hidden="true"></canvas>' +
      '<div class="lw-grain"></div><div class="lw-veil"></div><p class="lw-line" aria-live="polite"></p><p class="lw-keys" hidden></p><audio preload="auto"></audio>';
    document.body.appendChild(root);
    shotEls = [...root.querySelectorAll('.lw-shot')];
    veilEl = root.querySelector('.lw-veil'); lineEl = root.querySelector('.lw-line'); keysEl = root.querySelector('.lw-keys');
    cv = root.querySelector('.lw-breath'); cx = cv.getContext('2d'); voiceEl = root.querySelector('audio');
    root.addEventListener('pointerdown', e => { held = true; e.preventDefault(); });
    addEventListener('pointerup', () => { held = false; });
    addEventListener('pointercancel', () => { held = false; });
    addEventListener('keydown', e => { if (running && e.code === 'Space') { held = true; e.preventDefault(); } });
    addEventListener('keyup', e => { if (e.code === 'Space') held = false; });
    addEventListener('blur', () => { held = false; });
    addEventListener('resize', resize); resize();
    requestAnimationFrame(frame);
  }

  function show(key, { fade = 900, from = 1.0, to = 1.06, move = 9000 } = {}) {
    const next = shotEls[1 - front], prev = shotEls[front];
    next.style.transition = 'none';
    next.style.transform = `scale(${from})`;
    next.src = A.img[SHOT[key]];
    void next.offsetWidth;
    next.style.transition = `opacity ${fade}ms linear, transform ${move}ms ease-out`;
    next.style.zIndex = '2'; prev.style.zIndex = '1';
    next.classList.add('on');
    next.style.transform = `scale(${to})`;
    setTimeout(() => { if (next.classList.contains('on')) prev.classList.remove('on'); }, fade + 30);
    front = 1 - front;
    root.dataset.shot = key;
  }
  function veil(mode, ms = 1200) { // 'white' | 'black' | 'off'
    veilEl.style.setProperty('--veil', ms + 'ms');
    if (mode !== 'off') veilEl.classList.toggle('black', mode === 'black');
    veilEl.style.opacity = mode === 'off' ? '0' : '1';
  }

  // ---------- 소리 ----------
  let ac = null, master = null, breathGain = null, breathFilter = null, hum = null, noiseBuf = null;
  function audioInit() {
    if (ac) { ac.resume().catch(() => {}); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    breathFilter = ac.createBiquadFilter(); breathFilter.type = 'bandpass'; breathFilter.frequency.value = 700; breathFilter.Q.value = .7;
    breathGain = ac.createGain(); breathGain.gain.value = 0;
    src.connect(breathFilter).connect(breathGain).connect(master); src.start();
  }
  function tone(freq, dur, vol = .05, type = 'sine', to) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, freq, freqTo) {
    if (!ac) return;
    const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur); f.Q.value = 2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + .05);
  }
  function humOn(on) {
    if (!ac) return;
    if (on && !hum) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 58; g.gain.value = 0; g.gain.linearRampToValueAtTime(.025, ac.currentTime + 1.5);
      o.connect(g).connect(master); o.start(); hum = { o, g };
    } else if (!on && hum) {
      hum.g.gain.linearRampToValueAtTime(0, ac.currentTime + .4); hum.o.stop(ac.currentTime + .5); hum = null;
    }
  }
  function horn() { tone(415, .9, .06, 'square'); tone(523, .9, .045, 'square'); noise(1.4, .12, 2400, 500); }
  let beatTimer = 0, beatEvery = 0;
  function heartbeat(every) { beatEvery = every; beatTimer = .2; }

  // ---------- 음성 ----------
  let lineTimer = 0;
  function say(key, sig) {
    const [file, text] = VOICE[key];
    lineEl.textContent = text;
    clearTimeout(lineTimer);
    return new Promise(resolve => {
      let done = false;
      const end = () => { if (done) return; done = true; lineTimer = setTimeout(() => { if (lineEl.textContent === text) lineEl.textContent = ''; }, 700); resolve(); };
      voiceEl.onended = end; voiceEl.onerror = () => setTimeout(end, 2200);
      voiceEl.src = A.audio[file]; voiceEl.currentTime = 0;
      voiceEl.play().catch(() => setTimeout(end, 2200));
      setTimeout(end, 9000);
      if (sig) sig.addEventListener('abort', end, { once: true });
    });
  }

  // ---------- 호흡 ----------
  let held = false;
  const breath = { on: false, hidden: false, mode: 'player', t: 0, lung: .2, match: 0, samples: 0, cycle: 0, good: 0, misses: 0 };
  function resize() { if (!cv) return; const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  function want(t) { const p = t % (B.inhale + B.exhale); return p < B.inhale; }
  function target(t) { const p = t % (B.inhale + B.exhale); return p < B.inhale ? p / B.inhale : 1 - (p - B.inhale) / B.exhale; }
  let onCycle = null;
  function stepBreath(dt) {
    if (!breath.on) { if (breathGain) breathGain.gain.setTargetAtTime(0, ac.currentTime, .1); return; }
    const b = breath, before = b.lung;
    b.t += dt;
    const inhaleWanted = want(b.t);
    let inhaling;
    if (b.mode === 'machine') { b.lung = b.lung + (target(b.t) - b.lung) * Math.min(1, dt * 8); inhaling = inhaleWanted; }
    else {
      inhaling = held;
      b.lung = Math.max(0, Math.min(1, b.lung + (inhaling ? 1 / B.inhale : -1 / B.exhale) * dt));
      if (b.t > .6) { b.samples += dt; if (inhaling === inhaleWanted) b.match += dt; }
    }
    const rate = Math.abs(b.lung - before) / Math.max(dt, 1e-3);
    if (breathGain) {
      breathGain.gain.setTargetAtTime(Math.min(.22, rate * .25), ac.currentTime, .05);
      breathFilter.frequency.setTargetAtTime(inhaling ? 900 : 520, ac.currentTime, .1);
    }
    const cycle = Math.floor(b.t / (B.inhale + B.exhale));
    if (cycle !== b.cycle) {
      b.cycle = cycle;
      if (b.mode === 'machine') { b.good++; noise(.5, .05, 300, 200); }
      else {
        const ratio = b.samples ? b.match / b.samples : 0;
        if (ratio >= B.match) { b.good++; tone(392, .2, .03, 'sine', 587); }
        else { b.misses++; tone(880, .12, .03, 'square'); setTimeout(() => tone(880, .12, .03, 'square'), 180); }
        b.match = b.samples = 0;
      }
      onCycle && onCycle(b);
    }
    root.dataset.breathGood = String(b.good);
  }
  function drawBreath() {
    const w = innerWidth, h = innerHeight;
    cx.clearRect(0, 0, w, h);
    if (!breath.on || breath.hidden) return;
    const portrait = h > w;
    const x = portrait ? w * .5 : w * .8, y = portrait ? h * .3 : h * .42, R = Math.min(w, h) * (portrait ? .2 : .15);
    const rad = v => R * (.35 + .65 * v);
    cx.save();
    cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.setLineDash([6, 7]);
    cx.beginPath(); cx.arc(x, y, rad(target(breath.t)), 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = breath.mode === 'machine' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)';
    cx.beginPath(); cx.arc(x, y, rad(breath.lung), 0, Math.PI * 2); cx.fill();
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(255,255,255,.35)';
    cx.beginPath(); cx.arc(x, y, rad(1) + 6, 0, Math.PI * 2); cx.stroke();
    cx.fillStyle = '#fff'; cx.font = '600 16px "Malgun Gothic",sans-serif'; cx.textAlign = 'center';
    cx.fillText(breath.mode === 'machine' ? `숨 ${breath.good}` : `숨 ${breath.good} / ${B.need}`, x, y + rad(1) + 32);
    cx.restore();
  }

  let last = 0, paused = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(1, (now - last) / 1000) : 0; last = now;
    if (!running || paused) return;
    if (ac && beatEvery) { beatTimer -= dt; if (beatTimer <= 0) { beatTimer = beatEvery; tone(960, .07, .025); } }
    if (ac) stepBreath(dt);
    drawBreath();
  }

  function keys(on) {
    const touch = matchMedia('(pointer:coarse)').matches;
    keysEl.innerHTML = touch ? '화면을 누르고 있기 = 들이쉬기 · 떼기 = 내쉬기' : '<kbd>Space</kbd> 누르고 있기 = 들이쉬기 · 떼기 = 내쉬기';
    keysEl.hidden = !on;
  }

  // ---------- 장면 순서 ----------
  const wait = (ms, sig) => new Promise(r => { const t = setTimeout(r, ms); sig.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true }); });
  const steps = [
    async sig => { // 1. 노인: 한 발씩
      humOn(true); veil('white', 1); show('walk', { fade: 1, from: 1.0, to: 1.08, move: 7000 }); veil('off', 1600);
      for (let i = 0; i < 4 && !sig.aborted; i++) { await wait(1300, sig); tone(90, .18, .05, 'triangle'); }
      await wait(900, sig);
    },
    async sig => { // 2. 치매: 하얗게 번지고 아이가 됨
      veil('white', 1500); await wait(1600, sig);
      show('white', { fade: 1, from: 1.06, to: 1.0, move: 4500 }); veil('off', 1400);
      tone(523, 2.4, .02, 'sine', 1046);
      await wait(3200, sig);
      veil('white', 900); await wait(1000, sig);
    },
    async sig => { // 3. 아이: 공을 쫓아 찻길로
      show('child', { fade: 1, from: 1.0, to: 1.12, move: 4500 }); veil('off', 600);
      await wait(1200, sig); if (sig.aborted) return;
      const v = say('mother', sig); await wait(1800, sig); await v;
    },
    async sig => { // 4. 교통사고: 헤드라이트 → 암전
      show('lights', { fade: 1, from: 1.0, to: 1.25, move: 1600 }); horn();
      await wait(1500, sig);
      veil('black', 1); humOn(false); noise(.5, .25, 180, 60);
      await wait(1800, sig);
    },
    async sig => { // 5. 중환자실: 심전도, 목소리
      show('wide', { fade: 2000, from: 1.08, to: 1.0, move: 9000 }); veil('off', 2000); heartbeat(.95); humOn(true);
      await wait(1800, sig); if (sig.aborted) return;
      await say('hear', sig); await wait(1200, sig);
    },
    async sig => { // 6. 호흡만 조작 (Space / 화면 누르고 있기)
      show('face', { fade: 1200, from: 1.0, to: 1.04, move: 20000 }); veil('off', 1200);
      if (!beatEvery) heartbeat(.95);
      Object.assign(breath, { on: true, hidden: false, mode: 'player', t: 0, lung: .15, match: 0, samples: 0, cycle: 0, good: 0, misses: 0 });
      keys(true);
      say('breathe', sig);
      let saidGood = false;
      await new Promise(resolve => {
        onCycle = b => {
          if (b.good >= 2 && !saidGood) { saidGood = true; say('good', sig); }
          if (b.good >= 2) keys(false);
          if (b.good >= B.need) resolve();
        };
        sig.addEventListener('abort', resolve, { once: true });
      });
      onCycle = null;
    },
    async sig => { // 7. 기계가 대신 숨 — 이제 입력은 상관없음
      keys(false);
      breath.mode = 'machine'; breath.t = Math.ceil(breath.t / (B.inhale + B.exhale)) * (B.inhale + B.exhale); breath.cycle = Math.floor(breath.t / (B.inhale + B.exhale));
      const startGood = breath.good;
      breath.hidden = true;
      show('vent', { fade: 1500, from: 1.05, to: 1.0, move: 6000 });
      await wait(900, sig); if (sig.aborted) { breath.hidden = false; return; }
      say('machine', sig);
      await wait(3600, sig);
      show('face', { fade: 1500, from: 1.04, to: 1.0, move: 12000 }); breath.hidden = false;
      await new Promise(resolve => {
        onCycle = b => { if (b.good - startGood >= B.machine) resolve(); };
        sig.addEventListener('abort', resolve, { once: true });
      });
      onCycle = null;
    },
    async sig => { // 8. 마지막: 넓은 화면, 인사, 하얗게
      breath.on = false;
      show('wide', { fade: 1800, from: 1.05, to: 1.0, move: 8000 }); heartbeat(1.3);
      await wait(1200, sig); if (sig.aborted) return;
      await say('rest', sig); await wait(800, sig);
      veil('white', 2600); await wait(2700, sig);
    }
  ];

  let ctl = null, running = false, token = 0;
  async function play({ onDone } = {}) {
    build(); audioInit(); stop(true);
    const my = ++token;
    root.hidden = false; running = true; paused = false; last = 0;
    for (let i = 0; i < steps.length; i++) {
      ctl = new AbortController();
      root.dataset.step = String(i + 1);
      await steps[i](ctl.signal);
      if (my !== token || !running) return;
    }
    running = false; quiet();
    root.dataset.step = 'end';
    if (onDone) onDone();
  }
  function quiet() {
    breath.on = false; beatEvery = 0; humOn(false); onCycle = null; held = false;
    if (keysEl) keys(false);
    if (voiceEl) voiceEl.pause();
    if (lineEl) lineEl.textContent = '';
    if (breathGain && ac) breathGain.gain.setTargetAtTime(0, ac.currentTime, .05);
  }
  // 되돌아가기·다시 시작: 컷신을 멈추고 덮개를 치움.
  function stop(keepOverlay) {
    token++; running = false; if (ctl) ctl.abort(); quiet();
    if (root && !keepOverlay) { root.hidden = true; shotEls.forEach(e => e.classList.remove('on')); veil('off', 1); delete root.dataset.step; }
  }
  function pause() { if (!running) return; paused = true; held = false; if (voiceEl) voiceEl.pause(); if (ac) ac.suspend().catch(() => {}); }
  function resume() { if (!paused) return; paused = false; last = 0; if (ac) ac.resume().catch(() => {}); if (voiceEl && voiceEl.src && !voiceEl.ended && voiceEl.currentTime > 0) voiceEl.play().catch(() => {}); }
  // 개발용 점검(콘솔에서 호흡 판정 시험)
  const test = { breath, setHeld: v => { held = v; }, step: dt => stepBreath(dt) };
  return { play, stop, pause, resume, test, get running() { return running; } };
})();

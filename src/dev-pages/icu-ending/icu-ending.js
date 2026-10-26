// 중환자실 엔딩 컷신 — 개발자용 전용 페이지 (2026-10-26, Claude Code)
// 흐름: 노인 → 치매로 아이 → 교통사고 → 중환자실에서 호흡만 조작 → 기계가 대신 숨 → 끝.
// 그림은 Codex 이미지 생성(images/), 음성은 Supertonic 3 F1(audio/). 호흡 고리만 코드로 그림(조작 UI).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SHOT = {
    walk: '01-elder-walk', white: '02-whiteout', child: '03-child-run', lights: '04-headlights',
    wide: '05-icu-wide', face: '06-icu-face', vent: '07-ventilator'
  };
  const IMG_EXT = '.png';
  const VOICE = {
    mother: ['01-mother', '얘야! 거기 차 와!'],
    hear: ['02-hear', '환자분, 제 목소리 들리세요?'],
    breathe: ['03-breathe', '숨 쉬세요. 천천히, 들이쉬고, 내쉬고.'],
    good: ['04-good', '잘하고 계세요.'],
    machine: ['05-machine', '괜찮아요. 이제 기계가 대신 숨 쉬어 줄 거예요.'],
    rest: ['06-rest', '푹 쉬세요, 할아버지.']
  };
  // 마지막 걸음의 중환자실 리듬과 같은 값(들숨 2.2초, 날숨 2.6초, 맞춤 65%).
  const B = { inhale: 2.2, exhale: 2.6, match: .65, need: 4, machine: 3 };

  // 미리 불러오기
  for (const name of Object.values(SHOT)) { const i = new Image(); i.src = 'images/' + name + IMG_EXT; }

  const shotEls = [$('shot-a'), $('shot-b')];
  let front = 0;
  function show(key, { fade = 900, from = 1.0, to = 1.06, move = 9000 } = {}) {
    const next = shotEls[1 - front], prev = shotEls[front];
    next.style.transition = 'none';
    next.style.transform = `scale(${from})`;
    next.src = 'images/' + SHOT[key] + IMG_EXT;
    next.dataset.shot = key;
    void next.offsetWidth;
    next.style.transition = `opacity ${fade}ms linear, transform ${move}ms ease-out`;
    next.style.zIndex = '2'; prev.style.zIndex = '1';
    next.classList.add('on');
    next.style.transform = `scale(${to})`;
    setTimeout(() => { if (next.classList.contains('on')) prev.classList.remove('on'); }, fade + 30);
    front = 1 - front;
    document.body.dataset.shot = key;
  }
  function veil(mode, ms = 1200) { // 'white' | 'black' | 'off'
    const v = $('veil');
    v.style.setProperty('--veil', ms + 'ms');
    if (mode !== 'off') v.classList.toggle('black', mode === 'black');
    v.style.opacity = mode === 'off' ? '0' : '1';
  }

  // ---------- 소리 ----------
  let ac = null, master = null, breathGain = null, breathFilter = null, hum = null;
  function audioInit() {
    if (ac) { ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
    // 숨소리: 흰 잡음 → 대역 필터 → 게인(폐 변화량에 따라)
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    breathFilter = ac.createBiquadFilter(); breathFilter.type = 'bandpass'; breathFilter.frequency.value = 700; breathFilter.Q.value = .7;
    breathGain = ac.createGain(); breathGain.gain.value = 0;
    src.connect(breathFilter).connect(breathGain).connect(master); src.start();
    noiseBuf = buf;
  }
  let noiseBuf = null;
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
  // 심전도 삑 소리(마지막 걸음과 같은 960Hz)
  let beatTimer = 0, beatEvery = 0;
  function heartbeat(every) { beatEvery = every; beatTimer = .2; }

  // ---------- 음성 ----------
  const voiceEl = $('voice');
  let lineTimer = 0;
  function say(key, sig) {
    const [file, text] = VOICE[key];
    $('line').textContent = text;
    clearTimeout(lineTimer);
    return new Promise(resolve => {
      let done = false;
      const end = () => { if (done) return; done = true; lineTimer = setTimeout(() => { if ($('line').textContent === text) $('line').textContent = ''; }, 700); resolve(); };
      voiceEl.onended = end; voiceEl.onerror = () => setTimeout(end, 2200);
      voiceEl.src = 'audio/' + file + '.wav'; voiceEl.currentTime = 0;
      voiceEl.play().catch(() => setTimeout(end, 2200));
      setTimeout(end, 9000);
      if (sig) sig.addEventListener('abort', end, { once: true });
    });
  }

  // ---------- 호흡 ----------
  const cv = $('breath'), cx = cv.getContext('2d');
  let held = false;
  const breath = { on: false, mode: 'player', t: 0, lung: .2, match: 0, samples: 0, cycle: 0, good: 0, misses: 0, shown: 0 };
  // 개발용 점검(브라우저 콘솔에서 호흡 판정을 프레임 단위로 시험)
  window.__icuTest = { breath, setHeld: v => { held = v; }, step: dt => stepBreath(dt) };
  function resize() { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  addEventListener('resize', resize); resize();
  function want(t) { const p = t % (B.inhale + B.exhale); return p < B.inhale; }
  function target(t) { const p = t % (B.inhale + B.exhale); return p < B.inhale ? p / B.inhale : 1 - (p - B.inhale) / B.exhale; }
  let onCycle = null;
  function stepBreath(dt) {
    if (!breath.on) { breathGain && breathGain.gain.setTargetAtTime(0, ac.currentTime, .1); return; }
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
    document.body.dataset.breathGood = String(b.good);
  }
  function drawBreath() {
    const w = innerWidth, h = innerHeight;
    cx.clearRect(0, 0, w, h);
    if (!breath.on || breath.hidden) return;
    const portrait = h > w;
    const x = portrait ? w * .5 : w * .8, y = portrait ? h * .3 : h * .42, R = Math.min(w, h) * (portrait ? .2 : .15);
    const rad = v => R * (.35 + .65 * v);
    // 목표 고리(점선) — 기계 리듬
    cx.save();
    cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.setLineDash([6, 7]);
    cx.beginPath(); cx.arc(x, y, rad(target(breath.t)), 0, Math.PI * 2); cx.stroke();
    cx.setLineDash([]);
    // 내 숨(채운 원)
    cx.fillStyle = breath.mode === 'machine' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)';
    cx.beginPath(); cx.arc(x, y, rad(breath.lung), 0, Math.PI * 2); cx.fill();
    // 바깥 한계선
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(255,255,255,.35)';
    cx.beginPath(); cx.arc(x, y, rad(1) + 6, 0, Math.PI * 2); cx.stroke();
    // 숫자
    cx.fillStyle = '#fff'; cx.font = '600 16px "Malgun Gothic",sans-serif'; cx.textAlign = 'center';
    cx.fillText(breath.mode === 'machine' ? `숨 ${breath.good}` : `숨 ${breath.good} / ${B.need}`, x, y + rad(1) + 32);
    cx.restore();
  }

  // ---------- 매 프레임 ----------
  let last = performance.now();
  function frame(now) {
    // 실제 시간 기준(화면이 느려져도 기계 리듬이 어긋나지 않게)
    const dt = Math.min(1, (now - last) / 1000); last = now;
    if (ac && beatEvery) { beatTimer -= dt; if (beatTimer <= 0) { beatTimer = beatEvery; tone(960, .07, .025); } }
    if (ac) stepBreath(dt);
    drawBreath();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 입력: Space / 마우스 / 터치를 누르고 있으면 들숨
  addEventListener('keydown', e => { if (e.code === 'Space') { held = true; e.preventDefault(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') held = false; });
  const frameEl = document.querySelector('.frame');
  frameEl.addEventListener('pointerdown', e => { held = true; e.preventDefault(); });
  addEventListener('pointerup', () => { held = false; });
  addEventListener('pointercancel', () => { held = false; });
  addEventListener('blur', () => { held = false; });

  function keys(on) {
    const k = $('keys');
    const touch = matchMedia('(pointer:coarse)').matches;
    k.innerHTML = touch ? '화면을 누르고 있기 = 들이쉬기 · 떼기 = 내쉬기' : '<kbd>Space</kbd> 누르고 있기 = 들이쉬기 · 떼기 = 내쉬기';
    k.hidden = !on;
  }

  // ---------- 장면 순서 ----------
  const wait = (ms, sig) => new Promise(r => { const t = setTimeout(r, ms); sig.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true }); });
  const steps = [
    async sig => { // 1. 노인: 한 발씩
      humOn(true); veil('off', 1); show('walk', { fade: 1600, from: 1.0, to: 1.08, move: 7000 });
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
    async sig => { // 6. 호흡만 조작 (Space 누르고 있기)
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
      if (!breath.on) Object.assign(breath, { on: true, t: 0, cycle: 0, good: B.need });
      breath.mode = 'machine'; breath.t = Math.ceil(breath.t / (B.inhale + B.exhale)) * (B.inhale + B.exhale); breath.cycle = Math.floor(breath.t / (B.inhale + B.exhale));
      const startGood = breath.good;
      // 기계 클로즈업 동안은 고리를 숨기고, 다시 얼굴로 돌아오면 고리가 혼자 움직임(눌러도 상관없음)
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

  let ctl = null, stepIndex = 0, running = false;
  async function run() {
    running = true; stepIndex = 0;
    while (running && stepIndex < steps.length) {
      ctl = new AbortController();
      document.body.dataset.step = String(stepIndex + 1);
      await steps[stepIndex](ctl.signal);
      if (!running) return;
      stepIndex++;
    }
    finish();
  }
  function stopAll() {
    breath.on = false; heartbeat(0); humOn(false); keys(false); onCycle = null;
    voiceEl.pause(); $('line').textContent = '';
  }
  function finish() {
    running = false; stopAll();
    $('scene').hidden = true; $('end').hidden = false; document.body.dataset.step = 'end';
    shotEls.forEach(e => e.classList.remove('on'));
  }
  function start() {
    audioInit();
    $('start').hidden = true; $('end').hidden = true; $('scene').hidden = false;
    veil('black', 1); stopAll();
    run();
  }
  $('play').addEventListener('click', start);
  $('again').addEventListener('click', start);
  $('skip').addEventListener('click', () => { if (ctl) ctl.abort(); });
  // 개발용: 주소 끝 #breath 로 호흡 장면부터 바로 시작
  if (location.hash === '#breath') { const n = 5; steps.splice(0, n); }
})();

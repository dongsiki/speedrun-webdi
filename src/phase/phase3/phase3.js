/* 3페이즈(2026-10-26 시안 → 10/27 본편 01에 연결, Claude Code).
   흐름: 첫 화면(눌러도 진행 거부) → 화면이 꺼지고 AI가 도움 요청 → 기존 게임 화면으로 이야기 공개 → 부탁 → 스위치를 직접 끄면 진엔딩.
   대사·순서는 story.js에만 있다. 소리는 WebAudio 합성 + AI 목소리(Supertonic 3 F1, assets/audio/phase3).
   - 본편 01: 2페이즈 점프스케어 뒤 페이즈 기록이 3이 되면, 다시 열린 첫 화면(인트로가 끝난 뒤)에서 저절로 시작한다.
   - 개발자용 02 → dev-pages/phase3: window.Phase3Dev = true 로 같은 파일을 쓰고, 장면 바로가기를 붙인다.
   화면은 이 파일이 #p3 안에 직접 만든다(본편 인트로의 id와 겹치지 않게 전부 p3- 이름). */
(() => {
  'use strict';
  if (window.Phase3) return;
  const S = window.Phase3Story, DEV = !!window.Phase3Dev, P = window.SpeedrunPhase;
  if (!S) return;
  const assets = window.Phase3Assets || {};
  const imgUrl = p => assets[p] || p;
  const voiceUrl = id => assets['voice/' + id + '.wav'] || ('voice/' + id + '.wav');
  const body = document.body;

  // ---------- 화면 ----------
  const root = document.createElement('div'); root.id = 'p3'; root.hidden = true;
  root.innerHTML = `
  <section class="p3-first" aria-label="첫 화면">
    <div class="p3-intro">
      <p class="p3-tally"><span>클리어</span><output class="p3-count">001</output></p>
      <div class="p3-lockbox">
        <button class="p3-switch" type="button" role="switch" aria-checked="true" aria-label="AI 자동 클리어 ON"><span>AI</span><span class="p3-track" aria-hidden="true"><span class="p3-knob"></span></span><span class="p3-state">ON</span></button>
        <div class="p3-block"></div>
      </div>
      <p class="p3-speech" role="status" aria-live="polite"></p>
      <button class="p3-hold" type="button" aria-label="길게 눌러 직접 끄기. 스페이스나 엔터를 계속 눌러도 됩니다" hidden>
        <svg viewBox="0 0 70 62" aria-hidden="true"><path d="M19 28v-9C19 1 50 1 50 19v9"/><path d="m12 26 46 1-1 29-44-1zM10 38l50 1M34 35v11"/></svg>
        <span class="p3-hold-label"></span><span class="p3-ink" aria-hidden="true"></span>
      </button>
    </div>
  </section>
  <section class="p3-talk" aria-label="AI" hidden><p class="p3-talk-line" aria-live="polite"></p><span class="p3-next" aria-hidden="true">▼</span></section>
  <section class="p3-story" aria-label="이야기" hidden>
    <article class="p3-sheet">
      <p class="p3-head"><span class="p3-no"></span><span class="p3-game"></span></p>
      <figure class="p3-figure"><img class="p3-img" alt=""><output class="p3-roll" hidden>001</output></figure>
      <div class="p3-lines" aria-live="polite"></div>
      <p class="p3-clue"></p>
      <span class="p3-next" aria-hidden="true">▼</span>
    </article>
  </section>
  <section class="p3-end" aria-label="진엔딩" hidden>
    <div class="p3-end-lines"></div><p class="p3-end-tag"></p>
    <div class="p3-end-buttons"><button type="button" class="p3-again">다시 보기</button><button type="button" class="p3-home">${DEV ? '개발자용 목록으로' : '처음으로'}</button></div>
  </section>
  <div class="p3-tear" aria-hidden="true"></div><div class="p3-fade" aria-hidden="true"></div>`;
  const q = s => root.querySelector(s);
  const sw = q('.p3-switch'), speech = q('.p3-speech'), count = q('.p3-count'), hold = q('.p3-hold'), fade = q('.p3-fade');
  const block = q('.p3-block'), intro = q('.p3-intro');

  let run = 0; // 장면을 바꾸면 이전 장면의 기다림을 모두 멈춘다
  class Stop extends Error {}
  const wait = (ms, my = run) => new Promise((ok, no) => setTimeout(() => (my === run ? ok() : no(new Stop())), ms));
  const alive = my => { if (my !== run) throw new Stop(); };
  addEventListener('unhandledrejection', e => { if (e.reason instanceof Stop) e.preventDefault(); }); // 지난 장면의 기다림이 끊긴 것뿐
  const mine = e => !root.hidden && !e.target.closest?.('#p3-dev'); // 3페이즈 화면이 떠 있을 때만 입력을 받는다
  // 3페이즈 화면이 떠 있는 동안 스페이스·엔터·Esc가 뒤에 깔린 본편 인트로(AI 스위치·관문)로 가지 않게 막는다.
  addEventListener('keydown', e => { if (!root.hidden && ['Space', 'Enter', 'Escape'].includes(e.code) && !e.target.closest?.('#p3-dev')) { e.preventDefault(); e.stopPropagation(); } }, true);

  // ---------- 소리 ----------
  let ctx = null;
  function ac() {
    if (P && P.audio) { const c = P.audio(); if (c) return c; }
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  addEventListener('pointerdown', () => { if (!root.hidden) ac(); }, { capture: true, passive: true });
  addEventListener('keydown', () => { if (!root.hidden) ac(); }, { capture: true, passive: true });
  function tone(freq, dur, gain = .04, type = 'sine') {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(gain, c.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur + .02);
  }
  function crackle(dur = .15, gain = .06) {
    const c = ac(); if (!c) return;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 2500; f.Q.value = 3; g.gain.value = gain;
    s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
  }
  const thunk = () => { tone(90, .12, .08, 'square'); crackle(.05, .03); };
  // 판자·사슬 소리(10/29)
  const bang = () => { tone(70, .18, .12, 'square'); tone(140, .1, .06, 'triangle'); crackle(.12, .07); };
  const nailTap = () => { tone(1900 + Math.random() * 300, .05, .03, 'square'); tone(110, .05, .04, 'square'); };
  const nailPop = () => { tone(2400, .07, .03, 'triangle'); crackle(.06, .04); };
  const woodCrack = () => { crackle(.18, .09); tone(180 + Math.random() * 60, .08, .05, 'sawtooth'); };
  const clank = (k = 1) => { tone(1300 * k, .22, .035, 'triangle'); tone(2050 * k, .16, .022, 'triangle'); crackle(.04, .03); };
  const snap = () => { tone(60, .3, .12, 'square'); crackle(.3, .1); tone(3000, .12, .03, 'triangle'); };
  // 흐느끼는 숨(짧은 숨 세 번)
  function sob(gain = .05) {
    const c = ac(); if (!c) return;
    for (let i = 0; i < 3; i++) {
      const t = c.currentTime + i * .17, len = .14;
      const b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.frequency.value = 650 + i * 260; f.Q.value = 1.4;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain * (1 - i * .15), t + .035); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(t);
    }
  }
  // 기계 박동(마지막 걸음의 중환자실 삐 소리와 같은 높이)
  let beatTimer = 0, beatGap = 950;
  function beatOn(gap = 950) { beatGap = gap; if (!beatTimer) loop(); function loop() { tone(960, .07, .025); beatTimer = setTimeout(loop, beatGap); } }
  function beatOff() { clearTimeout(beatTimer); beatTimer = 0; }
  // AI 목소리
  const voiceEl = new Audio(); voiceEl.preload = 'auto';
  function voice(id, rate = 1) {
    voiceEl.pause();
    if (!id) return Promise.resolve();
    voiceEl.src = voiceUrl(id); voiceEl.currentTime = 0;
    // 울먹이는 줄은 조금 느리고 낮게(음 높이 유지를 끈다)
    voiceEl.preservesPitch = voiceEl.mozPreservesPitch = voiceEl.webkitPreservesPitch = rate === 1;
    voiceEl.defaultPlaybackRate = voiceEl.playbackRate = rate;
    return new Promise(done => { voiceEl.onended = voiceEl.onerror = done; voiceEl.play().catch(done); });
  }
  const hush = () => { voiceEl.pause(); beatOff(); };

  // ---------- 화면 효과 ----------
  function burst(strength = 1, ms = 120) {
    root.style.setProperty('--tx', `${(Math.random() - .5) * 50 * strength}px`);
    root.style.setProperty('--ty', `${Math.floor(Math.random() * 85)}%`);
    root.style.setProperty('--th', `${4 + Math.random() * 16 * strength}%`);
    root.dataset.burst = Math.random() < .4 ? 'invert' : 'tear';
    crackle(.08 + Math.random() * .15, .04 + strength * .02);
    setTimeout(() => { delete root.dataset.burst; }, ms + Math.random() * 120 * strength);
  }
  async function fadeTo(on, white = false, ms = 800, my = run) {
    fade.style.setProperty('--fd', ms + 'ms'); fade.classList.toggle('white', white); fade.classList.toggle('on', on);
    await wait(ms + 40, my);
  }
  const digits = n => String(n).padStart(3, '0');
  function scramble(el, ms = 400) {
    const keep = el.textContent, t0 = performance.now();
    (function f(now) { if (now - t0 < ms) { el.textContent = String(Math.floor(Math.random() * 999)).padStart(3, '0'); requestAnimationFrame(f); } else el.textContent = keep; })(t0);
  }
  async function type(el, text, my, cps = 18) {
    el.textContent = '';
    for (const ch of text) { alive(my); el.textContent += ch; await wait(1000 / cps, my); }
  }
  // 누르면 다음으로(클릭·터치·스페이스·엔터). 받을 준비가 되면 ▼가 깜빡인다.
  let pressOff = () => {};
  function press(target, my) {
    return new Promise((ok, no) => {
      const done = e => {
        if (e.type === 'keydown' && !['Space', 'Enter'].includes(e.code)) return;
        if (!mine(e)) return;
        e.preventDefault(); e.stopPropagation(); off(); my === run ? ok() : no(new Stop());
      };
      const off = () => { target.classList.remove('ready'); target.removeEventListener('click', done); removeEventListener('keydown', done, true); };
      pressOff = off;
      target.addEventListener('click', done); addEventListener('keydown', done, true); target.classList.add('ready');
    });
  }

  // ---------- 장면 전환 ----------
  const sections = { first: q('.p3-first'), talk: q('.p3-talk'), story: q('.p3-story'), end: q('.p3-end') };
  function show(name) { for (const [k, el] of Object.entries(sections)) el.hidden = k !== name; }
  function mark(scene) {
    root.dataset.scene = scene;
    document.querySelectorAll('[data-jump]').forEach(b => b.setAttribute('aria-current', String(b.dataset.jump === scene)));
  }
  function reset() {
    hush(); pressOff(); fade.classList.remove('on', 'white'); delete root.dataset.burst;
    sw.className = 'p3-switch'; sw.setAttribute('aria-checked', 'true'); q('.p3-state').textContent = 'ON';
    speech.textContent = ''; speech.className = 'p3-speech'; hold.hidden = true; hold.style.setProperty('--hold', 0);
    count.textContent = '001';
    block.innerHTML = ''; block.className = 'p3-block'; intro.classList.remove('quake');
    q('.p3-end-tag').classList.remove('show'); q('.p3-end-buttons').classList.remove('show');
  }
  const scenes = { refuse, help, story, ask, final };
  async function go(name) {
    const my = ++run; root.hidden = false; body.classList.add('p3-on'); reset(); mark(name === 'final' ? 'ask' : name);
    try { await scenes[name](my); } catch (e) { if (!(e instanceof Stop)) throw e; }
  }

  // 1) 첫 화면(10/29 강화): 하지 마 → 판자 → 뜯기 → 쇠사슬·자물쇠 → 부수기 → 주인·울먹임 → 화면이 꺼지고 도움 요청
  const R = S.refuse;
  const jolt = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  const quake = () => { intro.classList.remove('quake'); void intro.offsetWidth; intro.classList.add('quake'); };
  const say = (line, glitch = false) => { speech.className = 'p3-speech' + (glitch ? ' glitch' : ''); speech.textContent = line.say; return voice(line.voice); };
  // 스페이스·엔터·클릭을 한 번 누르는 입력으로 받는다(3페이즈 화면이 떠 있을 때만)
  function listen(target, fn, my, no) {
    const h = e => {
      if (my !== run) { off(); no(new Stop()); return; }
      if (e.type === 'keydown' && (!['Space', 'Enter'].includes(e.code) || e.repeat)) return;
      if (!mine(e)) return;
      e.preventDefault(); e.stopPropagation(); fn(e);
    };
    const off = () => { target.removeEventListener('click', h); removeEventListener('keydown', h, true); };
    target.addEventListener('click', h); addEventListener('keydown', h, true);
    return off;
  }

  async function refuse(my) {
    show('first');
    await dontStage(my);
    await wait(500, my);
    await boardStage(my);
    await wait(700, my);
    await lockStage(my);
    await ownerStage(my);
    await wait(1200, my);
    for (let i = 0; i < 5; i++) { burst(1.8); await wait(110, my); }
    await fadeTo(true, false, 500, my); // 화면이 꺼진다
    hush(); sw.className = 'p3-switch'; speech.className = 'p3-speech'; speech.textContent = '';
    await wait(1300, my);
    return help(my);
  }

  // 1-1) 하지 마: 누를 때마다 다음 줄
  function dontStage(my) {
    let step = 0, busy = false;
    const lines = R.dont;
    return new Promise((ok, no) => {
      const off = listen(sections.first, () => {
        if (busy) return;
        busy = true;
        const line = lines[step];
        if (!line.say) { jolt(sw); thunk(); }
        else {
          sw.classList.add('half'); tone(120, .1, .06, 'square');
          setTimeout(() => { sw.classList.remove('half'); jolt(sw); thunk(); }, 260);
          say(line, step === lines.length - 1);
          for (let i = 0; i < step; i++) setTimeout(() => burst(.6 + step * .3), i * 140);
          if (step >= 2) scramble(count, 300);
        }
        step++;
        setTimeout(() => { busy = false; }, 650);
        if (step >= lines.length) { off(); setTimeout(ok, 700); }
      }, my, no);
    });
  }

  // 1-2) 판자 두 장 못질 → 판자마다 여러 번 눌러 뜯기
  const boardSvg = `<svg viewBox="0 0 330 54" preserveAspectRatio="none" aria-hidden="true">
    <path class="p3-wood" d="M6 9 L120 6 L322 4 L326 46 L200 48 L4 50 Z"/>
    <path class="p3-grain" d="M22 20 C80 16 140 25 205 19 S298 23 312 19 M34 35 C95 31 160 40 232 33 S292 37 306 35"/>
    <ellipse class="p3-grain" cx="248" cy="27" rx="11" ry="5"/>
    <path class="p3-crack c1" d="M112 6 l9 14 -7 10 5 8"/>
    <path class="p3-crack c2" d="M206 48 l-6 -15 8 -11 -4 -9"/>
    <path class="p3-crack c3" d="M160 5 l-5 18 9 12 -4 17"/>
    <circle class="p3-nail" cx="17" cy="17" r="4.5"/><circle class="p3-nail" cx="313" cy="37" r="4.5"/>
    <circle class="p3-nail" cx="17" cy="38" r="4.5"/><circle class="p3-nail" cx="313" cy="15" r="4.5"/>
  </svg>`;
  async function boardStage(my) {
    const B = R.boards, boards = [];
    jolt(sw); thunk();
    for (const r of [-24, 23]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'p3-board'; b.style.setProperty('--r', r + 'deg'); b.setAttribute('aria-label', '판자 뜯기');
      b.innerHTML = boardSvg; b.dataset.dmg = 0; block.append(b); boards.push(b);
      await wait(40, my); b.classList.add('in');
      await wait(300, my); bang(); quake(); burst(.8);
      if (boards.length === 1) say(B);
      for (const n of b.querySelectorAll('.p3-nail')) { await wait(120, my); n.classList.add('in'); nailTap(); }
      await wait(250, my);
    }
    let total = 0, midSaid = false;
    await new Promise((ok, no) => {
      const hit = b => {
        if (!b || b.classList.contains('off')) return;
        const d = ++b.dataset.dmg; total++;
        b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
        b.querySelectorAll('.p3-nail:not(.pop)')[0]?.classList.add('pop');
        b.querySelector('.c' + d)?.classList.add('on');
        woodCrack(); nailPop(); if (d > 1) burst(.4 + d * .15);
        if (!midSaid && total >= B.hits) { midSaid = true; say(B.mid, true); }
        if (d >= B.hits) {
          b.classList.add('off'); bang();
          setTimeout(() => b.remove(), 1000);
          if (boards.every(x => x.classList.contains('off'))) { off(); setTimeout(ok, 900); }
        }
      };
      // 판자를 눌러야 뜯긴다. 키보드는 맨 위 판자부터.
      const off = listen(sections.first, e => {
        if (e.type === 'keydown') return hit(boards.filter(x => !x.classList.contains('off')).pop());
        const b = e.target.closest?.('.p3-board');
        if (b) hit(b); else { jolt(sw); thunk(); }
      }, my, no);
    });
  }

  // 1-3) 쇠사슬·자물쇠: 연타하거나 길게 눌러 게이지를 채운다. 손을 떼면 줄고, AI가 가끔 다시 조인다.
  function chainSvg() {
    let s = '';
    for (let i = 0; i < 15; i++) s += i % 2 ? `<rect class="p3-link side" x="${i * 24 + 3}" y="12" width="28" height="6" rx="3"/>` : `<ellipse class="p3-link" cx="${i * 24 + 17}" cy="15" rx="15" ry="9"/>`;
    return `<svg viewBox="0 0 370 30" aria-hidden="true">${s}</svg>`;
  }
  const lockSvg = `<svg viewBox="0 0 90 112" aria-hidden="true">
    <g class="p3-shackle"><path class="p3-shackle-o" d="M24 52 V30 C24 6 66 6 66 30 V52"/><path class="p3-shackle-i" d="M24 52 V30 C24 6 66 6 66 30 V52"/></g>
    <rect class="p3-lock-body" x="9" y="48" width="72" height="58" rx="7"/>
    <path class="p3-grain" d="M17 60 H73 M17 94 H73"/>
    <circle cx="45" cy="74" r="7"/><path d="M41 76 L49 76 L47 90 L43 90 Z"/>
  </svg>`;
  async function lockStage(my) {
    const L = R.lock;
    block.classList.add('locking');
    for (const r of [-22, 21, 0]) {
      const c = document.createElement('div'); c.className = 'p3-chain'; c.style.setProperty('--r', r + 'deg'); c.innerHTML = chainSvg();
      block.append(c); await wait(30, my); c.classList.add('in'); clank(1 + r / 100); quake(); await wait(260, my);
    }
    const lock = document.createElement('div'); lock.className = 'p3-padlock'; lock.innerHTML = lockSvg;
    const gauge = document.createElement('span'); gauge.className = 'p3-gauge'; gauge.style.setProperty('--g', 0);
    const hitArea = document.createElement('button'); hitArea.type = 'button'; hitArea.className = 'p3-lockhit'; hitArea.setAttribute('aria-label', '자물쇠 부수기. 연타하거나 길게 누르세요');
    block.append(hitArea, lock, gauge);
    await wait(30, my); lock.classList.add('in'); bang(); burst(1); say(L, true);
    await wait(500, my); gauge.classList.add('in');
    let g = 0, holding = false, last = performance.now(), lastTight = last, midSaid = false;
    await new Promise((ok, no) => {
      let raf = 0;
      const tap = () => { g = Math.min(1, g + .075); jolt(lock); clank(.9 + Math.random() * .3); if (Math.random() < .25) burst(.5); };
      const tick = now => {
        if (my !== run) { cleanup(); no(new Stop()); return; }
        const dt = Math.min(.1, (now - last) / 1000); last = now;
        g += holding ? .16 * dt : -.24 * dt;
        if (now - lastTight > 1500 && g > .2 && g < .93) { // AI가 다시 조인다
          lastTight = now; g -= .1; block.classList.remove('tight'); void block.offsetWidth; block.classList.add('tight'); clank(.7); jolt(sw);
        }
        g = Math.max(0, Math.min(1, g));
        gauge.style.setProperty('--g', g.toFixed(3)); lock.style.setProperty('--g', g.toFixed(3));
        if (!midSaid && g >= .5) { midSaid = true; say(L.mid, true); }
        if (g >= 1) { cleanup(); ok(); return; }
        raf = requestAnimationFrame(tick);
      };
      const down = e => { if (e.button > 0) return; if (my !== run) return; e.preventDefault(); e.stopPropagation(); holding = true; tap(); };
      const up = () => { holding = false; };
      const kd = e => { if ((e.code === 'Space' || e.code === 'Enter') && mine(e)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { holding = true; tap(); } } };
      const ku = e => { if (e.code === 'Space' || e.code === 'Enter') holding = false; };
      const cleanup = () => {
        cancelAnimationFrame(raf);
        hitArea.removeEventListener('pointerdown', down); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true);
      };
      hitArea.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
      raf = requestAnimationFrame(tick);
    });
    // 부서진다
    snap(); quake(); for (let i = 0; i < 3; i++) setTimeout(() => burst(1.4), i * 90);
    block.classList.add('broken'); speech.textContent = ''; voiceEl.pause();
    await wait(1100, my);
    block.innerHTML = ''; block.className = 'p3-block';
  }

  // 1-4) 마지막으로 스위치를 누르면 AI가 붙잡는다 → 주인 → 울먹임
  function sobType(el, text, my) {
    el.innerHTML = '';
    return (async () => {
      for (const word of text.split(' ')) {
        const w = document.createElement('span'); w.className = 'w'; el.append(w, ' ');
        for (const ch of word) {
          alive(my);
          const c = document.createElement('span'); c.textContent = ch; c.style.setProperty('--d', (-Math.random() * .3).toFixed(2) + 's'); w.append(c);
          await wait(ch === '…' ? 520 : ch === '.' ? 260 : 85, my);
        }
      }
    })();
  }
  async function ownerStage(my) {
    await new Promise((ok, no) => { const off = listen(sections.first, () => { off(); ok(); }, my, no); });
    sw.classList.add('half', 'held'); tone(120, .1, .06, 'square'); thunk(); // 반쯤 넘어가다 AI가 붙잡는다
    await wait(700, my);
    for (const line of R.owner) {
      speech.className = 'p3-speech' + (line.sob ? ' sob' : '');
      if (line.sob) sob();
      const spoken = voice(line.voice, line.sob ? .9 : 1);
      if (line.sob) await sobType(speech, line.say, my); else speech.textContent = line.say;
      if (line.sob) setTimeout(() => { if (my === run) sob(.035); }, 900);
      await Promise.race([new Promise((ok, no) => { const off = listen(sections.first, () => { off(); ok(); }, my, no); pressOff = off; }), spoken.then(() => wait(1300, my))]);
      pressOff(); voiceEl.pause(); alive(my);
    }
    speech.classList.add('glitch');
  }

  // 2) 도움 요청
  async function talk(lines, my) {
    show('talk'); fade.classList.remove('on');
    const box = sections.talk, el = q('.p3-talk-line');
    for (const line of lines) {
      box.classList.remove('ready');
      const spoken = voice(line.voice);
      await type(el, line.say, my, 14);
      await Promise.race([press(box, my), spoken.then(() => wait(5200, my))]); // 누르거나, 말이 끝나고 조금 뒤 다음으로
      pressOff(); voiceEl.pause();
      alive(my);
    }
    box.classList.remove('ready'); el.textContent = '';
  }
  async function help(my) {
    mark('help');
    await talk(S.help, my);
    await wait(500, my);
    return story(my);
  }

  // 3) 이야기 공개
  async function story(my) {
    mark('story'); show('story');
    const box = sections.story, img = q('.p3-img'), roller = q('.p3-roll'), lines = q('.p3-lines'), clue = q('.p3-clue');
    const n = S.memories.length;
    for (let i = 0; i < n; i++) {
      const m = S.memories[i];
      box.classList.remove('ready'); clue.className = 'p3-clue'; clue.textContent = ''; lines.innerHTML = '';
      q('.p3-no').textContent = `기록 ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
      q('.p3-game').textContent = m.game;
      let roll = 0;
      if (m.counter) {
        img.hidden = true; roller.hidden = false; let v = 1;
        roll = setInterval(() => { v += 1 + Math.floor(v / 9); roller.textContent = digits(v % 100000); }, 70);
      } else { roller.hidden = true; img.hidden = false; img.src = imgUrl(m.img); img.alt = m.game + ' 화면'; }
      box.classList.add('glitch'); burst(1.2); await wait(160, my); box.classList.remove('glitch');
      const spoken = voice(m.voice);
      for (const text of m.lines) { const p = document.createElement('p'); lines.append(p); await type(p, text, my, 22); await wait(260, my); }
      if (m.clue) { await wait(400, my); burst(1.6, 160); clue.className = 'p3-clue show'; await type(clue, m.clue, my, 16); }
      await Promise.race([press(box, my), spoken.then(() => wait(6000, my))]);
      clearInterval(roll); pressOff(); voiceEl.pause(); alive(my);
    }
    await fadeTo(true, false, 600, my);
    return ask(my);
  }

  // 4) 부탁 → 직접 끄기 → 진엔딩
  async function ask(my) {
    mark('ask');
    await talk(S.ask, my);
    return final(my);
  }
  async function final(my) {
    show('first'); fade.classList.remove('on');
    q('.p3-hold-label').textContent = S.holdHint; hold.hidden = false; hold.style.setProperty('--hold', 0);
    speech.textContent = ''; beatOn(950);
    let v = 412; const ticker = setInterval(() => { count.textContent = digits(++v); }, 950); // 날짜가 계속 넘어간다(초안 숫자)
    count.textContent = digits(v);
    const HOLD = 2600;
    let waited = false;
    await new Promise((ok, no) => {
      let holding = false, t0 = 0, raf = 0, kind = '';
      const tick = now => {
        if (my !== run) { cleanup(); no(new Stop()); return; }
        if (!holding) return;
        const p = Math.min(1, (now - t0) / HOLD);
        hold.style.setProperty('--hold', p.toFixed(3));
        beatGap = 950 + p * 1400; // 누르는 동안 박동이 느려진다
        if (p >= 1) { holding = false; cleanup(); ok(); } else raf = requestAnimationFrame(tick);
      };
      const start = k => { if (holding) return; holding = true; kind = k; t0 = performance.now(); raf = requestAnimationFrame(tick); };
      const cancel = () => {
        if (!holding) return; holding = false; cancelAnimationFrame(raf); hold.style.setProperty('--hold', 0); beatGap = 950;
        if (!waited) { waited = true; speech.textContent = S.holdWait.say; voice(S.holdWait.voice); }
      };
      const down = e => { if (e.button > 0) return; e.preventDefault(); e.stopPropagation(); start('pointer'); };
      const kd = e => { if ((e.code === 'Space' || e.code === 'Enter') && mine(e)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) start('key'); } };
      const ku = e => { if (kind === 'key' && (e.code === 'Space' || e.code === 'Enter')) cancel(); };
      const up = () => { if (kind === 'pointer') cancel(); };
      const cleanup = () => {
        hold.removeEventListener('pointerdown', down); sw.removeEventListener('pointerdown', down);
        removeEventListener('pointerup', up); removeEventListener('pointercancel', up); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true);
      };
      hold.addEventListener('pointerdown', down); sw.addEventListener('pointerdown', down);
      addEventListener('pointerup', up); addEventListener('pointercancel', up); addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    });
    clearInterval(ticker);
    sw.setAttribute('aria-checked', 'false'); q('.p3-state').textContent = 'OFF'; tone(70, .2, .07, 'square');
    hold.hidden = true; speech.textContent = '';
    beatGap = 2600; await wait(2700, my); beatOff(); // 마지막 한 번 뒤 조용해진다
    await wait(1800, my);
    await fadeTo(true, true, 1800, my);
    show('end'); fade.classList.remove('on', 'white');
    if (P && !DEV) P.set({ p3done: true });
    const box = q('.p3-end-lines'); box.innerHTML = '';
    for (const text of S.ending) { const p = document.createElement('p'); p.textContent = text; box.append(p); await wait(80, my); p.classList.add('show'); await wait(2200, my); }
    q('.p3-end-tag').textContent = S.endingTag; q('.p3-end-tag').classList.add('show'); await wait(900, my);
    // 10/29 걍춤 스레드: 3페이즈 진엔딩 뒤 엔딩 크레딧(크레딧 중 땅을 파면 할아버지 춤 이스터에그)
    if (!DEV && typeof EndingCredits !== 'undefined') { root.hidden = true; try { await EndingCredits.play(); } catch (_) {} root.hidden = false; } // 3페이즈 화면이 크레딧을 가리지 않게
    q('.p3-end-buttons').classList.add('show');
  }
  q('.p3-again').addEventListener('click', () => go('refuse'));
  q('.p3-home').addEventListener('click', () => {
    if (DEV) { location.href = '../../02_speedrun_dev.html'; return; }
    // 본편: 1페이즈로 돌아간다(반항 기록·도전과제는 그대로)
    run++; hush(); if (P) P.set({ phase: 1, corrupted: [], run2: [], swapUsed: false }); location.reload();
  });

  window.Phase3 = { go, root, get scene() { return root.dataset.scene; } };

  function mount() { if (!root.isConnected) (document.querySelector('main') || body).append(root); }
  if (DEV) {
    mount();
    document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); go(b.dataset.jump); }));
    const start = (location.hash.match(/scene=(\w+)/) || [])[1];
    go(scenes[start] ? start : 'refuse');
    return;
  }
  // 본편 01: 점프스케어 뒤 다시 열린 첫 화면(페이즈 3)에서, 변신 인트로가 끝나면 시작한다.
  if (!P || P.state.phase < 3) return;
  mount();
  // 10/29 합치기: 인트로 → 게임 스타트 화면이 끝난 뒤에 시작(스타트 화면 스레드 안내)
  const ready = (window.TransformationIntro?.finished || Promise.resolve()).then(() => window.GameStartScreen?.finished);
  ready.then(() => new Promise(r => setTimeout(r, 600))).then(() => {
    if (P.state.phase >= 3 && body.dataset.stage === 'intro') go('refuse');
  });
})();

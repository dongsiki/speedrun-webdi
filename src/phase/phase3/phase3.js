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
      <button class="p3-switch" type="button" role="switch" aria-checked="true" aria-label="AI 자동 클리어 ON"><span>AI</span><span class="p3-track" aria-hidden="true"><span class="p3-knob"></span></span><span class="p3-state">ON</span></button>
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
  // 기계 박동(마지막 걸음의 중환자실 삐 소리와 같은 높이)
  let beatTimer = 0, beatGap = 950;
  function beatOn(gap = 950) { beatGap = gap; if (!beatTimer) loop(); function loop() { tone(960, .07, .025); beatTimer = setTimeout(loop, beatGap); } }
  function beatOff() { clearTimeout(beatTimer); beatTimer = 0; }
  // AI 목소리
  const voiceEl = new Audio(); voiceEl.preload = 'auto';
  function voice(id) {
    voiceEl.pause();
    if (!id) return Promise.resolve();
    voiceEl.src = voiceUrl(id); voiceEl.currentTime = 0;
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
    q('.p3-end-tag').classList.remove('show'); q('.p3-end-buttons').classList.remove('show');
  }
  const scenes = { refuse, help, story, ask, final };
  async function go(name) {
    const my = ++run; root.hidden = false; body.classList.add('p3-on'); reset(); mark(name === 'final' ? 'ask' : name);
    try { await scenes[name](my); } catch (e) { if (!(e instanceof Stop)) throw e; }
  }

  // 1) 첫 화면: 아무리 눌러도 진행되지 않는다
  async function refuse(my) {
    show('first');
    let step = 0, busy = false;
    const total = S.refuse.length;
    await new Promise((ok, no) => {
      const onPress = async e => {
        if (my !== run) { off(); no(new Stop()); return; }
        if (e.type === 'keydown' && !['Space', 'Enter'].includes(e.code)) return;
        if (!mine(e)) return;
        e.preventDefault(); e.stopPropagation();
        if (busy) return;
        busy = true;
        const line = S.refuse[step];
        if (step === 0) { sw.classList.remove('shake'); void sw.offsetWidth; sw.classList.add('shake'); thunk(); }
        else if (step === 1) { sw.classList.add('half'); tone(120, .1, .06, 'square'); setTimeout(() => { sw.classList.remove('half'); thunk(); }, 260); }
        else {
          sw.classList.remove('shake'); void sw.offsetWidth; sw.classList.add('shake'); thunk();
          speech.textContent = line.say; speech.classList.toggle('glitch', step >= total - 2);
          voice(line.voice);
          for (let i = 0; i < step - 1; i++) setTimeout(() => burst(.6 + step * .25), i * 140);
          if (step >= 3) scramble(count, 200 + step * 80);
        }
        step++;
        setTimeout(() => { busy = false; }, step < 3 ? 280 : 650);
        if (step >= total) { off(); ok(); }
      };
      const off = () => { sections.first.removeEventListener('click', onPress); removeEventListener('keydown', onPress, true); };
      sections.first.addEventListener('click', onPress); addEventListener('keydown', onPress, true);
    });
    await wait(1700, my);
    for (let i = 0; i < 5; i++) { burst(1.8); await wait(110, my); }
    await fadeTo(true, false, 500, my); // 화면이 꺼진다
    hush(); await wait(1300, my);
    return help(my);
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
  const ready = window.TransformationIntro?.finished || Promise.resolve();
  ready.then(() => new Promise(r => setTimeout(r, 600))).then(() => {
    if (P.state.phase >= 3 && body.dataset.stage === 'intro') go('refuse');
  });
})();

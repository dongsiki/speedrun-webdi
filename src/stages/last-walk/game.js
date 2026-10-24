

(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false });
  const keysHint = $('keys'), status = $('status');
  const embedded = window.parent !== window;
  const reducedQuery = matchMedia('(prefers-reduced-motion:reduce-off)');
  const T = Object.freeze({
    shiftAt: 8, exitAt: 12, curbAt: 19, roadEnd: 26,
    stepLength: .34, stepTime: .32, settle: .26, stumbleTime: 1.1,
    oxygenDecay: .06, stepCost: .015, stumbleCost: .05, holdPenalty: .05,
    inhaleRate: .55, exhaleRate: .45, breathGain: .42,
    dryRate: .07, childSpeed: 3.2,
    icuNeed: 8, icuInhale: 2.2, icuExhale: 2.6, icuMatch: .65
  });

  // Ventilator breaths after the player's 8 (ending, 2026-10-12).
  const MACHINE_BREATHS = 3;

  let width = 1, height = 1, scale = 1, ppm = 100;
  let raf = 0, last = 0, paused = false, ended = false, clock = 0;
  let s;
  function fresh() {
    return {
      phase: 'elder', phaseTime: 0, x: 0,
      lastFoot: null, stepping: 0, stepFoot: null, stepFrom: 0, sinceStep: 1, stumble: 0, stumbles: 0, steps: 0,
      lung: .35, lungPeak: .35, breathing: false, holdAtFull: 0, oxygen: 1, breaths: 0,
      dryness: 0, blink: 0, blinks: 0,
      inhaledSinceLow: false, holdWarned: false, holdWarns: 0, shallow: 0, frozenPress: 0, pops: {},
      childRun: 0, crash: 0,
      icu: { t: 0, good: 0, misses: 0, cycle: 0, match: 0, samples: 0, beat: 0, lastResult: null },
      fade: 0, hintUsed: { feet: false, breath: false, eyes: false, arrow: false, icu: false }
    };
  }
  s = fresh();

  // ---------- audio (starts on the first key press) ----------
  let audio = null, noiseGain = null, noiseFilter = null;
  function startAudio() {
    if (audio) { if (audio.state === 'suspended' && !paused) audio.resume().catch(() => {}); return; }
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
    audio = new Context();
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource(); source.buffer = buffer; source.loop = true;
    noiseFilter = audio.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.Q.value = .9;
    noiseGain = audio.createGain(); noiseGain.gain.value = 0;
    source.connect(noiseFilter).connect(noiseGain).connect(audio.destination); source.start();
  }
  function tone(freq, dur, vol = .03, type = 'sine', endFreq = null) {
    if (!audio || paused) return;
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + .02);
  }
  function breathSound(rate, inhale) {
    if (!noiseGain) return;
    noiseGain.gain.setTargetAtTime(Math.min(.06, Math.abs(rate) * .09), audio.currentTime, .05);
    noiseFilter.frequency.setTargetAtTime(inhale ? 1100 : 520, audio.currentTime, .08);
  }
  function brake() {
    if (!audio) return;
    tone(1900, 1.3, .05, 'sawtooth', 700); tone(2300, 1.3, .025, 'square', 900);
    if (noiseGain) { noiseFilter.frequency.setTargetAtTime(3000, audio.currentTime, .05); noiseGain.gain.setTargetAtTime(.08, audio.currentTime, .05); noiseGain.gain.setTargetAtTime(0, audio.currentTime + 1.2, .05); }
  }
  function silence() { if (noiseGain && audio) noiseGain.gain.setTargetAtTime(0, audio.currentTime, .03); }
  // Knees give and the cane scrapes: louder than a step so the freeze is heard.
  function stumbleSound() { tone(95, .34, .08, 'triangle', 55); tone(1500, .05, .03, 'square'); setTimeout(() => tone(1250, .05, .02, 'square'), 90); }
  // Short word cues, one slot per kind (step / breath).
  function pop(kind, text, sub = '', life = .9) { s.pops[kind] = { text, sub, t: 0, life }; }

  // ---------- hints (fade once each control has been used) ----------
  const hints = {
    elder: '<kbd>A</kbd> <kbd>D</kbd> 번갈아 걷기 &nbsp; <kbd>Space</kbd> 꾹 눌러 원을 점선 밖까지 · 떼면 내쉬기 &nbsp; <kbd>E</kbd> 눈 깜빡이기',
    child: '<kbd>→</kbd>',
    icu: '<kbd>Space</kbd>'
  };
  let hintKey = '';
  function showHint(key) { if (hintKey === key) return; hintKey = key; keysHint.innerHTML = hints[key]; keysHint.dataset.hidden = 'false'; }
  function updateHint() {
    const u = s.hintUsed;
    if (s.phase === 'elder') { showHint('elder'); if (u.feet && u.breath && u.eyes && clock > 6) keysHint.dataset.hidden = 'true'; }
    else if (s.phase === 'child') { showHint('child'); if (u.arrow) keysHint.dataset.hidden = 'true'; }
    else if (s.phase === 'icu') { showHint('icu'); if (s.icu.good >= 2) keysHint.dataset.hidden = 'true'; }
    else keysHint.dataset.hidden = 'true';
  }

  // ---------- input ----------
  const held = new Set();
  function foot(which) {
    s.hintUsed.feet = true;
    // Pressing while frozen does nothing — but now it says so (dull knock + bar flash).
    if (s.stumble > 0) { if (s.frozenPress <= 0) tone(70, .08, .05, 'square'); s.frozenPress = .22; return; }
    // Same foot twice, or a new step before the last one settled → stumble.
    if (s.lastFoot === which || s.stepping > 0 || s.sinceStep < T.settle) {
      const same = s.lastFoot === which;
      s.stumble = T.stumbleTime; s.stumbles++; s.stepping = 0; s.lastFoot = null;
      s.oxygen = Math.max(0, s.oxygen - T.stumbleCost);
      stumbleSound();
      pop('step', same ? '비틀! 같은 발' : '비틀! 너무 빨라', s.stumbles <= 2 ? '잠깐 못 움직임' : '', T.stumbleTime);
      status.textContent = same ? '같은 발을 두 번 디뎌 비틀거립니다. 잠시 움직일 수 없습니다.' : '너무 빨리 디뎌 비틀거립니다. 잠시 움직일 수 없습니다.';
      return;
    }
    s.lastFoot = which; s.stepFoot = which; s.stepping = T.stepTime; s.stepFrom = s.x; s.sinceStep = 0; s.steps++;
    s.oxygen = Math.max(0, s.oxygen - T.stepCost);
  }
  function blinkEyes() { s.hintUsed.eyes = true; s.blink = .14; s.dryness = 0; s.blinks++; }
  canvas.addEventListener('keydown', e => {
    if (ended) return;
    const k = e.code;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyE'].includes(k)) e.preventDefault();
    startAudio();
    if (e.repeat) return;
    held.add(k);
    if (s.phase === 'elder') {
      if (k === 'KeyA' || k === 'ArrowLeft') foot('L');
      if (k === 'KeyD' || k === 'ArrowRight') foot('R');
      if (k === 'KeyE') blinkEyes();
      if (k === 'Space') s.hintUsed.breath = true;
    }
    if (s.phase === 'child' && (k === 'ArrowRight' || k === 'KeyD')) s.hintUsed.arrow = true;
  });
  canvas.addEventListener('keyup', e => { held.delete(e.code); });
  const breathHeld = () => held.has('Space');
  canvas.addEventListener('pointerdown', () => { canvas.focus({ preventScroll: true }); startAudio(); });
  window.addEventListener('blur', () => held.clear());

  // ---------- simulation ----------
  function setPhase(p) { s.phase = p; s.phaseTime = 0; canvas.dataset.phase = p; }
  function fail() {
    if (ended) return; ended = true; setPhase('failed'); silence();
    status.textContent = '숨이 막혀 주저앉았습니다. 땅파기 로비로 돌아갑니다.';
    if (embedded) parent.postMessage({ channel, type: 'fail' }, '*');
    else setTimeout(restart, 1600);
  }
  function complete() {
    if (ended) return; ended = true; silence();
    if (embedded) parent.postMessage({ channel, type: 'complete' }, '*');
    else setTimeout(restart, 1600);
  }
  function restart() { s = fresh(); ended = false; held.clear(); hintKey = ''; setPhase('elder'); clock = 0; }

  function updateElder(dt) {
    // Feet
    s.sinceStep += dt;
    if (s.stumble > 0) { s.stumble = Math.max(0, s.stumble - dt); }
    if (s.stepping > 0) {
      s.stepping = Math.max(0, s.stepping - dt);
      const t = 1 - s.stepping / T.stepTime;
      s.x = s.stepFrom + T.stepLength * (t * t * (3 - 2 * t));
    }
    // Breath: hold Space to inhale, release to exhale.
    const inhaling = breathHeld(), before = s.lung, breathsBefore = s.breaths, deepBefore = s.lungPeak > .55;
    s.lung = Math.max(0, Math.min(1, s.lung + (inhaling ? T.inhaleRate : -T.exhaleRate) * dt));
    if (inhaling) s.lungPeak = Math.max(s.lungPeak, s.lung);
    if (inhaling && s.lung >= 1) s.holdAtFull += dt; else if (!inhaling) s.holdAtFull = 0;
    if (!inhaling && s.lungPeak > .55 && s.lung < .15) { s.oxygen = Math.min(1, s.oxygen + T.breathGain * s.lungPeak); s.lungPeak = s.lung; s.breaths++; }
    if (!inhaling && s.lung < .15) s.lungPeak = Math.min(s.lungPeak, s.lung + .001);
    // Cues only — the oxygen rule above is untouched.
    if (inhaling) s.inhaledSinceLow = true;
    if (inhaling && !deepBefore && s.lungPeak > .55) tone(660, .08, .03);
    if (s.breaths !== breathsBefore) { s.inhaledSinceLow = false; pop('breath', '깊은 숨', '', .8); tone(392, .2, .03, 'sine', 587); status.textContent = '깊게 숨을 쉬었습니다.'; }
    else if (!inhaling && before >= .15 && s.lung < .15 && s.inhaledSinceLow) {
      s.inhaledSinceLow = false; s.shallow++;
      pop('breath', '얕은 숨', s.shallow <= 2 ? '점선 밖까지 들이쉬기' : '', 1.1); tone(140, .18, .045, 'triangle');
      status.textContent = '숨이 얕습니다. 원이 점선 밖까지 차도록 들이쉬십시오.';
    }
    if (s.holdAtFull > 1.2 && !s.holdWarned) {
      s.holdWarned = true; s.holdWarns++;
      pop('breath', '숨 참는 중', s.holdWarns <= 2 ? '산소가 더 빨리 줄어요' : '', 1.4); tone(150, .3, .045, 'square');
      status.textContent = '숨을 참고 있습니다. 산소가 더 빨리 줄어듭니다.';
    }
    if (!inhaling) s.holdWarned = false;
    breathSound((s.lung - before) / Math.max(dt, 1e-3), inhaling);
    // Oxygen
    s.oxygen -= (T.oxygenDecay + (s.holdAtFull > 1.2 ? T.holdPenalty : 0)) * dt;
    if (s.oxygen <= 0) { s.oxygen = 0; fail(); return; }
    // Eyes
    s.blink = Math.max(0, s.blink - dt);
    s.dryness = Math.min(1, s.dryness + T.dryRate * dt);
    if (s.x >= T.shiftAt) { setPhase('shift'); silence(); status.textContent = ''; }
  }
  function updateShift(dt) {
    // Dementia spreads: a slow white-out, then the same corridor as a child.
    s.fade = Math.min(1, s.phaseTime / 1.4) * (1 - Math.max(0, (s.phaseTime - 2.0) / 1.0));
    if (s.phaseTime >= 3.0) { s.fade = 0; setPhase('child'); }
  }
  function updateChild(dt) {
    const dir = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
    s.x = Math.max(T.shiftAt - 1, s.x + dir * T.childSpeed * dt);
    if (dir) s.childRun += dt * 9;
    if (s.x >= T.curbAt + .3) { setPhase('crash'); brake(); status.textContent = ''; }
  }
  function updateCrash(dt) {
    if (s.phaseTime < .5) s.x += T.childSpeed * .7 * dt;
    if (s.phaseTime >= 3.0) { setPhase('icu'); s.icu.beat = .3; }
  }
  function updateIcu(dt) {
    const icu = s.icu, period = T.icuInhale + T.icuExhale;
    icu.t += dt;
    const phaseT = icu.t % period, wantInhale = phaseT < T.icuInhale;
    canvas.dataset.icuWant = String(wantInhale);
    const inhaling = breathHeld(), before = s.lung;
    s.lung = Math.max(0, Math.min(1, s.lung + (inhaling ? 1 / T.icuInhale : -1 / T.icuExhale) * dt));
    breathSound((s.lung - before) / Math.max(dt, 1e-3) * .6, inhaling);
    if (icu.t > .6) { icu.samples += dt; if (inhaling === wantInhale) icu.match += dt; }
    const cycle = Math.floor(icu.t / period);
    if (cycle !== icu.cycle) {
      const ratio = icu.samples ? icu.match / icu.samples : 0;
      if (ratio >= T.icuMatch) { icu.good++; icu.lastResult = 'good'; }
      else { icu.misses++; icu.lastResult = 'miss'; tone(880, .12, .03, 'square'); setTimeout(() => tone(880, .12, .03, 'square'), 180); }
      icu.cycle = cycle; icu.match = icu.samples = 0;
      status.textContent = `숨 ${icu.good} / ${T.icuNeed}`;
      if (icu.good >= T.icuNeed) { setPhase('machine'); icu.machineFrom = cycle; status.textContent = ''; }
    }
    icu.beat -= dt; if (icu.beat <= 0) { icu.beat = .95; tone(960, .07, .025); }
  }
  // The machine breathes on its own: the lung locks onto the ventilator ring whatever the player presses.
  function updateMachine(dt) {
    const icu = s.icu, period = T.icuInhale + T.icuExhale;
    icu.t += dt;
    const p = icu.t % period, inhale = p < T.icuInhale, before = s.lung;
    const target = inhale ? p / T.icuInhale : 1 - (p - T.icuInhale) / T.icuExhale;
    s.lung = before + (target - before) * Math.min(1, dt * 10);
    canvas.dataset.icuWant = String(inhale);
    breathSound((s.lung - before) / Math.max(dt, 1e-3) * .6, inhale);
    const cycle = Math.floor(icu.t / period);
    if (cycle !== icu.cycle) {
      icu.cycle = cycle; icu.good++;
      tone(180, .06, .02, 'square');
      status.textContent = `숨 ${icu.good}`;
      if (cycle - icu.machineFrom >= MACHINE_BREATHS) { setPhase('icuEnd'); silence(); return; }
    }
    icu.beat -= dt; if (icu.beat <= 0) { icu.beat = .95; tone(960, .07, .025); }
  }
  function updateIcuEnd() {
    s.fade = Math.min(1, s.phaseTime / 1.6);
    if (s.phaseTime >= 1.9) complete();
  }
  function update(dt) {
    clock += dt; s.phaseTime += dt;
    for (const k in s.pops) { const p = s.pops[k]; p.t += dt; if (p.t >= p.life) delete s.pops[k]; }
    s.frozenPress = Math.max(0, s.frozenPress - dt);
    if (s.phase === 'elder') updateElder(dt);
    else if (s.phase === 'shift') updateShift(dt);
    else if (s.phase === 'child') updateChild(dt);
    else if (s.phase === 'crash') updateCrash(dt);
    else if (s.phase === 'icu') updateIcu(dt);
    else if (s.phase === 'machine') updateMachine(dt);
    else if (s.phase === 'icuEnd') updateIcuEnd(dt);
    updateHint();
    Object.assign(canvas.dataset, { x: s.x.toFixed(2), oxygen: s.oxygen.toFixed(3), lung: s.lung.toFixed(2), dryness: s.dryness.toFixed(2), stumbles: String(s.stumbles), steps: String(s.steps), breaths: String(s.breaths), icuGood: String(s.icu.good), icuMisses: String(s.icu.misses) });
  }

  // ---------- drawing (1-bit) ----------
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16);
  const veil = document.createElement('canvas'), veilCtx = veil.getContext('2d');
  let veilImage = null;
  function edgeVeil(amount, black) {
    if (amount <= .004) return;
    const cell = 3, w = Math.ceil(width / cell), h = Math.ceil(height / cell);
    if (veil.width !== w || veil.height !== h) { veil.width = w; veil.height = h; veilImage = veilCtx.createImageData(w, h); }
    const d = veilImage.data, v = black ? 0 : 255, front = 1 - amount * .85;
    for (let y = 0; y < h; y++) {
      const ny = Math.abs(y / (h - 1) * 2 - 1);
      for (let x = 0; x < w; x++) {
        const nx = Math.abs(x / (w - 1) * 2 - 1), r = Math.pow(nx ** 4 + ny ** 4, .25), i = (y * w + x) * 4;
        const on = r > front + (bayer[(y & 3) * 4 + (x & 3)] - .5) * .35;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = on ? 255 : 0;
      }
    }
    veilCtx.putImageData(veilImage, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(veil, 0, 0, width, height); ctx.restore();
  }
  function line(x1, y1, x2, y2, w = 2) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function rect(x, y, w, h, lw = 2) { ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
  const floorY = () => height * .78;
  const sx = (wx, camX) => (wx - camX) * ppm + width * .32;

  function drawWorld(camX) {
    const fy = floorY(), ceil = fy - 2.7 * ppm;
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000';
    const from = camX - 4, to = camX + 8;
    // Corridor (inside) until the exit door, street outside after it.
    const inEnd = Math.min(to, T.exitAt);
    if (from < T.exitAt) {
      line(sx(Math.max(from, -2), camX), fy, sx(inEnd, camX), fy, 3);
      line(sx(Math.max(from, -2), camX), ceil, sx(inEnd, camX), ceil, 2);
      line(sx(Math.max(from, -2), camX), fy - .9 * ppm, sx(inEnd, camX), fy - .9 * ppm, 4); // handrail
      for (let d = Math.ceil(from / 3) * 3; d < Math.min(to, T.exitAt - 1); d += 3) {
        if (d < 0) continue;
        const x = sx(d + .6, camX); rect(x, fy - 2.1 * ppm, ppm, 2.1 * ppm, 2);
        rect(x + .3 * ppm, fy - 1.75 * ppm, .4 * ppm, .5 * ppm, 2);
        line(x + .82 * ppm, fy - 1.0 * ppm, x + .92 * ppm, fy - 1.0 * ppm, 3);
      }
      // Exit door (open) with sign
      const ex = sx(T.exitAt - 1, camX);
      rect(ex, fy - 2.1 * ppm, ppm, 2.1 * ppm, 4);
      ctx.fillRect(ex + .2 * ppm, fy - 2.5 * ppm, .6 * ppm, .28 * ppm);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(.17 * ppm)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', ex + .5 * ppm, fy - 2.36 * ppm); ctx.fillStyle = '#000';
      line(sx(T.exitAt, camX), ceil, sx(T.exitAt, camX), fy - 2.1 * ppm, 3);
    }
    if (to > T.exitAt) {
      const a = Math.max(from, T.exitAt);
      // sidewalk then curb drop and road
      line(sx(a, camX), fy, sx(Math.min(to, T.curbAt), camX), fy, 3);
      if (to > T.curbAt) {
        line(sx(T.curbAt, camX), fy, sx(T.curbAt, camX), fy + .15 * ppm, 3);
        line(sx(T.curbAt, camX), fy + .15 * ppm, sx(to, camX), fy + .15 * ppm, 3);
        for (let z = T.curbAt + .5; z < Math.min(to, T.roadEnd); z += .9) ctx.fillRect(sx(z, camX), fy + .15 * ppm + 2, .45 * ppm, .07 * ppm);
      }
      // houses and a traffic light, outlines only
      for (let hx = T.exitAt + 1; hx < T.curbAt - 1; hx += 3.2) {
        if (hx + 2.4 < from || hx > to) continue;
        const x = sx(hx, camX), w = 2.4 * ppm, h = 2.2 * ppm;
        rect(x, fy - h - .8 * ppm, w, h, 1.5);
        line(x - .1 * ppm, fy - h - .8 * ppm, x + w / 2, fy - h - 1.6 * ppm, 1.5); line(x + w / 2, fy - h - 1.6 * ppm, x + w + .1 * ppm, fy - h - .8 * ppm, 1.5);
      }
      const lx = sx(T.curbAt - .4, camX); line(lx, fy, lx, fy - 2.6 * ppm, 4); rect(lx - .14 * ppm, fy - 3.1 * ppm, .28 * ppm, .55 * ppm, 3);
    }
  }
// Kinematic cutout rigs: the renderer follows the game state; it does not own it.
const elderArt = createLastWalkArtwork(LIMB_MODEL_ART, false);
const childArt = createLastWalkArtwork(CHILD_MODEL_ART, true);
const P = (x,y) => ({x,y});
function bodyAt(p,angle=0) {
  return {getPosition:()=>p,getAngle:()=>angle,getWorldPoint:q=>P(p.x+q.x*Math.cos(angle)-q.y*Math.sin(angle),p.y+q.x*Math.sin(angle)+q.y*Math.cos(angle))};
}
function segment(a,b) {
  return bodyAt(P((a.x+b.x)/2,(a.y+b.y)/2), Math.atan2(-(a.x-b.x),a.y-b.y));
}
const anchor = p => ({getAnchorA:()=>p});
function solveKnee(hip,foot,upper,lower) {
  const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.min(Math.hypot(dx,dy),upper+lower-.002);
  const along=(upper*upper-lower*lower+d*d)/(2*d), side=Math.sqrt(Math.max(0,upper*upper-along*along));
  const len=Math.hypot(dx,dy)||1;
  return P(hip.x+dx/len*along-dy/len*side,hip.y+dy/len*along+dx/len*side);
}
function rigAt({hip,shoulder,neck,head,feet,elbows,hands,child=false,tilt=0,headTilt=tilt}) {
  const dims=child?{thigh:.28,shin:.27}:{thigh:.405,shin:.39};
  const bodies={pelvis:bodyAt(hip,tilt*.35),torso:bodyAt(P((hip.x+shoulder.x)/2,(hip.y+shoulder.y)/2),tilt),head:bodyAt(head,headTilt)};
  const limbs={};
  for(const [i,key] of ['o','p'].entries()) {
    const top=P(hip.x+(i? .025:-.025),hip.y-.015),ank=feet[i];
    const knee=solveKnee(top,ank,dims.thigh,dims.shin);
    limbs[key]={primary:anchor(top),secondary:anchor(knee),ankle:anchor(ank),upper:{body:segment(top,knee)},lower:{body:segment(knee,ank)},tip:bodyAt(P(ank.x+.03,ank.y-.015))};
  }
  for(const [i,key] of ['q','w'].entries()) {
    const top=P(shoulder.x+(i?.035:-.035),shoulder.y-.03);
    limbs[key]={primary:anchor(top),secondary:anchor(elbows[i]),upper:{body:segment(top,elbows[i])},lower:{body:segment(elbows[i],hands[i])},tip:bodyAt(hands[i],child?segment(elbows[i],hands[i]).getAngle():.2)};
  }
  return {bodies,limbs,joints:{neck:anchor(neck)},cane:{held:!child}};
}
function drawElder(px,fy) {
  const move=s.stepping>0, t=move?1-s.stepping/T.stepTime:0;
  const lift=Math.sin(t*Math.PI),stumble=s.stumble>0;
  const sway=stumble&&!reducedQuery.matches?Math.sin(s.stumble*18)*.075:0;
  const rise=s.lung*.014,hip=P(sway,.84-(stumble?.1:0)+rise);
  const tilt=-(.14+(stumble?.13:0)),shoulder=P(hip.x+.08+(stumble?.06:0),hip.y+.49);
  const neck=P(shoulder.x+.035,shoulder.y+.055),head=P(neck.x+.055,neck.y+.166);
  const feet=['L','R'].map((which,i)=> {
    const active=move&&s.stepFoot===which;
    const x=active?-.14+.28*t:(!s.lastFoot?(i?.08:-.10):s.lastFoot===which?.14:-.14);
    return P(x+hip.x,.075+(active?.13*lift:0));
  });
  const hands=[P(shoulder.x+.31,hip.y+.10),P(shoulder.x+.025,hip.y-.025)];
  const elbows=[P(shoulder.x+.25,shoulder.y-.14),P(shoulder.x+.08,shoulder.y-.29)];
  const rig=rigAt({hip,shoulder,neck,head,feet,hands,elbows,tilt});
  const project=p=>P(px+p.x*ppm,fy-p.y*ppm);
  elderArt.drawFigure(ctx,rig,project,ppm,()=> {
    const hand=project(hands[0]),tip=project(P(hands[0].x+.12,.015));
    ctx.strokeStyle='#000';ctx.lineWidth=Math.max(2,ppm*.023);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hand.x-.028*ppm,hand.y-.01*ppm);
    ctx.quadraticCurveTo(hand.x+.067*ppm,hand.y-.07*ppm,hand.x+.062*ppm,hand.y+.07*ppm);
    ctx.lineTo(tip.x,tip.y);ctx.stroke();
    ctx.fillStyle='#000';ctx.fillRect(tip.x-.023*ppm,fy-.016*ppm,.046*ppm,.016*ppm);
  });
}
function drawChild(px,fy) {
  const running=held.has('ArrowRight')||held.has('KeyD')||held.has('ArrowLeft')||held.has('KeyA');
  const run=s.childRun, wave=running?Math.sin(run):0;
  const hip=P(0,.565+(running&&!reducedQuery.matches?Math.abs(Math.cos(run))*.026:0));
  const shoulder=P(.048,hip.y+.328),neck=P(.056,shoulder.y+.01),head=P(.08,neck.y+.149);
  const feet=[0,1].map(i=> {
    const swing=i? -wave:wave;
    return P(swing*.23,.065+(running?Math.max(0,swing)*.15:0));
  });
  const elbows=[P(shoulder.x-wave*.13,shoulder.y-.20),P(shoulder.x+wave*.13,shoulder.y-.20)];
  const hands=[P(elbows[0].x+.18,elbows[0].y+.07),P(elbows[1].x+.18,elbows[1].y+.07)];
  if(!running) {elbows[0]=P(.025,shoulder.y-.20);elbows[1]=P(.07,shoulder.y-.20);hands[0]=P(.02,shoulder.y-.37);hands[1]=P(.06,shoulder.y-.37);}
  const rig=rigAt({hip,shoulder,neck,head,feet,hands,elbows,child:true,tilt:-.10,headTilt:-.035});
  const project=p=>P(px+p.x*ppm,fy-p.y*ppm);
  childArt.drawFigure(ctx,rig,project,ppm,()=>{});
}
function drawPatient(cx,fy,u) {
  const rise=s.lung*.06,head=P(cx-1.19*u,fy-1.055*u);
  ctx.lineJoin='round';ctx.lineCap='round';ctx.fillStyle='#fff';ctx.strokeStyle='#000';
  // Mattress, raised back, pillow and two caster legs.
  ctx.lineWidth=Math.max(1.5,u*.017);
  ctx.beginPath();ctx.moveTo(cx-1.49*u,fy-.78*u);ctx.lineTo(cx-1.17*u,fy-.59*u);ctx.lineTo(cx+1.28*u,fy-.59*u);ctx.lineTo(cx+1.28*u,fy-.45*u);ctx.lineTo(cx-1.21*u,fy-.45*u);ctx.lineTo(cx-1.58*u,fy-.66*u);ctx.closePath();ctx.fill();ctx.stroke();
  for(const x of [-1.05,1.12]) {line(cx+x*u,fy-.45*u,cx+x*u,fy-.08*u,3);ctx.beginPath();ctx.arc(cx+x*u,fy-.055*u,.05*u,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.ellipse(cx-1.21*u,fy-.82*u,.29*u,.10*u,-.55,0,Math.PI*2);ctx.fill();ctx.stroke();
  // The same elderly face returns in the ICU, now reclining.
  elderArt.drawHead(ctx,head.x,head.y,u*1.34,-.48);
  ctx.beginPath();ctx.moveTo(cx-1.035*u,fy-.95*u);ctx.lineTo(cx-.82*u,fy-.78*u);ctx.strokeStyle='#000';ctx.lineWidth=.09*u;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=.068*u;ctx.stroke();
  elderArt.drawTorso(ctx,cx-.72*u,fy-(.77+rise*.38)*u,u,-1.05);
  // Blanket obscures the lower body; its chest moves only with the actual lung.
  ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=Math.max(1.5,u*.015);
  ctx.beginPath();ctx.moveTo(cx-.98*u,fy-.76*u);
  ctx.quadraticCurveTo(cx-.67*u,fy-(1.045+rise)*u,cx-.20*u,fy-.85*u);
  ctx.quadraticCurveTo(cx+.58*u,fy-.85*u,cx+1.2*u,fy-.67*u);
  ctx.lineTo(cx+1.21*u,fy-.52*u);ctx.lineTo(cx-1.04*u,fy-.55*u);ctx.closePath();ctx.fill();ctx.stroke();
  // Sparse dots, anchored to the cloth instead of regenerating noise each frame.
  for(let y=0;y<8;y++)for(let x=0;x<58;x++) {
    const xx=cx+(-.95+x*.037)*u,yy=fy-(.56+y*.026)*u;
    if((x*13+y*7)%17<4)ctx.fillRect(xx,yy,Math.max(1,u*.007),Math.max(1,u*.007));
  }
  ctx.strokeStyle='#000';line(cx-.22*u,fy-.79*u,cx-.31*u,fy-.56*u,1.5);
  line(cx+.57*u,fy-.73*u,cx+.65*u,fy-.55*u,1.5);
  // A relaxed visible hand and a low guard rail; neither covers the face.
  elderArt.drawHand(ctx,cx-.48*u,fy-.72*u,u,-1.4);
  line(cx-.88*u,fy-.53*u,cx+.89*u,fy-.53*u,3);
  // Transparent-looking breathing mask drawn in ink over a readable face.
  ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=Math.max(1,u*.012);
  ctx.beginPath();ctx.ellipse(head.x+.107*u,head.y+.018*u,.064*u,.077*u,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  const tubeX=head.x+.14*u,tubeY=head.y+.04*u;
  ctx.beginPath();ctx.moveTo(tubeX,tubeY);ctx.bezierCurveTo(cx-.70*u,fy-1.47*u,cx+1.43*u,fy-1.58*u,cx+1.85*u,fy-1.40*u);
  ctx.strokeStyle='#000';ctx.lineWidth=.033*u;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=.014*u;ctx.stroke();ctx.strokeStyle='#000';
}

  function drawIcu() {
    const fy = floorY(), u = Math.min(ppm,width/6.7), cx = width * .36;
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round';
    line(0, fy, width, fy, 3);
    drawPatient(cx,fy,u);
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    // monitor: ECG line + breathing ring the player follows + tally of good breaths
    const mx = cx + 1.7 * u, my = fy - 2.6 * u, mw = 1.7 * u, mh = 1.1 * u;
    rect(mx, my, mw, mh, 4); line(mx + mw * .5, my + mh, mx + mw * .5, fy, 4);
    const icu = s.icu;
    ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const tx = i / 60, beatPos = ((icu.t * 1.05 - tx * 2) % 1 + 1) % 1;
      const spike = beatPos < .05 ? Math.sin(beatPos / .05 * Math.PI) * (beatPos < .025 ? -1 : .6) : 0;
      const y = my + mh * .32 - spike * mh * .22;
      i ? ctx.lineTo(mx + 8 + tx * (mw * .55), y) : ctx.moveTo(mx + 8, y);
    }
    ctx.stroke();
    const period = T.icuInhale + T.icuExhale, p = icu.t % period;
    const target = p < T.icuInhale ? p / T.icuInhale : 1 - (p - T.icuInhale) / T.icuExhale;
    const rx = mx + mw * .8, ry = my + mh * .38, rmax = mh * .28;
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rx, ry, rmax, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, Math.max(1.5, rmax * s.lung), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = s.lung > target ? '#fff' : '#000';
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx, ry, Math.max(2, rmax * target), 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#000';
    for (let i = 0; i < T.icuNeed; i++) {
      const bx = mx + 10 + i * (mw - 20) / T.icuNeed, by = my + mh * .82;
      if (i < icu.good) ctx.fillRect(bx, by - 5, (mw - 20) / T.icuNeed - 5, 10); else rect(bx, by - 5, (mw - 20) / T.icuNeed - 5, 10, 1.5);
    }
    // Past 8 the boxes are full; the count keeps going on its own.
    if (icu.good > T.icuNeed) {
      ctx.fillStyle = '#000'; ctx.font = `700 ${Math.round(Math.max(12, mh * .2))}px "Malgun Gothic", sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(String(icu.good), mx + 8, my + mh * .6);
    }
  }
  // ---------- cues (2026-10-11) ----------
  function cueBox(p, x, y, big) {
    const size = Math.round(Math.max(big ? 16 : 14, (big ? .2 : .15) * ppm)), subSize = Math.round(size * .62);
    const rise = reducedQuery.matches ? 0 : -Math.min(1, p.t / .25) * size * .4;
    const font = (w, px) => `${w} ${px}px "Malgun Gothic", sans-serif`;
    ctx.font = font(700, size); const w1 = ctx.measureText(p.text).width;
    ctx.font = font(600, subSize); const w2 = p.sub ? ctx.measureText(p.sub).width : 0;
    const pad = Math.round(size * .35), w = Math.max(w1, w2) + pad * 2, hh = size * 1.25 + (p.sub ? subSize * 1.35 : 0) + pad * .5;
    const left = Math.min(x, width - w - 8), top = y - hh / 2 + rise;
    ctx.fillStyle = '#fff'; ctx.fillRect(left, top, w, hh);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(left, top, w, hh);
    ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = font(700, size); ctx.fillText(p.text, left + pad, top + pad * .25 + size * .65);
    if (p.sub) { ctx.font = font(600, subSize); ctx.fillText(p.sub, left + pad, top + pad * .25 + size * 1.25 + subSize * .6); }
  }
  // Breath ring above the head: black disc = air in the lungs, dashed line = deep enough.
  // Once a breath passes the line the line turns solid: let go and breathe out.
  function drawCues(px, fy) {
    ctx.save(); ctx.lineCap = 'butt';
    const r = Math.max(18, .27 * ppm), cx = px + .08 * ppm, cy = fy - 2.2 * ppm, tr = r * .55;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
    const holding = s.holdAtFull > .5, flash = reducedQuery.matches || Math.floor(clock / .15) % 2 === 0;
    ctx.strokeStyle = '#000'; ctx.lineWidth = holding && flash ? 6 : 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, r * s.lung), 0, Math.PI * 2); ctx.fill();
    const deep = s.inhaledSinceLow && s.lungPeak > .55;
    ctx.strokeStyle = r * s.lung > tr ? '#fff' : '#000'; ctx.lineWidth = deep ? 3 : 1.5; ctx.setLineDash(deep ? [] : [3, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, tr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#000'; ctx.font = `600 ${Math.round(Math.max(12, .12 * ppm))}px "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('숨', cx - r - 8, cy);
    // Under the feet: how long the stumble still holds him. Flashes if a key is pressed meanwhile.
    if (s.stumble > 0) {
      const bw = .7 * ppm, bh = Math.max(7, .06 * ppm), bx = px - bw / 2, by = fy + .16 * ppm;
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw * s.stumble / T.stumbleTime, bh);
      ctx.strokeStyle = '#000'; ctx.lineWidth = s.frozenPress > 0 ? 5 : 2; ctx.strokeRect(bx, by, bw, bh);
    }
    if (s.pops.breath) cueBox(s.pops.breath, cx + r + 12, cy, false);
    if (s.pops.step) cueBox(s.pops.step, px + .55 * ppm, fy - 1.35 * ppm, true);
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const phase = s.phase;
    if (phase === 'crash' && s.phaseTime > .15) {
      // Night swallows the frame; headlights grow from the right, then darkness.
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
      const t = s.phaseTime;
      if (t < 1.4) {
        ctx.fillStyle = '#fff';
        const r = (.05 + Math.min(1, t / 1.3) * .5) * height;
        for (const dy of [-.08, .08]) { ctx.beginPath(); ctx.arc(width * (1.05 - Math.min(1, t / 1.3) * .35), height * (.62 + dy), r, 0, Math.PI * 2); ctx.fill(); }
      }
      return;
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    if (phase === 'icu' || phase === 'machine' || phase === 'icuEnd') {
      drawIcu();
      if (s.phaseTime < 1.2 && phase === 'icu') { ctx.globalAlpha = 1 - s.phaseTime / 1.2; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      if (phase === 'icuEnd') { ctx.globalAlpha = s.fade; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      return;
    }
    const camX = s.x;
    drawWorld(camX);
    const px = sx(s.x, camX), fy = floorY();
    if (phase === 'elder' || phase === 'failed' || (phase === 'shift' && s.phaseTime < 1.4)) drawElder(px, fy);
    else drawChild(px, fy);
    if (phase === 'elder' || phase === 'failed') {
      // Low oxygen darkens from the edges; dry eyes cloud them white.
      edgeVeil(Math.max(0, (.45 - s.oxygen) / .45), true);
      edgeVeil(Math.max(0, (s.dryness - .45) / .55), false);
      if (phase === 'elder') drawCues(px, fy);
      if (s.blink > 0) { ctx.fillStyle = '#000'; const h = height * .5 * Math.sin(s.blink / .14 * Math.PI); ctx.fillRect(0, 0, width, h); ctx.fillRect(0, height - h, width, h); }
    }
    if (phase === 'shift') { ctx.globalAlpha = s.fade; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
  }

  // ---------- loop and lifecycle ----------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (paused || document.hidden) return;
    if (!ended || s.phase === 'failed') update(dt);
    draw();
  }
  function resize() {
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight); scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ppm = Math.min(width / (width<600?4.8:8.5), height / 3.6);
  }
  function pause() { paused = true; held.clear(); silence(); if (audio && audio.state === 'running') audio.suspend().catch(() => {}); }
  function resume() { paused = false; last = 0; if (audio) audio.resume().catch(() => {}); }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { held.clear(); last = 0; if (document.hidden) silence(); });
  window.addEventListener('pagehide', () => { ended = true; cancelAnimationFrame(raf); if (audio) audio.close().catch(() => {}); });
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== channel) return;
    if (e.data.type === 'pause') pause();
    if (e.data.type === 'focus') { resume(); canvas.focus({ preventScroll: true }); }
  });
  $('stage-back').addEventListener('click', function () {
    this.disabled = true; ended = true; pause();
    if (embedded) parent.postMessage({ channel, type: 'back' }, '*'); else { this.disabled = false; restart(); paused = false; }
  });
  resize(); setPhase('elder'); canvas.focus({ preventScroll: true }); raf = requestAnimationFrame(frame);
})();

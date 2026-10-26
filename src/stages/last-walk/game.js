

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
    dryRate: .07
  });
  // 2026-10-27: 노인이 끝까지 걸으면 아이·교통사고·중환자실 장면 대신 중환자실 엔딩 컷신(ending.js)이 이어짐.

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
      hintUsed: { feet: false, breath: false, eyes: false }
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
  function silence() { if (noiseGain && audio) noiseGain.gain.setTargetAtTime(0, audio.currentTime, .03); }
  // Knees give and the cane scrapes: louder than a step so the freeze is heard.
  function stumbleSound() { tone(95, .34, .08, 'triangle', 55); tone(1500, .05, .03, 'square'); setTimeout(() => tone(1250, .05, .02, 'square'), 90); }
  // Short word cues, one slot per kind (step / breath).
  function pop(kind, text, sub = '', life = .9) { s.pops[kind] = { text, sub, t: 0, life }; }

  // ---------- hints (fade once each control has been used) ----------
  const hints = {
    elder: '<kbd>A</kbd> <kbd>D</kbd> 번갈아 걷기 &nbsp; <kbd>Space</kbd> 꾹 눌러 원을 점선 밖까지 · 떼면 내쉬기 &nbsp; <kbd>E</kbd> 눈 깜빡이기'
  };
  let hintKey = '';
  function showHint(key) { if (hintKey === key) return; hintKey = key; keysHint.innerHTML = hints[key]; keysHint.dataset.hidden = 'false'; }
  function updateHint() {
    const u = s.hintUsed;
    if (s.phase === 'elder') { showHint('elder'); if (u.feet && u.breath && u.eyes && clock > 6) keysHint.dataset.hidden = 'true'; }
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
  function restart() { LastWalkEnding.stop(); s = fresh(); ended = false; held.clear(); hintKey = ''; setPhase('elder'); clock = 0; }
  // 노인이 끝까지 걸으면 중환자실 엔딩 컷신 → 끝나면 이 게임 완료.
  function startEnding() {
    setPhase('ending'); silence(); held.clear(); status.textContent = '';
    LastWalkEnding.play({ onDone: complete });
  }

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
    if (s.x >= T.shiftAt) startEnding();
  }
  function update(dt) {
    clock += dt; s.phaseTime += dt;
    for (const k in s.pops) { const p = s.pops[k]; p.t += dt; if (p.t >= p.life) delete s.pops[k]; }
    s.frozenPress = Math.max(0, s.frozenPress - dt);
    if (s.phase === 'elder') updateElder(dt);
    updateHint();
    Object.assign(canvas.dataset, { x: s.x.toFixed(2), oxygen: s.oxygen.toFixed(3), lung: s.lung.toFixed(2), dryness: s.dryness.toFixed(2), stumbles: String(s.stumbles), steps: String(s.steps), breaths: String(s.breaths) });
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
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    const camX = s.x;
    drawWorld(camX);
    const px = sx(s.x, camX), fy = floorY();
    drawElder(px, fy);
    if (phase === 'elder' || phase === 'failed') {
      // Low oxygen darkens from the edges; dry eyes cloud them white.
      edgeVeil(Math.max(0, (.45 - s.oxygen) / .45), true);
      edgeVeil(Math.max(0, (s.dryness - .45) / .55), false);
      if (phase === 'elder') drawCues(px, fy);
      if (s.blink > 0) { ctx.fillStyle = '#000'; const h = height * .5 * Math.sin(s.blink / .14 * Math.PI); ctx.fillRect(0, 0, width, h); ctx.fillRect(0, height - h, width, h); }
    }
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
  function pause() { paused = true; held.clear(); silence(); LastWalkEnding.pause(); if (audio && audio.state === 'running') audio.suspend().catch(() => {}); }
  function resume() { paused = false; last = 0; LastWalkEnding.resume(); if (audio) audio.resume().catch(() => {}); }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { held.clear(); last = 0; if (document.hidden) silence(); });
  window.addEventListener('pagehide', () => { ended = true; cancelAnimationFrame(raf); if (audio) audio.close().catch(() => {}); });
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== channel) return;
    if (e.data.type === 'pause') pause();
    if (e.data.type === 'focus') { resume(); canvas.focus({ preventScroll: true }); }
  });
  $('stage-back').addEventListener('click', function () {
    this.disabled = true; ended = true; pause(); LastWalkEnding.stop();
    if (embedded) parent.postMessage({ channel, type: 'back' }, '*'); else { this.disabled = false; restart(); paused = false; }
  });
  resize(); setPhase('elder'); canvas.focus({ preventScroll: true }); raf = requestAnimationFrame(frame);
})();

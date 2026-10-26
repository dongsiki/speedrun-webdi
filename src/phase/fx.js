/* 페이즈 소리·얼굴(2026-10-26, Claude Code). 새 음원·새 그림 파일 없이 만든다.
   소리는 WebAudio로 합성하고, 얼굴은 기존 변신 영상의 한 장면(8.45초)을 잘라 쓴다. */
(() => {
  'use strict';
  const P = window.SpeedrunPhase;
  function out() { const ctx = P.audio(); return ctx && ctx.state !== 'closed' ? ctx : null; }
  let noiseBuffer = null;
  function noise(ctx) {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }
  function env(ctx, node, peak, attack, hold, release, at = ctx.currentTime) {
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(peak, at + attack);
    node.gain.setValueAtTime(peak, at + attack + hold);
    node.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
    return at + attack + hold + release;
  }
  // 지직: 짧은 잡음. type: 'tear'(찢는 소리) | 'hiss'(낮은 쉿) | 'click'
  function crackle(dur = .18, gain = .25, type = 'tear') {
    const ctx = out(); if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.playbackRate.value = type === 'hiss' ? .5 : 1 + Math.random();
    const f = ctx.createBiquadFilter(); f.type = type === 'hiss' ? 'lowpass' : 'bandpass';
    f.frequency.value = type === 'hiss' ? 900 : 1800 + Math.random() * 3200; f.Q.value = type === 'hiss' ? .7 : 4;
    const g = ctx.createGain(); src.connect(f).connect(g).connect(P.master);
    const end = env(ctx, g, gain, .004, dur * .6, dur * .4);
    src.start(ctx.currentTime, Math.random()); src.stop(end + .05);
  }
  // 웅웅: 낮게 맥놀이하는 소리. 2페이즈 동안 깔린다.
  let drone = null;
  function droneOn(level = .05) {
    const ctx = out(); if (!ctx) return;
    if (!drone) {
      const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(P.master);
      const a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator();
      a.type = 'sawtooth'; b.type = 'sawtooth'; c.type = 'sine';
      a.frequency.value = 43; b.frequency.value = 43.7; c.frequency.value = 2310;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
      const cg = ctx.createGain(); cg.gain.value = .012;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .13; lg.gain.value = 30; lfo.connect(lg).connect(c.frequency);
      a.connect(lp); b.connect(lp); lp.connect(g); c.connect(cg).connect(g);
      for (const o of [a, b, c, lfo]) o.start();
      drone = { g, nodes: [a, b, c, lfo] };
    }
    drone.g.gain.cancelScheduledValues(ctx.currentTime);
    drone.g.gain.setTargetAtTime(level, ctx.currentTime, .8);
  }
  function droneOff(fast = false) {
    const ctx = out(); if (!ctx || !drone) return;
    drone.g.gain.cancelScheduledValues(ctx.currentTime);
    drone.g.gain.setTargetAtTime(0.0001, ctx.currentTime, fast ? .01 : .6);
  }
  // 늘어진 목소리 같은 낮은 신음. 이상한 소리.
  function moan(gain = .12) {
    const ctx = out(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'triangle';
    const t = ctx.currentTime; o.frequency.setValueAtTime(190 + Math.random() * 40, t); o.frequency.exponentialRampToValueAtTime(70, t + 2.4);
    const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.5; vg.gain.value = 9; v.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.2;
    const g = ctx.createGain(); o.connect(f).connect(g).connect(P.master);
    const end = env(ctx, g, gain, .4, 1.2, 1);
    o.start(t); v.start(t); o.stop(end); v.stop(end);
  }
  // 공포 컷용 찌르는 소리(짧고 큼).
  function sting(gain = .7) {
    const ctx = out(); if (!ctx) return;
    const t = ctx.currentTime;
    for (const freq of [1180, 1251, 1662]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .55, t + .5);
      const g = ctx.createGain(); o.connect(g).connect(P.master); const end = env(ctx, g, gain / 3, .003, .25, .25); o.start(t); o.stop(end);
    }
    crackle(.45, gain * .8, 'tear');
  }
  // 점프스케어 비명: 찢어지는 톱니파 여러 겹 + 잡음 + 일그러짐 + 바닥 쿵.
  function scream(dur = 1.4) {
    const ctx = out(); if (!ctx) return;
    const t = ctx.currentTime;
    const shaper = ctx.createWaveShaper(); const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 9); }
    shaper.curve = curve; const g = ctx.createGain(); shaper.connect(g).connect(P.master);
    env(ctx, g, .95, .005, dur - .3, .3);
    for (const base of [620, 845, 1290, 2010]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * .7, t); o.frequency.exponentialRampToValueAtTime(base * 1.35, t + .12); o.frequency.exponentialRampToValueAtTime(base * .8, t + dur);
      const wob = ctx.createOscillator(), wg = ctx.createGain(); wob.frequency.value = 17 + Math.random() * 9; wg.gain.value = base * .09; wob.connect(wg).connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = .3; o.connect(og).connect(shaper); o.start(t); wob.start(t); o.stop(t + dur); wob.stop(t + dur);
    }
    const n = ctx.createBufferSource(); n.buffer = noise(ctx); const ng = ctx.createGain(); ng.gain.value = .6; n.connect(ng).connect(shaper); n.start(t); n.stop(t + dur);
    const boom = ctx.createOscillator(); boom.type = 'sine'; boom.frequency.setValueAtTime(95, t); boom.frequency.exponentialRampToValueAtTime(32, t + .8);
    const bg = ctx.createGain(); boom.connect(bg).connect(P.master); const be = env(ctx, bg, 1, .002, .25, .7); boom.start(t); boom.stop(be);
  }
  // 속삭임: 걸러진 잡음이 말하듯 오르내린다(경고 글자와 함께).
  function whisper(dur = 1.1, gain = .22) {
    const ctx = out(); if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noise(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) f.frequency.setValueAtTime(900 + Math.random() * 2200, t + i * dur / 8);
    const g = ctx.createGain(); src.connect(f).connect(g).connect(P.master);
    const end = env(ctx, g, gain, .05, dur - .2, .15); src.start(t); src.stop(end);
  }

  // --- 얼굴: 변신 영상 8.45초 장면(웃는 얼굴 클로즈업)을 캔버스로 잘라 둔다 ---
  let facePromise = null;
  function face() {
    if (facePromise) return facePromise;
    facePromise = new Promise(resolve => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.src = 'assets/video/elder-transformation-10s.mp4?v=001c729e9eba';
      let finished = false;
      const done = ok => {
        if (finished) return; finished = true;
        const c = document.createElement('canvas'); c.width = 480; c.height = 560;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        if (ok && Math.abs(v.currentTime - 8.45) < 1) g.drawImage(v, 30, 400, 480, 560, 0, 0, c.width, c.height);
        // 눈과 입을 검게 파 낸다(웃는 얼굴 → 텅 빈 얼굴). 눈 안에 하얀 점 하나씩.
        g.fillStyle = '#000'; g.beginPath();
        g.ellipse(98, 282, 37, 27, -.08, 0, 7); g.ellipse(242, 284, 37, 27, .08, 0, 7);
        g.ellipse(152, 404, 62, 34, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.fillRect(99, 283, 5, 5); g.fillRect(241, 285, 5, 5);
        v.removeAttribute('src'); v.load(); resolve(c);
      };
      v.addEventListener('loadedmetadata', () => { v.currentTime = Math.min(8.45, (v.duration || 10) - .1); }, { once: true });
      v.addEventListener('seeked', () => done(true), { once: true });
      v.addEventListener('error', () => done(false), { once: true });
      setTimeout(() => done(false), 9000);
    });
    return facePromise;
  }

  window.PhaseFX = { crackle, droneOn, droneOff, moan, sting, scream, whisper, face };
})();

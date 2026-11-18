  // ===== 2026-11-17 개발자용(02)만: 꿈 · 할배 머릿속 · 풀밭 (Claude Code) =====
  // game.js 안(같은 스코프)에 개발자용으로만 들어간다. 사용자가 「ㅇㅇ」로 승인한 되묻기 원문:
  //  1페 「테스트라는 것을 전혀 알려 주지 않습니다. 스페이스바를 꾹 누르고 있는 동안 꿈속처럼 뜻 모를 말소리와 장면, 바퀴벌레가 나와서
  //       궁금해하며 방심하게 만들고, 이상한 화면이나 소리가 불쑥 나와 순간 움찔해서 스페이스바를 놓게 합니다.」
  //  2페 「AI가 꿈이라도 좋은 꿈을 꾸게 해 주려고 뇌파 측정기를 통해 할배의 뇌 안으로 직접 들어가, 테스트를 짧게 몇 개 합니다.
  //       움찔하게 하거나 스페이스바를 놓고 싶게 만드는 장면이 1페보다 더 많이 나옵니다. 무섭거나 징그러운 소리와 화면이고, 점프스케어 수준은 아닙니다.」
  //  2페 끝 「후반부에 조이던 것이 한 번에 확 놓입니다. 영화처럼 위아래 검은 띠가 걷히며 풀밭으로 바뀌고, AI 메이드가 인사하며
  //       「좋은 꿈 꾸세요, 할아버지.」라고 말해 긴장이 싹 풀린 채로 클리어됩니다.」
  // 그림은 전부 이 파일이 캔버스로 직접 그린다(외부 그림·상용 게임 그림 없음). 뜻 모를 말소리 = AI 목소리 파일을 거꾸로 튼 것.
  const Dream = (() => {
    const cv = $('dream'), meadow = $('meadow'), bars = $('bars'), testBox = $('test'), caption = $('caption');
    const CELL = 4;
    let lw = 1, lh = 1, lo = null, lctx = null, bc = null, bctx = null, brainImg = null, out = null, octx = null, outImg = null, blank = true;
    const fx = { invert: 0, eye: 0, stare: false, flick: 0, silence: 0, faces: 0, squelch: false, breath: false, slowMumble: false, tight: 0 };
    let lastScan = 0, nextMumble = 0, nextSquelch = 0, nextBreath = 0, lastCreak = -1, t = 0;
    let bus = null, verb = null, loops = null, drone = null, ending = null;
    const rev = {};

    // ---------- 소리 ----------
    function ensureBus() {
      if (!audio || bus) return !!bus;
      bus = audio.createGain(); bus.gain.value = 1; bus.connect(master);
      // 꿈 울림: 잡음으로 만든 2.6초 잔향
      const len = Math.floor(audio.sampleRate * 2.6), ir = audio.createBuffer(2, len, audio.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
      const conv = audio.createConvolver(); conv.buffer = ir; verb = audio.createGain(); verb.gain.value = .55; verb.connect(conv); conv.connect(bus);
      return true;
    }
    function reversed(name) {
      if (rev[name]) return rev[name];
      const b = voices[name]; if (!b) return null;
      const r = audio.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
      for (let ch = 0; ch < b.numberOfChannels; ch++) { const s = b.getChannelData(ch), d = r.getChannelData(ch); for (let i = 0, n = s.length; i < n; i++) d[i] = s[n - 1 - i]; }
      return (rev[name] = r);
    }
    const POOL = ['hold', 'retake', 'nurse', 'fakedone', 'done', 'enter', 't1', 't2', 't3', 't4', 't5'];
    // 뜻 모를 말소리: AI 목소리를 거꾸로, 조각만, 높낮이를 바꿔 여러 사람처럼.
    function mumble({ gain = .26, rate = .75 + Math.random() * .4, cutoff = 1300 + Math.random() * 1300, wet = true, pan = Math.random() * 1.6 - .8, len = .7 + Math.random() * .9 } = {}) {
      if (!ensureBus()) return;
      const names = POOL.filter(n => voices[n]); if (!names.length) return;
      const buf = reversed(names[Math.floor(Math.random() * names.length)]); if (!buf) return;
      const s = audio.createBufferSource(), lp = audio.createBiquadFilter(), g = audio.createGain(), p = audio.createStereoPanner ? audio.createStereoPanner() : null;
      s.buffer = buf; s.playbackRate.value = rate; lp.type = 'lowpass'; lp.frequency.value = cutoff;
      const now = audio.currentTime, off = Math.random() * Math.max(0, buf.duration - len - .1);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(gain, now + .06); g.gain.setValueAtTime(gain, now + len / rate * .8); g.gain.exponentialRampToValueAtTime(.0001, now + len / rate);
      s.connect(lp); lp.connect(g);
      if (p) { p.pan.value = pan; g.connect(p); p.connect(bus); if (wet) p.connect(verb); } else { g.connect(bus); if (wet) g.connect(verb); }
      s.start(now, off, len + .05);
    }
    const shout = () => mumble({ gain: 1.05, rate: .6, cutoff: 6000, wet: true, pan: 0, len: 1.1 });
    const whisper = () => mumble({ gain: .8, rate: .95, cutoff: 7000, wet: false, pan: -.95, len: .9 });
    function stab() { // 어긋난 화음 한 번
      if (!ensureBus()) return; const t0 = audio.currentTime;
      for (const f of [233, 247, 262, 466]) { const o = audio.createOscillator(), g = audio.createGain(), lp = audio.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2200;
        g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.07, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .9); o.connect(lp); lp.connect(g); g.connect(bus); g.connect(verb); o.start(t0); o.stop(t0 + 1); }
    }
    function squelch(gain = .32) { // 질척한 소리
      if (!ensureBus()) return; const t0 = audio.currentTime, dur = .16 + Math.random() * .22;
      const len = Math.floor(audio.sampleRate * dur), b = audio.createBuffer(1, len, audio.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
      const s = audio.createBufferSource(), bp = audio.createBiquadFilter(), g = audio.createGain(); s.buffer = b; bp.type = 'bandpass'; bp.Q.value = 4;
      bp.frequency.setValueAtTime(900 + Math.random() * 500, t0); bp.frequency.exponentialRampToValueAtTime(180, t0 + dur); g.gain.value = gain;
      s.connect(bp); bp.connect(g); g.connect(bus); s.start(t0);
      const o = audio.createOscillator(), og = audio.createGain(); o.frequency.setValueAtTime(170, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + dur);
      og.gain.setValueAtTime(gain * .6, t0); og.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(og); og.connect(bus); o.start(t0); o.stop(t0 + dur + .02);
    }
    function breath() { // 바로 옆에서 무겁게 쉬는 숨
      if (!ensureBus()) return; const t0 = audio.currentTime, dur = 2.4;
      const len = Math.floor(audio.sampleRate * dur), b = audio.createBuffer(1, len, audio.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = audio.createBufferSource(), lp = audio.createBiquadFilter(), g = audio.createGain(); s.buffer = b; lp.type = 'lowpass'; lp.frequency.value = 750;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.42, t0 + 1); g.gain.exponentialRampToValueAtTime(.02, t0 + 1.25); g.gain.exponentialRampToValueAtTime(.3, t0 + 1.5); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      s.connect(lp); lp.connect(g); g.connect(bus); s.start(t0);
    }
    function screech() { // 긁는 소리(짧고 크지 않게)
      if (!ensureBus()) return; const t0 = audio.currentTime;
      for (const f of [1700, 1767]) { const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 1.45, t0 + .45);
        g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.045, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .5); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + .55); }
      noiseBurst(.3, .22, 5200);
    }
    function creak() { if (!ensureBus()) return; const t0 = audio.currentTime, o = audio.createOscillator(), g = audio.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(270, t0); o.frequency.exponentialRampToValueAtTime(205, t0 + .32); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.035, t0 + .04); g.gain.exponentialRampToValueAtTime(.0001, t0 + .34); o.connect(g); g.connect(bus); g.connect(verb); o.start(t0); o.stop(t0 + .36); }
    // 계속 깔리는 소리: 1페 빗소리, 2페 낮고 질척한 웅웅
    function startLoops() {
      if (!ensureBus() || loops) return;
      const len = audio.sampleRate * 2, b = audio.createBuffer(1, len, audio.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const mk = (type, f, q) => { const s = audio.createBufferSource(), fl = audio.createBiquadFilter(), g = audio.createGain(); s.buffer = b; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(bus); s.start(); return { s, g }; };
      loops = { rain: mk('bandpass', 2600, .7), gut: mk('lowpass', 150, .9) };
    }
    function stopLoops() { if (!loops) return; for (const l of Object.values(loops)) { try { l.s.stop(); } catch (_) {} } loops = null; }
    function startDrone() {
      if (!ensureBus() || drone) return; const t0 = audio.currentTime, g = audio.createGain(), lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; g.gain.value = .0001; lp.connect(g); g.connect(bus);
      const os = [55, 57.6, 110.4].map(f => { const o = audio.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 1.32, t0 + 18); o.connect(lp); o.start(); return o; });
      g.gain.exponentialRampToValueAtTime(.16, t0 + 16); drone = { g, os };
    }
    function stopDrone() { if (!drone) return; drone.os.forEach(o => { try { o.stop(); } catch (_) {} }); drone = null; }
    function cutAllSound() { // 조이던 소리를 한 번에 끊는다
      if (bus) { bus.gain.cancelScheduledValues(audio.currentTime); bus.gain.setValueAtTime(0, audio.currentTime); bus.disconnect(); }
      stopLoops(); stopDrone(); bus = null; verb = null;
      try { voiceNode?.stop(); } catch (_) {}
    }

    // ---------- 그림 준비(낮은 해상도 회색 → 1비트 디더) ----------
    function resizeDream() {
      lw = Math.max(8, Math.ceil(W / CELL)); lh = Math.max(8, Math.ceil(H / CELL));
      cv.width = lw; cv.height = lh;
      lo = document.createElement('canvas'); lo.width = lw; lo.height = lh; lctx = lo.getContext('2d', { willReadFrequently: true });
      bc = document.createElement('canvas'); bc.width = lw; bc.height = lh; bctx = bc.getContext('2d'); brainImg = bctx.createImageData(lw, lh);
      octx = cv.getContext('2d'); outImg = octx.createImageData(lw, lh); blank = false; clearDream();
      meadow.width = W; meadow.height = H;
    }
    function clearDream() { if (blank || !octx) return; octx.fillStyle = '#000'; octx.fillRect(0, 0, lw, lh); blank = true; }
    const gr = v => { const c = Math.max(0, Math.min(255, v * 255 | 0)); return `rgb(${c},${c},${c})`; };
    const fade = (k, a, b, f = 2.5) => Math.max(0, Math.min(1, (k - a) / f, (b - k) / f));

    // ---------- 1페 꿈 장면 ----------
    function corridor(g, w, h, k, open) {
      const vx = w * .5, vy = h * .44, z = 1 + k * .025, dw = w * .07 * z * (open ? 1.5 : 1), dh = h * .2 * z * (open ? 1.5 : 1);
      g.fillStyle = gr(.09); g.beginPath(); g.moveTo(0, 0); g.lineTo(vx - dw, vy - dh); g.lineTo(vx - dw, vy + dh); g.lineTo(0, h); g.fill();
      g.beginPath(); g.moveTo(w, 0); g.lineTo(vx + dw, vy - dh); g.lineTo(vx + dw, vy + dh); g.lineTo(w, h); g.fill();
      g.fillStyle = gr(.2); g.beginPath(); g.moveTo(0, h); g.lineTo(vx - dw, vy + dh); g.lineTo(vx + dw, vy + dh); g.lineTo(w, h); g.fill();
      g.fillStyle = gr(.07); g.beginPath(); g.moveTo(0, 0); g.lineTo(vx - dw, vy - dh); g.lineTo(vx + dw, vy - dh); g.lineTo(w, 0); g.fill();
      for (let i = 1; i < 5; i++) { // 옆 문틀
        const f = i / 5, x1 = vx - dw - (vx - dw) * (1 - f) * .9, x2 = vx + dw + (w - vx - dw) * (1 - f) * .9;
        g.strokeStyle = gr(.32); g.lineWidth = 1 + (1 - f) * 2;
        g.beginPath(); g.moveTo(x1, vy - dh - (vy - dh) * (1 - f) * .6); g.lineTo(x1, vy + dh + (h - vy - dh) * (1 - f) * .6); g.stroke();
        g.beginPath(); g.moveTo(x2, vy - dh - (vy - dh) * (1 - f) * .6); g.lineTo(x2, vy + dh + (h - vy - dh) * (1 - f) * .6); g.stroke();
      }
      const flicker = .75 + .25 * Math.sin(k * 13) * Math.sin(k * 3.1);
      const glow = g.createRadialGradient(vx, vy, 1, vx, vy, dh * (open ? 4 : 2.4));
      glow.addColorStop(0, gr((open ? .95 : .6) * flicker)); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      g.fillStyle = gr((open ? .98 : .7) * flicker); g.fillRect(vx - dw * .55, vy - dh * .8, dw * 1.1, dh * 1.6);
    }
    function swing(g, w, h, k) {
      g.fillStyle = gr(.16); g.fillRect(0, h * .78, w, h * .22);
      const top = h * .2, px = w * .5, len = h * .45, a = Math.sin(k * 1.3) * .5;
      g.strokeStyle = gr(.34); g.lineWidth = 3;
      g.beginPath(); g.moveTo(px - w * .2, h * .8); g.lineTo(px - w * .12, top); g.lineTo(px + w * .12, top); g.lineTo(px + w * .2, h * .8); g.stroke();
      const sx = px + Math.sin(a) * len, sy = top + Math.cos(a) * len;
      g.lineWidth = 1.2; g.strokeStyle = gr(.45);
      g.beginPath(); g.moveTo(px - w * .03, top); g.lineTo(sx - w * .03, sy); g.moveTo(px + w * .03, top); g.lineTo(sx + w * .03, sy); g.stroke();
      g.fillStyle = gr(.5); g.fillRect(sx - w * .04, sy, w * .08, 3);
      const sky = g.createRadialGradient(w * .8, h * .15, 1, w * .8, h * .15, h * .5); sky.addColorStop(0, gr(.35)); sky.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const beat = Math.floor((k * 1.3 + Math.PI / 2) / Math.PI); if (beat !== lastCreak) { lastCreak = beat; creak(); }
    }
    function rain(g, w, h, k) {
      const x0 = w * .3, y0 = h * .16, ww = w * .4, hh = h * .56;
      g.fillStyle = gr(.3); g.fillRect(x0, y0, ww, hh);
      g.strokeStyle = gr(.62); g.lineWidth = 1;
      for (let i = 0; i < 70; i++) { const rx = x0 + ((i * 53.7) % ww), ry = y0 + ((i * 31.3 + k * 120 * (1 + i % 3 * .3)) % hh); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 1, ry + 6); g.stroke(); }
      g.strokeStyle = gr(.08); g.lineWidth = 4; g.strokeRect(x0, y0, ww, hh); g.beginPath(); g.moveTo(x0 + ww / 2, y0); g.lineTo(x0 + ww / 2, y0 + hh); g.moveTo(x0, y0 + hh * .45); g.lineTo(x0 + ww, y0 + hh * .45); g.stroke();
      g.fillStyle = gr(.1); g.fillRect(x0 - w * .04, y0 + hh, ww + w * .08, 4);
    }
    function table(g, w, h, k) {
      const lamp = g.createRadialGradient(w * .5, h * .1, 1, w * .5, h * .45, h * .7); lamp.addColorStop(0, gr(.72)); lamp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lamp; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const x = w * (.28 + i * .22), bob = fx.stare ? 0 : Math.sin(k * 3.2 + i * 2.1) * 1.6, y = h * .44 + bob, r = h * .075 * (fx.stare ? 1.18 : 1);
        g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y + r * 2.6, r * 1.9, r * 1.6, 0, Math.PI, 0); g.fill();
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = gr(.5); g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        if (fx.stare) { g.fillStyle = gr(1); g.fillRect(x - r * .4 - 1, y - 1, 2, 2); g.fillRect(x + r * .4 - 1, y - 1, 2, 2); }
      }
      g.fillStyle = gr(.36); g.beginPath(); g.ellipse(w * .5, h * .82, w * .42, h * .14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = gr(.6); for (const x of [.36, .5, .64]) { g.beginPath(); g.ellipse(w * x, h * .8, w * .03, h * .02, 0, 0, Math.PI * 2); g.fill(); }
    }
    let crowdMouth = 0;
    function crowd(g, w, h, k) {
      for (let i = 0; i < 11; i++) {
        const x = w * (.08 + (i * .173) % .86) + Math.sin(k * .4 + i) * 6, y = h * (.3 + (i * .29) % .5) + Math.cos(k * .5 + i * 1.7) * 4, r = h * (.07 + (i % 3) * .025);
        g.fillStyle = gr(.18 + (i % 4) * .05); g.beginPath(); g.ellipse(x, y, r * .8, r, 0, 0, Math.PI * 2); g.fill();
        const open = Math.max(.1, Math.abs(Math.sin(k * (4 + i % 3) + i)) * (crowdMouth > 0 ? 1 : .5));
        g.fillStyle = gr(.02); g.beginPath(); g.ellipse(x, y + r * .45, r * .22, r * .2 * open, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(x - r * .3, y - r * .1, r * .12, r * .08, 0, 0, Math.PI * 2); g.ellipse(x + r * .3, y - r * .1, r * .12, r * .08, 0, 0, Math.PI * 2); g.fill();
      }
    }
    const P1 = [['corridor', 0, 14], ['swing', 11, 28], ['rain', 25, 42], ['table', 39, 57], ['crowd', 56, 75], ['open', 72, 92]];

    // ---------- 2페 할배 머릿속 ----------
    function brain(k, a) {
      const d = brainImg.data, tt = k * (fx.squelch ? 1.9 : 1), pulse = .82 + .3 * beatKick + (fx.breath ? .12 * Math.sin(k * 2.4) : 0);
      for (let y = 0; y < lh; y++) {
        const ny = y / lh - .5;
        for (let x = 0; x < lw; x++) {
          const nx = x / lw - .5;
          const f = x * .075 + 2.6 * Math.sin(y * .045 + tt * .5) + 1.6 * Math.sin((x * .6 - y) * .035 - tt * .35) + Math.sin(y * .13 + x * .02 + tt * .9) * .7;
          const fold = Math.abs(Math.sin(f)); let v = fold < .22 ? .02 : .3 + Math.pow(fold, 1.4) * .45;
          v *= Math.max(0, 1 - Math.hypot(nx, ny * 1.15) * 1.15) * pulse;
          const c = Math.max(0, Math.min(255, v * 255 | 0)), i = (y * lw + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
        }
      }
      bctx.putImageData(brainImg, 0, 0); lctx.globalAlpha = a; lctx.drawImage(bc, 0, 0); lctx.globalAlpha = 1;
    }
    function eeg(k) { // 뇌파 측정기 선 → 그 안으로 들어간다
      const g = lctx, amp = Math.min(lh * .32, 3 + k * k * 4), zoom = 1 + Math.max(0, k - 2.6) * 1.6;
      g.save(); g.translate(lw / 2, lh / 2); g.scale(zoom, zoom); g.translate(-lw / 2, -lh / 2);
      g.globalAlpha = Math.max(0, Math.min(1, (6.2 - k) / 2)); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.beginPath();
      for (let x = 0; x <= lw; x += 1) { const p = x / lw; const spike = Math.pow(Math.max(0, Math.sin(p * 31 - k * 9)), 18); g.lineTo(x, lh / 2 + Math.sin(p * 47 + k * 7) * amp * .25 + Math.sin(p * 13 - k * 3) * amp * .35 - spike * amp); }
      g.stroke(); g.restore(); g.globalAlpha = 1;
    }
    function eye(open) { // 주름이 갈라지며 열리는 눈
      const g = lctx, cx = lw / 2, cy = lh * .45, rx = lw * .17, ry = lh * .16 * open;
      g.fillStyle = gr(.02); g.beginPath(); g.ellipse(cx, cy, rx * 1.15, ry * 1.25 + 1, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = gr(.85); g.beginPath(); g.ellipse(cx, cy, rx, ry + .5, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry + .5, 0, 0, Math.PI * 2); g.clip();
      g.strokeStyle = gr(.45); g.lineWidth = .8; for (let i = 0; i < 7; i++) { const a = i * .9; g.beginPath(); g.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); g.quadraticCurveTo(cx + Math.cos(a + .3) * rx * .6, cy + Math.sin(a + .4) * ry * .6, cx + Math.cos(a) * rx * .35, cy + Math.sin(a) * ry * .3); g.stroke(); }
      const look = Math.sin(t * 5) * rx * .12;
      g.fillStyle = gr(.35); g.beginPath(); g.arc(cx + look, cy, lh * .085, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx + look, cy, lh * .045, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx + look - lh * .03, cy - lh * .035, 2, 2); g.restore();
    }
    function ghostFaces(k, a) {
      faceTile = faceTile || makeFace();
      for (let i = 0; i < 3; i++) {
        const fh = lh * (.26 + i * .05), fw = fh * faceTile.width / faceTile.height, x = lw * (.22 + i * .28) + Math.sin(k * .7 + i * 2) * 8, y = lh * (.34 + (i % 2) * .2) + Math.cos(k * .5 + i) * 6;
        lctx.globalAlpha = a * (.4 + .18 * Math.sin(k * 2.3 + i * 1.9)); lctx.drawImage(faceTile, x - fw / 2, y - fh / 2, fw, fh);
      }
      lctx.globalAlpha = 1;
    }

    // ---------- 한 프레임 ----------
    function render(k) {
      const g = lctx; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, lw, lh);
      if (stagePhase === 1) {
        for (const [name, a, b] of P1) {
          const al = fade(k, a, b); if (al <= 0) continue;
          g.save(); g.globalAlpha = al * .9; const s = 1 + (k - a) * .006; g.translate(lw / 2, lh / 2); g.scale(s, s); g.translate(-lw / 2, -lh / 2);
          if (name === 'corridor') corridor(g, lw, lh, k, false); else if (name === 'open') corridor(g, lw, lh, k - a, true);
          else if (name === 'swing') swing(g, lw, lh, k); else if (name === 'rain') rain(g, lw, lh, k); else if (name === 'table') table(g, lw, lh, k); else crowd(g, lw, lh, k);
          g.restore();
        }
      } else {
        if (k < 6.2) eeg(k);
        brain(k, Math.max(0, Math.min(1, (k - 3) / 3)));
        if (fx.faces > 0) ghostFaces(k, fx.faces);
        if (fx.eye > 0) eye(Math.min(1, fx.eye));
      }
      const src = g.getImageData(0, 0, lw, lh).data, d = outImg.data;
      const inv = fx.invert > 0, dim = fx.flick > 0 ? .35 : 1, grain = stagePhase === 1 ? .025 : .04, jitter = (t * 60 | 0) & 3;
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
        const i = (y * lw + x) * 4, v = src[i] / 255 * dim + (Math.random() - .5) * grain;
        let on = v > bayer[((y + jitter) & 3) * 4 + (x & 3)]; if (inv) on = !on;
        d[i] = d[i + 1] = d[i + 2] = on ? 255 : 0; d[i + 3] = 255;
      }
      octx.putImageData(outImg, 0, 0); blank = false;
    }
    function ambient(k, dt) {
      if (!audio) return;
      if (fx.silence > 0) { fx.silence -= dt; } else if (stagePhase === 1) {
        if (k >= nextMumble) {
          const busy = (k > 39 && k < 57) || (k > 56 && k < 75); if (k > 56 && k < 75) crowdMouth = .6;
          mumble({ gain: busy ? .32 : .22 }); if (busy && Math.random() < .5) mumble({ gain: .2 });
          nextMumble = k + (busy ? .5 + Math.random() * 1.1 : 1.3 + Math.random() * 1.9);
        }
      } else if (fx.slowMumble && k >= nextMumble) { mumble({ gain: .38, rate: .55 + Math.random() * .1 }); nextMumble = k + .7 + Math.random() * .8; }
      if (crowdMouth > 0) crowdMouth -= dt;
      if (fx.squelch && k >= nextSquelch) { squelch(.22 + Math.random() * .14); nextSquelch = k + .45 + Math.random() * .9; }
      if (fx.breath && k >= nextBreath) { breath(); nextBreath = k + 2.7; }
      if (loops) {
        const r = stagePhase === 1 ? fade(k, 25, 42) * .07 : 0, gut = stagePhase === 2 ? Math.min(1, k / 5) * (.1 + beatKick * .12 + fx.tight * .1) : 0;
        loops.rain.g.gain.setTargetAtTime(r, audio.currentTime, .3); loops.gut.g.gain.setTargetAtTime(gut, audio.currentTime, .1);
      }
    }
    function setBars(p, animate) { bars.classList.toggle('open', !!animate); for (const i of bars.children) i.style.height = (p * 100).toFixed(2) + 'vh'; }
    function label(n, word) { testBox.innerHTML = n ? `테스트 ${n}<small>${word}</small>` : ''; testBox.classList.toggle('on', !!n); }

    // ---------- 일정(검사 시간 기준 초) ----------
    function schedule() {
      const j = () => (Math.random() - .5) * 3;
      if (stagePhase !== 2) return [
        // 1페: 꿈속. 테스트라는 말은 하지 않는다. 움찔 다섯 번(외침·쳐다봄·전구 방·암전 쿵·큰 바퀴벌레) + 바퀴벌레 한 마리.
        { at: 21.5 + j(), end: 0, name: 'shout', on: () => { fx.silence = .9; setTimeout(() => { if (phase === 'scan') { shout(); fx.invert = .28; knockKick = 2; } }, 600 / SPEED); }, off: () => {} },
        { at: 30 + j(), end: 52, name: 'bug', on: () => spawnBug(), off: () => { for (const b of bugs) if (!b.toKey) b.leaving = true; } },
        { at: 47 + j() * .5, end: 52.5, name: 'stare', on: () => { fx.stare = true; fx.silence = 2.4; stab(); knockKick = 1.5; }, off: () => { fx.stare = false; } },
        { at: 56.5 + j() * .3, end: 60, name: 'cut', on: () => { body.dataset.cut = 'true'; drawElsewhere(); click(); }, off: () => { body.dataset.cut = 'false'; } },
        { at: 66 + j(), end: 66.8, name: 'black', on: () => { body.dataset.black = 'true'; bang(); }, off: () => { body.dataset.black = 'false'; } },
        { at: 80 + j() * .6, end: 0, name: 'dash', on: () => { dashBug(2.2, -1); skitter(18); }, off: () => {} }
      ];
      // 2페: 할배 머릿속. AI가 테스트 다섯 개. 움찔 일곱 번 + 스페이스바로 모이는 바퀴벌레 일곱 마리 + 마지막 18초 조이기.
      const blackAt = 56 + j() * .4;
      const list = [
        { at: .4, end: 0, name: 'enter', on: () => say('enter'), off: () => {} },
        { at: 8, end: 20.5, name: 't1', on: () => { label(1, '소리'); say('t1'); fx.squelch = true; }, off: () => { fx.squelch = false; label(0); } },
        { at: 14.5 + j() * .6, end: 15.2, name: 'split', on: () => { fx.eye = .01; squelch(1.1); noiseBurst(.35, .9, 1400); knockKick = 2; }, off: () => { fx.eye = 0; } },
        { at: 21, end: 33, name: 't2', on: () => { label(2, '얼굴'); say('t2'); fx.faces = 1; }, off: () => { fx.faces = 0; label(0); } },
        { at: 27 + j() * .6, end: 0, name: 'scare', on: scare, off: () => {} },
        { at: 34, end: 48, name: 't3', on: () => { label(3, '벌레'); say('t3'); }, off: () => label(0) },
        { at: 42 + j() * .6, end: 0, name: 'burst', on: () => { for (let i = 0; i < 14; i++) dashBug(.9 + Math.random() * .8, i % 2 ? 1 : -1, true); skitter(22); knockKick = 1.5; }, off: () => {} },
        // 11/18: 14마리가 지나간 직후 기형적으로 큰 배 쪽 바퀴벌레 한 마리가 화면을 아래에서 위로 지나쳐 간다(2페에만)
        { at: 45 + j() * .2, end: 0, name: 'giant', on: () => giantBug(), off: () => {} },
        { at: 49, end: 55.4, name: 't4', on: () => { label(4, '기억'); say('t4'); body.dataset.cut = 'true'; drawElsewhere(); fx.slowMumble = true; }, off: () => { body.dataset.cut = 'false'; fx.slowMumble = false; label(0); } },
        { at: blackAt, end: blackAt + .9, name: 'black', on: () => { body.dataset.black = 'true'; bang(); }, off: () => { body.dataset.black = 'false'; } },
        { at: blackAt + 1, end: 0, name: 'whisper', on: whisper, off: () => {} },
        { at: 61.5, end: 72, name: 't5', on: () => { label(5, '숨'); say('t5'); fx.breath = true; }, off: () => { fx.breath = false; label(0); } },
        { at: 68.5 + j() * .6, end: 0, name: 'scare', on: scare, off: () => {} },
        { at: 72, end: 0, name: 'tight', on: () => startDrone(), off: () => {} },
        { at: 78 + j() * .4, end: 78.18, name: 'eyeflick', on: () => { fx.eye = .9; fx.flick = .18; squelch(.7); }, off: () => { fx.eye = 0; } },
        { at: 84.5 + j() * .3, end: 0, name: 'screech', on: () => { screech(); fx.flick = .3; knockKick = 2; }, off: () => {} }
      ];
      for (let i = 0; i < 7; i++) list.push({ at: 34.5 + i * 1.8 + Math.random(), end: 0, name: 'swarm', on: () => spawnBug(true), off: () => {} });
      return list;
    }
    // 화면을 휙 가로지르는 바퀴벌레
    function dashBug(size, side, scatter) {
      const fromLeft = side < 0, y = scatter ? H * (.25 + Math.random() * .6) : H * .55;
      // 11/18: 휙 지나가는 바퀴벌레는 전부 배 쪽 사진(화면 유리 안쪽을 기어가 배가 보임)
      bugs.push({ x: fromLeft ? -260 : W + 260, y, heading: (fromLeft ? 0 : Math.PI) + (Math.random() - .5) * (scatter ? .9 : .15), speed: 0, t: 0, leaving: false, pause: 0, toKey: false, size, dash: scatter ? 700 + Math.random() * 500 : 1300, belly: true });
    }
    // 11/18: 기형적으로 큰 바퀴벌레(2페). 몸 길이 = 화면 짧은 쪽의 약 1.2배, 화면 아래 밖 → 위 밖으로 약 3초.
    function giantBug() {
      const S = Math.min(W, H), len = S * 1.2, size = len / (S / 520) / 84; // 그리는 몸 길이 = 84 × (S / 520) × size
      const margin = len * .75, dist = H + margin * 2;
      bugs.push({ x: W * (.42 + Math.random() * .16), y: H + margin, heading: -Math.PI / 2 + (Math.random() < .5 ? -1 : 1) * (.06 + Math.random() * .06), speed: 0, t: 0, leaving: false, pause: 0, toKey: false, size, dash: dist / 3, margin, belly: true, giant: true });
    }

    // ---------- 2페 끝: 풀밭 ----------
    const blades = [], flowers = [];
    for (let i = 0; i < 560; i++) blades.push({ x: Math.random(), y: .63 + Math.pow(Math.random(), .7) * .4, h: .6 + Math.random() * .7, p: Math.random() * 6.28, c: Math.random() });
    blades.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 46; i++) flowers.push({ x: Math.random(), y: .68 + Math.random() * .32, c: ['#fff8e7', '#ffe27a', '#f6b8c8', '#c9d8ff'][i % 4], p: Math.random() * 6.28 });
    function drawMeadow(c, k) {
      const sky = c.createLinearGradient(0, 0, 0, H * .62); sky.addColorStop(0, '#8fc9ee'); sky.addColorStop(1, '#e7f5fb'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
      const sun = c.createRadialGradient(W * .18, H * .14, 4, W * .18, H * .14, H * .42); sun.addColorStop(0, 'rgba(255,252,228,.95)'); sun.addColorStop(.25, 'rgba(255,248,214,.5)'); sun.addColorStop(1, 'rgba(255,248,214,0)'); c.fillStyle = sun; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.88)';
      for (let i = 0; i < 4; i++) { const x = ((i * .31 + k * .006) % 1.3 - .15) * W, y = H * (.1 + i * .07), r = H * (.04 + i % 2 * .015); for (const [ex, ey, ea, eb] of [[0, 0, 2.2, 1], [1.6, -.4, 1.5, .9], [-1.5, .2, 1.3, .7]]) { c.beginPath(); c.ellipse(x + r * ex, y + r * ey, r * ea, r * eb, 0, 0, 6.29); c.fill(); } }
      const hill = (y0, amp, col, f) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 12; x += 12) c.lineTo(x, H * y0 - Math.sin(x / W * f + y0 * 9) * H * amp - Math.sin(x / W * f * 2.3) * H * amp * .4); c.lineTo(W, H); c.fill(); };
      hill(.57, .035, '#b4dca0', 5); hill(.62, .03, '#93cc7c', 7);
      const field = c.createLinearGradient(0, H * .63, 0, H); field.addColorStop(0, '#86c96b'); field.addColorStop(1, '#4e9a3f'); c.fillStyle = field; c.fillRect(0, H * .64, W, H * .36);
      const groundY = H * .82, mx = W * .5;
      const bladeLayer = from => {
        for (const b of blades) {
          if (from ? b.y < .82 : b.y >= .82) continue;
          const x = b.x * W, y = b.y * H, depth = (b.y - .6) / .43, len = b.h * H * (.02 + depth * .055), sway = Math.sin(k * 1.7 + b.p + b.x * 5) * len * .35;
          c.strokeStyle = `hsl(${100 + b.c * 22},${42 + b.c * 18}%,${28 + depth * 12 + b.c * 14}%)`; c.lineWidth = .8 + depth * 2.2;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sway * .3, y - len * .6, x + sway, y - len); c.stroke();
        }
      };
      bladeLayer(false);
      for (const f of flowers) { if (f.y >= .82) continue; const s = 1.5 + (f.y - .6) * 9; c.fillStyle = f.c; c.beginPath(); c.arc(f.x * W + Math.sin(k * 1.5 + f.p) * 2, f.y * H - s, s, 0, 6.29); c.fill(); }
      const bow = ending ? bowAt(ending.t) : 0;
      drawMaid(c, mx, groundY, H * .46 / 300, bow, k, ending && ending.t > 2.9);
      bladeLayer(true);
      for (const f of flowers) { if (f.y < .82) continue; const s = 1.5 + (f.y - .6) * 9; c.fillStyle = f.c; c.beginPath(); c.arc(f.x * W + Math.sin(k * 1.5 + f.p) * 2, f.y * H - s, s, 0, 6.29); c.fill(); }
      // 나비 한 마리
      const bx = W * (.72 + Math.sin(k * .35) * .12), by = H * (.5 + Math.sin(k * .9) * .06), flap = Math.abs(Math.sin(k * 11));
      c.fillStyle = '#fff6c9'; c.beginPath(); c.ellipse(bx - 5 * flap, by, 6 * flap + 1, 5, -.4, 0, 6.29); c.ellipse(bx + 5 * flap, by, 6 * flap + 1, 5, .4, 0, 6.29); c.fill();
    }
    const bowAt = s => { const a = s - 2.4; if (a < 0) return 0; if (a < .8) return Math.sin(a / .8 * Math.PI / 2); if (a < 1.5) return 1; if (a < 2.3) return Math.cos((a - 1.5) / .8 * Math.PI / 2); return 0; };
    // AI 메이드(이 파일에서 직접 그림): 검은 원피스·흰 앞치마·흰 머리띠, 눈은 AI라서 하늘색. 인사 = 몸을 숙이며 고개를 숙인다.
    function drawMaid(c, x, groundY, s, bow, k, smile) {
      c.save(); c.translate(x, groundY); c.scale(s, s);
      const dress = '#26233a', white = '#fdfdfd', skin = '#f6dcc8', hair = '#3a2a2e';
      c.fillStyle = 'rgba(20,60,10,.25)'; c.beginPath(); c.ellipse(0, 2, 64, 11, 0, 0, 6.29); c.fill();
      c.fillStyle = '#f2f2f2'; c.fillRect(-17, -72, 12, 66); c.fillRect(5, -72, 12, 66);
      c.fillStyle = '#2a2222'; c.beginPath(); c.ellipse(-11, -4, 13, 6, 0, 0, 6.29); c.ellipse(11, -4, 13, 6, 0, 0, 6.29); c.fill();
      c.fillStyle = dress; c.beginPath(); c.moveTo(-26, -152); c.quadraticCurveTo(-50, -110, -66, -68); c.quadraticCurveTo(0, -56, 66, -68); c.quadraticCurveTo(50, -110, 26, -152); c.fill();
      c.fillStyle = white; for (let i = -60; i <= 60; i += 12) { c.beginPath(); c.arc(i, -66 + Math.abs(i) * .02, 7, 0, Math.PI); c.fill(); }
      c.beginPath(); c.moveTo(-20, -148); c.lineTo(-38, -82); c.quadraticCurveTo(0, -72, 38, -82); c.lineTo(20, -148); c.fill();
      c.strokeStyle = '#e1e1e8'; c.lineWidth = 1.5; c.stroke();
      // 윗몸: 허리를 축으로 인사
      const breathe = 1 + Math.sin(k * 2) * .012, kk = (1 - .38 * bow) * breathe, sh = -62 * kk;
      c.save(); c.translate(0, -150);
      const headY = sh - 34 + bow * 26;
      c.fillStyle = hair; c.beginPath(); c.ellipse(0, headY + 6, 37, 40, 0, 0, 6.29); c.fill(); c.fillRect(-37, headY + 4, 74, 30 - bow * 6);
      c.fillStyle = dress; c.beginPath(); c.moveTo(-24, 0); c.lineTo(-29, sh); c.lineTo(29, sh); c.lineTo(24, 0); c.fill();
      c.fillStyle = white; c.beginPath(); c.moveTo(-14, -2); c.lineTo(-16, sh * .75); c.lineTo(16, sh * .75); c.lineTo(14, -2); c.fill();
      c.fillStyle = dress; c.beginPath(); c.arc(-30, sh + 6, 14, 0, 6.29); c.arc(30, sh + 6, 14, 0, 6.29); c.fill();
      c.strokeStyle = dress; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, sh + 12); c.lineTo(-19, -10 + bow * 4); c.moveTo(34, sh + 12); c.lineTo(19, -10 + bow * 4); c.stroke();
      c.fillStyle = white; c.beginPath(); c.arc(-18, -11 + bow * 4, 6.5, 0, 6.29); c.arc(18, -11 + bow * 4, 6.5, 0, 6.29); c.fill();
      c.fillStyle = skin; c.beginPath(); c.arc(-8, -4 + bow * 4, 7.5, 0, 6.29); c.arc(8, -4 + bow * 4, 7.5, 0, 6.29); c.fill();
      c.fillStyle = white; c.beginPath(); c.moveTo(-13, sh + 2); c.lineTo(0, sh + 11); c.lineTo(13, sh + 2); c.fill();
      c.fillStyle = '#c4566e'; c.beginPath(); c.ellipse(-5, sh + 8, 5, 3, -.4, 0, 6.29); c.ellipse(5, sh + 8, 5, 3, .4, 0, 6.29); c.fill();
      // 머리
      c.fillStyle = skin; c.beginPath(); c.ellipse(0, headY, 29, 31 - bow * 5, 0, 0, 6.29); c.fill();
      const fy = headY + bow * 8;
      if (bow < .25 && !smile) {
        c.fillStyle = '#5b9bd0'; c.beginPath(); c.ellipse(-11, fy + 3, 4.6, 6.2, 0, 0, 6.29); c.ellipse(11, fy + 3, 4.6, 6.2, 0, 0, 6.29); c.fill();
        c.fillStyle = '#fff'; c.fillRect(-12.5, fy - 1, 2.2, 2.2); c.fillRect(9.5, fy - 1, 2.2, 2.2);
      } else {
        c.strokeStyle = '#3a2a2e'; c.lineWidth = 2.2; for (const ex of [-11, 11]) { c.beginPath(); c.arc(ex, fy + 5, 5, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      }
      c.fillStyle = 'rgba(240,150,150,.55)'; c.beginPath(); c.ellipse(-18, fy + 12, 5, 3, 0, 0, 6.29); c.ellipse(18, fy + 12, 5, 3, 0, 0, 6.29); c.fill();
      c.strokeStyle = '#b0606a'; c.lineWidth = 2; c.beginPath(); c.arc(0, fy + 13, 4.5, .25, Math.PI - .25); c.stroke();
      // 앞머리(인사할수록 얼굴을 더 가린다)
      c.fillStyle = hair; c.beginPath(); c.moveTo(-33, headY + 6); c.quadraticCurveTo(-34, headY - 34, 0, headY - 36); c.quadraticCurveTo(34, headY - 34, 33, headY + 6);
      const fringe = headY - 8 + bow * 18;
      c.quadraticCurveTo(24, fringe - 6, 16, fringe); c.quadraticCurveTo(8, fringe - 7, 0, fringe + 1); c.quadraticCurveTo(-8, fringe - 7, -16, fringe); c.quadraticCurveTo(-24, fringe - 6, -33, headY + 6); c.fill();
      // 흰 머리띠 + 하늘색 귀 장치(AI 표시)
      c.strokeStyle = white; c.lineWidth = 7; c.beginPath(); c.arc(0, headY + 4, 35, Math.PI * 1.17, Math.PI * 1.83); c.stroke();
      c.fillStyle = white; for (let a = 1.2; a <= 1.81; a += .1) { c.beginPath(); c.arc(Math.cos(a * Math.PI) * 38, headY + 4 + Math.sin(a * Math.PI) * 38, 4.5, 0, 6.29); c.fill(); }
      c.fillStyle = '#9fdcff'; c.beginPath(); c.arc(-33, headY + 8, 4.5, 0, 6.29); c.arc(33, headY + 8, 4.5, 0, 6.29); c.fill();
      c.restore(); c.restore();
    }
    function startMeadowSound() {
      if (!audio) return; const t0 = audio.currentTime, g = audio.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 1.6); g.connect(master);
      const len = audio.sampleRate * 2, b = audio.createBuffer(1, len, audio.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const wind = audio.createBufferSource(), lp = audio.createBiquadFilter(), wg = audio.createGain(), lfo = audio.createOscillator(), lg = audio.createGain();
      wind.buffer = b; wind.loop = true; lp.type = 'lowpass'; lp.frequency.value = 480; wg.gain.value = .05; lfo.frequency.value = .18; lg.gain.value = .03; lfo.connect(lg); lg.connect(wg.gain);
      wind.connect(lp); lp.connect(wg); wg.connect(g); wind.start(); lfo.start();
      const pads = [261.6, 329.6, 392, 523.3].map((f, i) => { const o = audio.createOscillator(), og = audio.createGain(); o.frequency.value = f; og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(i === 3 ? .012 : .022, t0 + 2.6); o.connect(og); og.connect(g); o.start(); return o; });
      const birds = setInterval(() => { if (!ending || !audio) return; const t1 = audio.currentTime; for (let n = 0; n < 3; n++) { const o = audio.createOscillator(), og = audio.createGain(), st = t1 + n * .11, f = 3000 + Math.random() * 900; o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * 1.35, st + .05); o.frequency.exponentialRampToValueAtTime(f * .95, st + .09); og.gain.setValueAtTime(.0001, st); og.gain.exponentialRampToValueAtTime(.025, st + .01); og.gain.exponentialRampToValueAtTime(.0001, st + .09); o.connect(og); og.connect(g); o.start(st); o.stop(st + .1); } }, 1700 + Math.random() * 900);
      return { g, stop() { clearInterval(birds); g.gain.setTargetAtTime(0, audio.currentTime, .2); setTimeout(() => { for (const o of [wind, lfo, ...pads]) { try { o.stop(); } catch (_) {} } }, 900); } };
    }
    function startEnding() {
      // 조이던 것이 한 번에 놓인다: 소리 전부 끊고(0.5초 정적) → 위아래 검은 띠가 걷히며 풀밭 → AI 메이드 인사.
      ending = { t: 0, said: false, opened: false, sent: false, sound: null };
      clearLures(); cutAllSound(); stopHum(); knocking = false; $('notice').classList.remove('on');
      setBars(.19, false);
      setPhase('meadow');
    }
    function stepEnding(dt) {
      const e = ending; e.t += dt;
      if (!e.opened && e.t >= .5) { e.opened = true; void bars.offsetHeight; setBars(0, true); e.sound = startMeadowSound(); }
      if (!e.said && e.t >= 2.9) { e.said = true; say('maid'); caption.textContent = '좋은 꿈 꾸세요, 할아버지.'; caption.classList.add('on'); }
      if (!e.sent && e.t >= 8.6) { e.sent = true; if (parent !== window) parent.postMessage({ channel: 'speedrun-midterm-v1', type: 'complete' }, '*'); }
      const c = meadow.getContext('2d'); drawMeadow(c, e.t + 40);
      const veil = Math.max(0, Math.min(1, 1 - (e.t - .5) / 1.3)); if (veil > 0) { c.fillStyle = `rgba(0,0,0,${veil})`; c.fillRect(0, 0, W, H); }
    }
    function stopEnding() {
      if (!ending) return; ending.sound?.stop(); ending = null; caption.classList.remove('on'); caption.textContent = ''; setBars(0, false);
    }

    return {
      resize: resizeDream,
      schedule,
      begin() { lastScan = 0; nextMumble = 1.2; nextSquelch = 0; nextBreath = 0; lastCreak = -1; startLoops(); },
      clear() { // 손을 떼거나 페이즈를 바꿀 때
        for (const k of Object.keys(fx)) fx[k] = typeof fx[k] === 'boolean' ? false : 0;
        label(0); stopDrone(); stopLoops(); if (!ending) setBars(0, false); clearDream();
      },
      stopEnding,
      finish() { if (stagePhase !== 2) return false; startEnding(); return true; },
      step(dt, realDt) {
        t += realDt;
        if (ending) { stepEnding(realDt); return; }
        if (phase !== 'scan') { clearDream(); return; }
        const k = scan;
        if (k < lastScan - .5) { nextMumble = 1.2; nextSquelch = 0; nextBreath = 0; }
        lastScan = k;
        if (!loops && audio) startLoops();
        for (const key of ['invert', 'flick']) if (fx[key] > 0) fx[key] -= realDt;
        if (fx.eye > 0 && fx.eye < 1) fx.eye = Math.min(1, fx.eye + realDt / .12);
        if (stagePhase === 2 && k >= 72) { fx.tight = Math.min(1, (k - 72) / 16); setBars(.19 * fx.tight * fx.tight * (3 - 2 * fx.tight), false); if (Math.random() < realDt * fx.tight * 2.5) fx.flick = .05 + Math.random() * .07; }
        ambient(k, dt);
        render(k);
      }
    };
  })();

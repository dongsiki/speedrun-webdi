/* 첫 클리어 이후의 인트로 글리치(2026-10-26, Claude Code).
   첫 인트로(1페이즈)는 병맛 그대로. 2페이즈부터 같은 변신 영상 위로 화면이 찢기고 멈칫한다.
   영상 파일·변신 인트로 코드는 바꾸지 않고 위에 캔버스를 덧댄다. */
(() => {
  'use strict';
  const P = window.SpeedrunPhase, intro = window.TransformationIntro;
  if (!P || !intro || P.state.phase < 2 || !intro.active) return;
  if (P.state.phase === 2 && P.state.run2.length >= P.games.length - 1) return; // 점프스케어 직전 한 판은 조용히
  const dialog = document.querySelector('dialog.transformation-intro');
  const video = dialog && dialog.querySelector('video');
  if (!video) return;
  const strong = P.state.phase >= 3;
  const canvas = document.createElement('canvas');
  canvas.className = 'phase-intro-glitch';
  canvas.setAttribute('aria-hidden', 'true');
  dialog.append(canvas);
  const g = canvas.getContext('2d');
  let raf = 0, burstUntil = 0, nextBurst = performance.now() + 900, frozenUntil = 0, lastFlip = 0;
  function rect() {
    const W = canvas.width = innerWidth, H = canvas.height = innerHeight;
    const vw = video.videoWidth || 540, vh = video.videoHeight || 960;
    const s = Math.min(W / vw, H / vh);
    return { W, H, s, x: (W - vw * s) / 2, y: (H - vh * s) / 2, vw, vh };
  }
  function tear(r, amount) {
    g.clearRect(0, 0, r.W, r.H);
    const bands = 3 + Math.floor(amount * 9);
    for (let i = 0; i < bands; i++) {
      const sy = Math.random() * r.vh, sh = 8 + Math.random() * (40 + amount * 160);
      const dx = (Math.random() - .5) * (30 + amount * 260);
      g.filter = Math.random() < .35 + amount * .3 ? 'invert(1)' : 'none';
      g.drawImage(video, 0, sy, r.vw, sh, r.x + dx, r.y + sy * r.s, r.vw * r.s, sh * r.s);
      if (Math.random() < .3 * amount) { // 같은 띠가 반복된다
        g.drawImage(video, 0, sy, r.vw, sh, r.x - dx * .5, r.y + (sy + sh) * r.s, r.vw * r.s, sh * r.s);
      }
    }
    g.filter = 'none';
    if (Math.random() < amount * .5) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(0, Math.random() * r.H, r.W, 2 + Math.random() * 10); }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!intro.active) { stop(); return; }
    const progress = video.duration ? video.currentTime / video.duration : 0;
    const base = strong ? .55 : .25;
    const amount = Math.min(1, base + progress * .6);
    if (now >= nextBurst && now > burstUntil) {
      burstUntil = now + 70 + Math.random() * (160 + amount * 380);
      nextBurst = burstUntil + (strong ? 250 : 500) + Math.random() * (2600 * (1 - amount) + 300);
      if (window.PhaseFX) PhaseFX.crackle(.08 + Math.random() * .25, .12 + amount * .25);
      if (window.IntroMusic) IntroMusic.glitch(burstUntil - now, amount); // 10/26: 같은 순간 음악도 깨진다
      if (Math.random() < .35 + amount * .3 && !video.paused) { // 렉 걸린 듯 멈칫
        frozenUntil = now + 120 + Math.random() * 420; video.pause();
      }
      if (Math.random() < .25 * amount && video.currentTime > .6) video.currentTime -= .25 + Math.random() * .4; // 한 박자 되감김
    }
    if (frozenUntil && now >= frozenUntil) { frozenUntil = 0; video.play().catch(() => {}); }
    const r = rect();
    if (now < burstUntil) {
      tear(r, amount);
      if (now - lastFlip > 90 && Math.random() < .4) { lastFlip = now; video.style.filter = video.style.filter ? '' : 'invert(1) contrast(1.4)'; }
      video.style.transform = `translate(${(Math.random() - .5) * 24 * amount}px, ${(Math.random() - .5) * 10 * amount}px)`;
    } else {
      g.clearRect(0, 0, r.W, r.H);
      video.style.filter = ''; video.style.transform = '';
    }
  }
  function stop() {
    cancelAnimationFrame(raf);
    canvas.remove(); video.style.filter = ''; video.style.transform = '';
  }
  raf = requestAnimationFrame(loop);
  window.addEventListener('transformationintro:end', stop, { once: true });
})();

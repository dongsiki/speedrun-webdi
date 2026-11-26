/* 실패 축하(2026-11-26, Claude Code).
   사용자 11/25 「실패할 때 간혹가다가 폭죽이나 박수를 치면서 실패했다고 축하하는 거 넣어주고」,
   11/26 「ㅇㅋ 실패 축하 함 넣어봐」「박수소리도 넣고」「일단 넣고 수정하자고」, 되묻기에 「ㅇㅋ 해봐 이것도」(13:43 KST).
   미니게임이 실패(fail)를 알리면 4번 중 1번쯤: 폭죽(색종이·불꽃) 약 3초 + 박수 소리 약 3초 + 위쪽 자막 「실패 축하드려요!」.
   박수 소리는 바깥 소리 파일 없이 여기서 잡음으로 만든다. 본편 01·개발자용 02 껍데기에 같은 파일을 넣는다.
   스테이지는 iframe 안에 있어 실패 알림이 안쪽 창에 갈 수 있으므로, 안쪽 창(같은 출처)에도 귀를 단다. */
(() => {
  'use strict';
  if (window.FailParty) return;
  const channel = 'speedrun-midterm-v1';
  const state = { chance: 0.25, count: 0 };
  const LONG = 3200;
  let lastFail = -1e9, lastParty = -1e9, ctx = null, running = false;

  // --- 실패 알림 듣기 ---
  function onMessage(event) {
    const d = event.data;
    if (!d || d.channel !== channel || d.type !== 'fail') return;
    const now = performance.now();
    if (now - lastFail < 1500) return; // 같은 실패가 겹쳐 온 것
    lastFail = now;
    if (running || now - lastParty < 6000) return; // 바로 이어서는 다시 안 함
    if (Math.random() >= state.chance) return;
    play();
  }
  const hooked = new WeakSet();
  function hook(w) {
    if (!w || hooked.has(w)) return;
    try { w.addEventListener('message', onMessage, true); hooked.add(w); } catch (_) {}
  }
  function walk(w, depth) {
    hook(w);
    if (depth > 4) return;
    try { for (const f of w.document.querySelectorAll('iframe')) walk(f.contentWindow, depth + 1); } catch (_) {}
  }
  hook(window);
  setInterval(() => walk(window, 0), 700);

  // --- 박수 소리(잡음으로 만든 손뼉 여러 사람) ---
  function applause() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = ctx || new AC();
      if (ctx.state === 'suspended') ctx.resume();
      const sr = ctx.sampleRate, sec = 3.2, len = Math.floor(sr * sec);
      const buf = ctx.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
      const env = t => Math.min(1, t / 0.12) * Math.min(1, Math.max(0, (sec - t) / 0.9));
      for (let p = 0; p < 22; p++) {
        const rate = 3.6 + Math.random() * 2.4, pan = Math.random(), g = 0.45 + Math.random() * 0.55;
        const tone = 0.004 + Math.random() * 0.004; // 손바닥마다 다른 울림
        for (let t = Math.random() * 0.25; t < sec - 0.05; t += (1 / rate) * (0.85 + Math.random() * 0.3)) {
          const a = g * env(t), start = Math.floor(t * sr), n = Math.floor(sr * 0.03);
          for (let k = 0; k < 3; k++) { // 손뼉 한 번 = 아주 짧은 터짐 2~3개
            const s0 = start + Math.floor(k * sr * 0.0015), kk = k ? 0.5 : 1;
            for (let i = 0; i < n && s0 + i < len; i++) {
              const v = (Math.random() * 2 - 1) * Math.exp(-i / (sr * tone)) * a * kk;
              L[s0 + i] += v * (1 - pan * 0.7); R[s0 + i] += v * (0.3 + pan * 0.7);
            }
          }
        }
      }
      let peak = 0;
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      const norm = peak ? 0.9 / peak : 1;
      for (let i = 0; i < len; i++) { L[i] *= norm; R[i] *= norm; }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
      const bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 1800; bp.gain.value = 5; bp.Q.value = 0.8;
      const vol = ctx.createGain(); vol.gain.value = 0.6;
      src.connect(hp); hp.connect(bp); bp.connect(vol); vol.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  // --- 폭죽(양쪽 아래 폭죽 + 위쪽 불꽃 세 번) ---
  const COLORS = ['#ff3b6b', '#ffd23f', '#3bceac', '#4d8cff', '#b45cff', '#ff8a3d', '#ffffff'];
  function confetti() {
    const cv = document.createElement('canvas');
    cv.id = 'fail-party';
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483200;pointer-events:none';
    document.body.append(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const parts = [];
    const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];
    function popper(x, dir) { // 아래 모서리에서 안쪽 위로
      for (let i = 0; i < 90; i++) {
        const ang = (-Math.PI / 2) + dir * (0.25 + Math.random() * 0.55), sp = 9 + Math.random() * 11;
        parts.push({ kind: 'paper', x, y: H + 5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: pick(), life: 1 });
      }
    }
    function burst(x, y) { // 불꽃 한 송이
      const c = pick(), n = 60;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2, sp = 3 + Math.random() * 3.5;
        parts.push({ kind: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, c: Math.random() < 0.2 ? '#ffffff' : c, life: 1, fade: 0.012 + Math.random() * 0.01 });
      }
    }
    popper(0, 1); popper(W, -1);
    const plan = [[180, 0.25, 0.25], [650, 0.72, 0.2], [1150, 0.5, 0.32]];
    const t0 = performance.now(); let fired = 0;
    function frame(now) {
      const t = now - t0;
      while (fired < plan.length && t >= plan[fired][0]) { burst(W * plan[fired][1], H * plan[fired][2]); fired++; }
      g.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (p.kind === 'paper') {
          p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.25; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          if (t > LONG - 700) p.life = Math.max(0, p.life - 0.03);
          const s = Math.abs(Math.cos(p.r * 2));
          g.save(); g.globalAlpha = p.life; g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
          g.fillRect(-p.w / 2, -p.h * s / 2, p.w, p.h * s + 0.5); g.restore();
        } else {
          p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.06; p.x += p.vx; p.y += p.vy; p.life -= p.fade;
          if (p.life <= 0) continue;
          g.globalAlpha = p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
      }
      if (t < LONG) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
  }

  // --- 위쪽 자막 ---
  function banner() {
    const b = document.createElement('div');
    b.id = 'fail-party-line'; b.setAttribute('role', 'status');
    b.textContent = '실패 축하드려요!';
    b.style.cssText = 'position:fixed;left:50%;top:13vh;transform:translateX(-50%);z-index:2147483201;pointer-events:none;margin:0;padding:.25em .7em;'
      + 'font:800 clamp(30px,5.5vw,56px)/1.2 "Malgun Gothic",sans-serif;color:#fff;background:#ff3b6b;border:3px solid #fff;border-radius:14px;'
      + 'box-shadow:0 6px 0 #b8204a,0 10px 24px rgba(0,0,0,.35);white-space:nowrap;letter-spacing:.02em';
    document.body.append(b);
    try {
      b.animate([
        { transform: 'translateX(-50%) scale(.3) rotate(-8deg)', opacity: 0 },
        { transform: 'translateX(-50%) scale(1.12) rotate(3deg)', opacity: 1, offset: 0.12 },
        { transform: 'translateX(-50%) scale(1) rotate(-2deg)', opacity: 1, offset: 0.2 },
        { transform: 'translateX(-50%) scale(1.04) rotate(2deg)', opacity: 1, offset: 0.5 },
        { transform: 'translateX(-50%) scale(1) rotate(-1deg)', opacity: 1, offset: 0.85 },
        { transform: 'translateX(-50%) scale(.9)', opacity: 0 },
      ], { duration: LONG, easing: 'ease-out', fill: 'forwards' });
    } catch (_) {}
    setTimeout(() => b.remove(), LONG + 50);
  }

  function play() {
    if (!document.body || running) return;
    running = true; lastParty = performance.now(); state.count++;
    confetti(); banner(); applause();
    setTimeout(() => { running = false; }, LONG + 100);
  }

  window.FailParty = {
    play,
    get chance() { return state.chance; }, set chance(v) { state.chance = Number(v); },
    get count() { return state.count; },
  };
})();

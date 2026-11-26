/* 02 「실패 시안」(2026-11-26, Claude Code).
   사용자 11/26 13:48 「실패 축하드려요 말고 실패 축하!로 변경」, 13:49 구름자막 「각 글마다 1초 … 3초 띄우자. 즉, 자막이 3번 나오는 거지」,
   13:50 「채팅창에서 스트리머가 실패했을 때 시청자가 할법한 말 … 비꼬는 말들」, 13:51 「방송은 아니니까, 그런 류는 제외하고」,
   14:13 「개발자용에다가 따로 실패시안을 추가해서 어떤지 함 보게 해줘」, 되묻기에 14:14 「ㅇㅇ」.
   폭죽·박수 소리(지금 게임 속 실패 축하 src/phase/fail-party.js와 같음) + 큰 자막 「실패 축하!」 + 비꼬는 구름자막 3줄(1초씩, 서로 다른 자리).
   구름 글자 모습: 티비플 구름(흰 굵은 고딕, 1px 어두운 테두리, 바탕 없음, 제자리에 떴다가 약 0.1초 투명해지며 사라짐, 글자 높이 화면의 약 1/30).
   게임 속(01·02) 실패 축하는 아직 이 시안으로 바꾸지 않았다. */
(() => {
  'use strict';
  const LONG = 3200;
  const CLOUDS = [
    '병신 이걸 못깨노',
    'ㅋㅋㅋㅋ 이걸 죽네',
    '손가락 장식임?',
    '이걸 왜 못 함?',
    '눈 감고 함?',
    '할배가 해도 이거보단 잘함',
    '이게 스피드런이냐',
    '짝짝짝 ㅋㅋㅋㅋ',
    '실패 축하드립니다~',
    '와 진짜 개못하네',
  ];
  // 구름 자리(화면 비율). 큰 자막(위 가운데)과 겹치지 않는 곳 6군데에서 3군데를 고른다.
  const SPOTS = [[0.08, 0.40], [0.58, 0.38], [0.30, 0.55], [0.06, 0.70], [0.55, 0.68], [0.36, 0.82]];
  let ctx = null, running = false, timers = [];

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
        const tone = 0.004 + Math.random() * 0.004;
        for (let t = Math.random() * 0.25; t < sec - 0.05; t += (1 / rate) * (0.85 + Math.random() * 0.3)) {
          const a = g * env(t), start = Math.floor(t * sr), n = Math.floor(sr * 0.03);
          for (let k = 0; k < 3; k++) {
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

  const COLORS = ['#ff3b6b', '#ffd23f', '#3bceac', '#4d8cff', '#b45cff', '#ff8a3d', '#ffffff'];
  function confetti() {
    const cv = document.createElement('canvas');
    cv.className = 'fail-draft-fx';
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:20;pointer-events:none';
    document.body.append(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const parts = [], pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];
    function popper(x, dir) {
      for (let i = 0; i < 90; i++) {
        const ang = (-Math.PI / 2) + dir * (0.25 + Math.random() * 0.55), sp = 9 + Math.random() * 11;
        parts.push({ kind: 'paper', x, y: H + 5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: pick(), life: 1 });
      }
    }
    function burst(x, y) {
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

  function banner() {
    const b = document.createElement('div');
    b.className = 'fail-draft-fx fail-draft-banner';
    b.textContent = '실패 축하!';
    b.style.cssText = 'position:fixed;left:50%;top:13vh;transform:translateX(-50%);z-index:21;pointer-events:none;margin:0;padding:.25em .7em;'
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
    timers.push(setTimeout(() => b.remove(), LONG + 50));
  }

  // 구름자막: 서로 다른 말 3개를 1초씩, 서로 다른 자리에 하나씩.
  function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function clouds() {
    const words = shuffle(CLOUDS).slice(0, 3), spots = shuffle(SPOTS).slice(0, 3);
    words.forEach((text, i) => {
      timers.push(setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'fail-draft-fx fail-draft-cloud';
        c.textContent = text;
        const [x, y] = spots[i];
        c.style.left = ((x + Math.random() * 0.06) * 100) + 'vw';
        c.style.top = ((y + Math.random() * 0.04) * 100) + 'vh';
        document.body.append(c);
        timers.push(setTimeout(() => { c.style.opacity = '0'; }, 1000));
        timers.push(setTimeout(() => c.remove(), 1120));
      }, 150 + i * 1000));
    });
  }

  function play() {
    for (const t of timers) clearTimeout(t);
    timers = [];
    document.querySelectorAll('.fail-draft-fx').forEach(el => el.remove());
    running = true;
    confetti(); banner(); clouds(); applause();
    timers.push(setTimeout(() => { running = false; }, LONG + 100));
  }

  window.FailDraft = { play, clouds: CLOUDS, get running() { return running; } };
})();

/* 변신 인트로 음악(2026-10-26, Claude Code).
   마법소녀 변신 분위기의 10초짜리 새 곡. 원곡 멜로디는 쓰지 않았다(D장조, 직접 쓴 화성·선율).
   소리 파일 없이 브라우저가 코드로 합성한다. 같은 코드를 node로 돌리면 들어 볼 수 있는 wav가 나온다
   (scripts/render-intro-music.cjs).
   2페이즈부터 인트로 화면이 찢길 때는 음악도 같은 순간에 깨진 소리판(비트 깎기·끊김·되감김)으로 바뀐다. */
(function () {
  'use strict';
  const LENGTH = 10;          // 영상 길이(초)
  const VOLUME = 0.42;        // 브라우저 최종 음량(작게)
  const BPM = 120, BEAT = 60 / BPM, START = 1.0;   // 1초 반짝임 뒤 4박 마디 시작
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const TAU = Math.PI * 2;

  // 시드 고정 난수(매번 같은 곡이 나오게)
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // 화성: [시작 박, 길이 박, 근음(베이스), 화음 구성음]
  const CHORDS = [
    [0, 4, 50, [62, 66, 69, 73]],      // Dmaj7
    [4, 4, 47, [59, 62, 66, 69]],      // Bm7
    [8, 2, 43, [59, 62, 66, 67]],      // Gmaj7
    [10, 1, 45, [62, 64, 67, 69]],     // A7sus4
    [11, 1, 45, [61, 64, 67, 69]],     // A7
    [12, 1, 46, [58, 62, 65, 70]],     // B♭
    [13, 1, 48, [60, 64, 67, 72]],     // C
    [14, 4, 50, [62, 64, 66, 69, 74]]  // D add9(변신 완성)
  ];
  // 선율: [시작 박, 길이 박, 음]
  const MELODY = [
    [0, 1, 81], [1, .5, 78], [1.5, .5, 81], [2, 1.5, 85], [3.5, .5, 83],
    [4, 1, 81], [5, .5, 78], [5.5, .5, 74], [6, 2, 78],
    [8, .5, 79], [8.5, .5, 81], [9, 1, 83], [10, .5, 86], [10.5, .5, 88], [11, 1, 85],
    [12, 1, 86], [13, 1, 88], [14, 3.6, 90]
  ];
  const bt = b => START + b * BEAT;

  // 합성. 오래 걸리지 않게 중간중간 쉬어 갈 수 있도록 제너레이터로 만든다.
  function* renderSteps(sr) {
    const N = Math.ceil(LENGTH * sr);
    const L = new Float32Array(N), R = new Float32Array(N);
    const rand = rng(20261026);
    function add(t0, dur, pan, gain, fn) {
      const a = Math.max(0, Math.floor(t0 * sr)), b = Math.min(N, Math.floor((t0 + dur) * sr));
      const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
      for (let i = a; i < b; i++) { const v = fn((i - a) / sr); L[i] += v * gl; R[i] += v * gr; }
    }
    // 오르골 종소리(FM)
    const bell = (f, decay) => t => {
      const idx = 2.2 * Math.exp(-t / 0.08) + 0.25;
      return Math.sin(TAU * f * t + idx * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.003) * Math.exp(-t / decay);
    };
    // 첼레스타 같은 선율 소리
    const celesta = (f, len) => t => {
      const env = Math.min(1, t / 0.005) * Math.exp(-t / 0.7) * (t > len ? Math.exp(-(t - len) / 0.12) : 1);
      return (Math.sin(TAU * f * t + 1.1 * Math.exp(-t / 0.15) * Math.sin(TAU * 4 * f * t)) + 0.22 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.25)) * env;
    };
    // 하프 퉁김
    const harp = f => t => (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.15) + 0.15 * Math.sin(TAU * 3 * f * t) * Math.exp(-t / 0.08)) * Math.min(1, t / 0.002) * Math.exp(-t / 0.45);
    // 반짝임 한 점
    const ping = f => t => Math.sin(TAU * f * t) * Math.min(1, t / 0.002) * Math.exp(-t / 0.05);

    // 1) 첫 1초: 하프 글리산도 + 반짝임
    const gliss = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93];
    gliss.forEach((m, i) => add(0.08 + i * 0.062, 1.2, -0.6 + i * 0.09, 0.11, harp(hz(m))));
    yield;
    for (let i = 0; i < 18; i++) { const t = 0.15 + rand() * 0.95; add(t, 0.3, rand() * 2 - 1, 0.035, ping(2200 + rand() * 2600)); }

    // 2) 화음 패드(부드럽게 부풀었다 사라짐)
    for (const [b, len, , tones] of CHORDS) {
      const t0 = bt(b), dur = len * BEAT, isEnd = b === 14;
      tones.forEach((m, k) => {
        const f = hz(m), pan = -0.5 + k / Math.max(1, tones.length - 1);
        for (const det of [-0.0025, 0.0025]) {
          const ff = f * (1 + det), att = isEnd ? 0.08 : 0.18, rel = isEnd ? 0.5 : 0.35, total = isEnd ? LENGTH - t0 : dur + rel;
          add(t0, total, pan * 0.8, isEnd ? 0.045 : 0.038, t => {
            const env = Math.min(1, t / att) * (isEnd ? Math.max(0, 1 - Math.max(0, t - (total - 1.2)) / 1.2) : (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1));
            return (Math.sin(TAU * ff * t) + 0.3 * Math.sin(TAU * 2 * ff * t) + 0.12 * Math.sin(TAU * 3 * ff * t)) * env;
          });
        }
      });
      yield;
    }

    // 3) 16분음표 종소리 아르페지오(변신 완성 전까지)
    for (const [b, len, , tones] of CHORDS) {
      if (b >= 14) break;
      const pool = [...tones, ...tones.map(m => m + 12)];
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 2, 3];
      for (let s = 0; s < len * 4; s++) {
        const m = pool[order[s % order.length] % pool.length] + 12;
        add(bt(b) + s * BEAT / 4, 0.8, (s % 2 ? 0.45 : -0.45), 0.05 + (b >= 12 ? 0.015 : 0), bell(hz(m), 0.25));
      }
      yield;
    }

    // 4) 선율
    for (const [b, len, m] of MELODY) {
      const dur = len * BEAT, last = b === 14;
      add(bt(b), Math.min(LENGTH - bt(b), dur + (last ? 1.2 : 0.5)), 0.05, last ? 0.15 : 0.13, celesta(hz(m), dur));
    }
    yield;

    // 5) 베이스(근음, 1·3박) + 아주 작은 북·찰랑이
    for (const [b, len, root] of CHORDS) {
      const end = b === 14;
      for (let k = 0; k < len; k += (end ? 4 : 2)) {
        const f = hz(root), t0 = bt(b + k), dur = end ? LENGTH - t0 : Math.min(len - k, 2) * BEAT;
        add(t0, dur, 0, 0.2, t => (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.01) * (0.55 + 0.45 * Math.exp(-t / 0.25)) * Math.max(0, Math.min(1, (dur - t) / 0.08)));
        if (!end && b < 12) {
          let ph = 0;
          add(t0, 0.25, 0, 0.22, t => { const f0 = 45 + 70 * Math.exp(-t / 0.03); ph += f0 / sr; return Math.sin(TAU * ph) * Math.exp(-t / 0.1); });
        }
      }
    }
    for (let b = 0; b < 12; b++) {   // 뒷박 찰랑이
      let prev = 0;
      add(bt(b + 0.5), 0.08, 0.3, 0.05, t => { const n = rand() * 2 - 1, v = n - prev; prev = n; return v * Math.exp(-t / 0.02); });
    }
    yield;

    // 6) 7초~8초: 올라가는 반짝임 + 작은 북 굴림(B♭ → C → 변신)
    const lift = [70, 72, 74, 76, 77, 79, 81, 82, 84, 86, 88, 89, 91, 93, 94, 96];
    lift.forEach((m, i) => add(bt(12) + i * BEAT * 2 / lift.length, 0.6, -0.7 + i * 0.09, 0.06, harp(hz(m))));
    for (let s = 0; s < 8; s++) {
      let prev = 0; const g = 0.025 + s * 0.006;
      add(bt(12) + s * BEAT / 4, 0.09, 0, g, t => { const n = rand() * 2 - 1, v = n - prev * 0.5; prev = n; return v * Math.exp(-t / 0.04); });
    }
    // 바람처럼 부푸는 소리(처음과 변신 직전)
    for (const [t0, dur] of [[0, 1.0], [bt(12), 2 * BEAT]]) {
      let lp = 0;
      add(t0, dur, 0, 0.05, t => { const p = t / dur, c = 0.02 + p * 0.25; lp += c * ((rand() * 2 - 1) - lp); return lp * p * p * 3; });
    }
    yield;

    // 7) 변신 완성(8초): 종 두 번 + 반짝임 소나기 + 얇은 심벌
    for (const [m, g, d] of [[74, 0.2, 2.2], [86, 0.12, 1.6]]) {
      const f = hz(m);
      add(bt(14), LENGTH - bt(14), 0, g, t => {
        const parts = [[1, 1, d], [2.76, 0.5, d * 0.5], [5.4, 0.25, d * 0.3], [8.93, 0.12, d * 0.2]];
        let v = 0; for (const [r, a, dd] of parts) v += a * Math.sin(TAU * f * r * t) * Math.exp(-t / dd);
        return v * Math.min(1, t / 0.002) * Math.max(0, Math.min(1, (LENGTH - bt(14) - t) / 0.3));
      });
    }
    {
      let prev = 0;
      add(bt(14), 1.9, 0, 0.035, t => { const n = rand() * 2 - 1, v = n - prev; prev = n; return v * Math.exp(-t / 0.9); });
    }
    for (let i = 0; i < 40; i++) {
      const t = bt(14) + Math.pow(rand(), 1.6) * 1.8;
      add(t, 0.3, rand() * 2 - 1, 0.03 * (1 - (t - bt(14)) / 2.2), ping(2600 + rand() * 3000));
    }
    yield;

    // 8) 잔향(작은 방 정도)
    for (const [ch, off] of [[L, 0], [R, 23]]) {
      const scale = sr / 44100, wet = new Float32Array(N);
      for (const d0 of [1116, 1188, 1277, 1356]) {
        const d = Math.round((d0 + off) * scale), buf = new Float32Array(d); let p = 0, lp = 0;
        for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.7 + lp * 0.3; buf[p] = ch[i] + lp * 0.78; p = (p + 1) % d; wet[i] += y * 0.25; }
      }
      for (const d0 of [556, 441]) {
        const d = Math.round((d0 + off) * scale), buf = new Float32Array(d); let p = 0;
        for (let i = 0; i < N; i++) { const b = buf[p], x = wet[i]; buf[p] = x + b * 0.5; wet[i] = b - x; p = (p + 1) % d; }
      }
      for (let i = 0; i < N; i++) ch[i] += wet[i] * 0.22;
      yield;
    }

    // 9) 마무리: 부드럽게 눌러 주고 크기 맞추기, 끝은 0으로
    let peak = 0;
    for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
    const k = 0.6 / (peak || 1), fadeIn = Math.floor(0.004 * sr), fadeOut = Math.floor(0.25 * sr);
    for (let i = 0; i < N; i++) {
      let g = k;
      if (i < fadeIn) g *= i / fadeIn;
      if (i > N - fadeOut) g *= (N - i) / fadeOut;
      L[i] *= g; R[i] *= g;
    }
    return { L, R, sr };
  }

  // 깨진 소리판: 같은 곡을 비트 깎기·샘플 뭉개기·조각 반복·뒤집기·속도 튐·끊김으로 망가뜨린 것.
  function datamosh(src) {
    const { L, R, sr } = src, N = L.length;
    const oL = new Float32Array(N), oR = new Float32Array(N);
    const rand = rng(404);
    let i = 0, srcRms = 0, outRms = 0;
    while (i < N) {
      const len = Math.min(N - i, Math.floor(sr * (0.03 + rand() * 0.09)));
      const mode = Math.floor(rand() * 6);
      const bits = 2 + Math.floor(rand() * 3), q = Math.pow(2, bits - 1), hold = 4 + Math.floor(rand() * 18);
      const back = Math.floor(sr * (0.02 + rand() * 0.06)), rate = rand() < 0.5 ? 0.5 : 2;
      const buzz = 50 + rand() * 90;
      for (let j = 0; j < len; j++) {
        let s;
        if (mode === 0) s = i + j - (j % hold);                       // 샘플 뭉개기
        else if (mode === 1) s = Math.max(0, i - back) + (j % back);  // 같은 조각 반복(끊김)
        else if (mode === 2) s = i + len - 1 - j;                     // 뒤집기
        else if (mode === 3) s = i + Math.floor(j * rate) % len;      // 속도 튐
        else s = i + j;
        s = Math.min(N - 1, Math.max(0, s));
        let a = L[s], b = R[s];
        if (mode !== 5) { a = Math.round(a * q) / q; b = Math.round(b * q) / q; }   // 비트 깎기
        if (mode === 4) { const sq = Math.sin(TAU * buzz * j / sr) > 0 ? 0.08 : -0.08; a = a * 0.25 + sq; b = b * 0.25 + sq; } // 디지털 웅
        if (mode === 5) { a *= 0.08; b *= 0.08; }                    // 순간 끊김
        oL[i + j] = a; oR[i + j] = b;
      }
      i += len;
    }
    for (let k = 0; k < N; k++) { srcRms += L[k] * L[k]; outRms += oL[k] * oL[k]; }
    const g = Math.min(1.2, 0.85 * Math.sqrt(srcRms / (outRms || 1)));
    for (let k = 0; k < N; k++) { oL[k] = Math.max(-0.7, Math.min(0.7, oL[k] * g)); oR[k] = Math.max(-0.7, Math.min(0.7, oR[k] * g)); }
    return { L: oL, R: oR, sr };
  }

  function renderSync(sr) { const it = renderSteps(sr); let r; while (!(r = it.next()).done); return r.value; }

  if (typeof module !== 'undefined' && module.exports) module.exports = { renderSync, datamosh, LENGTH, VOLUME };
  if (typeof window === 'undefined') return;

  // ---------- 브라우저: 인트로 영상에 맞춰 재생 ----------
  let current = null;
  function create(video, dialog) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !video) return null;
    let ctx;
    try { ctx = new AC(); } catch (_) { return null; }
    const master = ctx.createGain(), cleanG = ctx.createGain(), moshG = ctx.createGain(), stutG = ctx.createGain();
    master.gain.value = VOLUME; moshG.gain.value = 0; stutG.gain.value = 0.8;
    cleanG.connect(master); moshG.connect(master); stutG.connect(master); master.connect(ctx.destination);
    let clean = null, mosh = null, sources = [], loopSrc = null, dead = false, startCtx = 0, startOff = 0, glitchTimer = 0;

    function toBuffer(d) { const b = ctx.createBuffer(2, d.L.length, d.sr); b.copyToChannel(d.L, 0); b.copyToChannel(d.R, 1); return b; }
    function stopSources() {
      for (const s of sources) { try { s.stop(); } catch (_) {} try { s.disconnect(); } catch (_) {} }
      sources = [];
      if (loopSrc) { try { loopSrc.stop(); } catch (_) {} try { loopSrc.disconnect(); } catch (_) {} loopSrc = null; }
    }
    function playing() { return !video.paused && !video.ended && video.readyState > 2; }
    function startAt(off) {
      if (dead || !clean || ctx.state !== 'running') return;
      stopSources();
      if (off >= LENGTH - 0.02) return;
      const t = ctx.currentTime + 0.005;
      for (const [buf, g] of [[clean, cleanG], [mosh, moshG]]) {
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(g); s.start(t, Math.max(0, off)); sources.push(s);
      }
      startCtx = t; startOff = off;
    }
    function sync() { if (playing()) startAt(video.currentTime); }
    // 영상이 렉 걸린 듯 멈추면 음악도 그 자리 조각을 깨진 채로 되풀이한다.
    function stutter() {
      if (dead || !mosh || ctx.state !== 'running' || video.ended) return;
      stopSources();
      const off = Math.min(LENGTH - 0.05, video.currentTime), len = 0.05 + Math.random() * 0.08;
      const s = ctx.createBufferSource(); s.buffer = mosh; s.loop = true;
      s.loopStart = Math.max(0, off - len); s.loopEnd = Math.max(len, off);
      s.playbackRate.value = 0.8 + Math.random() * 0.4;
      s.connect(stutG); s.start(ctx.currentTime, s.loopStart); loopSrc = s;
    }
    // 화면이 찢기는 동안(ms) 깨진 소리판으로 바꾸고, 가끔 테이프 늘어지듯 느려진다.
    function glitch(ms, amount = 0.5) {
      if (dead || !clean || ctx.state !== 'running') return;
      const now = ctx.currentTime, end = now + ms / 1000;
      cleanG.gain.cancelScheduledValues(now); moshG.gain.cancelScheduledValues(now);
      cleanG.gain.setValueAtTime(Math.random() < 0.3 ? 0.15 : 0, now); moshG.gain.setValueAtTime(1, now);
      cleanG.gain.setValueAtTime(1, end); moshG.gain.setValueAtTime(0, end);
      if (Math.random() < 0.25 + amount * 0.35) {
        const to = Math.random() < 0.7 ? 0.35 + Math.random() * 0.3 : 1.6;
        for (const s of sources) { s.playbackRate.setValueAtTime(1, now); s.playbackRate.linearRampToValueAtTime(to, end); }
      }
      clearTimeout(glitchTimer);
      glitchTimer = setTimeout(sync, ms + 10);   // 끝나면 영상 위치로 다시 맞춘다
    }
    // 10/27 사용자: '누르면 음악' 표시 없이 자동으로. 브라우저가 소리를 막아 둔 경우에도 글자는 띄우지 않고,
    // 이전 페이지에서 누른 기록(목록·처음 화면에서 클릭해 들어온 경우)이 있으면 바로 나오고, 없으면 첫 입력 순간 그 자리부터 나온다.
    function unlock() {
      if (dead) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
    }
    ctx.onstatechange = () => { if (ctx.state === 'running') sync(); };
    const listeners = [
      ['playing', sync], ['seeked', () => { if (!video.paused) sync(); }],
      ['pause', () => { if (!video.ended && !dead) stutter(); }],
      ['timeupdate', () => {
        if (!sources.length || !playing() || glitchTimer && moshG.gain.value > 0.5) return;
        const expect = startOff + (ctx.currentTime - startCtx);
        if (Math.abs(expect - video.currentTime) > 0.15) sync();
      }]
    ];
    for (const [n, h] of listeners) video.addEventListener(n, h);
    unlock();

    // 합성은 조금씩 나눠서. 영상 시작 전에는 크게(빨리), 재생 중에는 잘게(영상이 끊기지 않게).
    let markReady;
    const readyPromise = new Promise(resolve => { markReady = resolve; });
    (function step(it) {
      const t0 = performance.now(), budget = video.paused ? 60 : 12;
      let r;
      while (!(r = it.next()).done) { if (performance.now() - t0 > budget) return setTimeout(() => step(it), 0); }
      if (dead) return markReady();
      clean = toBuffer(r.value);
      setTimeout(() => { if (!dead) { mosh = toBuffer(datamosh(r.value)); sync(); } markReady(); }, 0);
    })(renderSteps(Math.min(ctx.sampleRate, 44100)));
    // 영상 시작 전에 음악을 준비해 첫 마디부터 같이 나오게 한다(최대 ms까지만 기다림).
    function prepare(ms = 2500) {
      return Promise.race([readyPromise, new Promise(r => setTimeout(r, ms))]).then(() => { unlock(); return ctx.state; });
    }

    function stop(fast) {
      if (dead) return;
      dead = true; clearTimeout(glitchTimer);
      for (const [n, h] of listeners) video.removeEventListener(n, h);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + (fast ? 0.12 : 0.3));
      setTimeout(() => { stopSources(); ctx.close().catch(() => {}); }, 400);
      if (current === api) current = null;
    }
    const api = { unlock, glitch, stop, prepare, get state() { return ctx.state; }, get ready() { return !!clean; } };
    current = api;
    return api;
  }

  window.IntroMusic = Object.freeze({
    create,
    glitch(ms, amount) { if (current) current.glitch(ms, amount); },
    get current() { return current; }
  });
})();

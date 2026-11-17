/* 개발자용 02 전체: 아무 소리도 안 날 때 할배 숨소리(2026-11-17 Claude Code). 본편 01에는 없다.
   사용자(코디네이터 되묻기에 「ㅇㅇ」): 「02 게임 전체에서 아무 소리도 안 나는 때에는 할배 숨소리가 들리게 한다」,
   숨소리는 매뉴얼 사무엘 소리 파일을 가져오지 않고 그 느낌으로 새로 만든 것(assets/audio/phase3/breath.mp3, make-breath.cjs) 하나를 쓴다.
   - 이 페이지와 안에 열린 게임 화면(같은 출처 iframe)을 0.1초마다 살펴, 소리가 하나도 없는 채로 1.5초가 지나면 숨소리를 천천히 키운다.
     다른 소리가 나면 바로 줄여 멈춘다(멈춘 자리부터 다시 이어 숨 쉰다).
   - 소리를 보는 법: ① <audio>·<video>가 소리 켠 채 재생 중인지 ② 웹 오디오는 스피커로 가는 길목에 귀(AnalyserNode)를 달아 실제 크기를 잰다.
     귀를 달기 전에 이미 스피커에 이어진 소리는 재생 시작·끝으로 센다.
   - 사용 전 window.ElderBreathSrc 에 소리 주소를 넣는다. window.ElderBreath.force(true/false)로 장면이 직접 숨소리를 켜고 끌 수 있다(3페 시작 까만 화면). */
(() => {
  'use strict';
  if (window.ElderBreath) return;
  try { if (window.top !== window && window.top.ElderBreath) return; } catch (_) {} // 바깥 02가 이미 맡고 있으면 둘이 같이 숨 쉬지 않게
  const SRC = window.ElderBreathSrc;
  if (!SRC) return;
  const QUIET_MS = 1500, VOL = .6, THRESH = .004;
  //   심전도 삑(960Hz, ai-cling.js·phase3.js 박동)은 소리로 치지 않는다(사용자: 「2는 ㅇㅇ 그렇게 해」, 삑은 그대로 계속 난다).
  const IGNORE_BEAT = true;

  const el = new Audio(); el.src = SRC; el.loop = true; el.preload = 'auto'; el.volume = 0; el.__breath = true;
  const media = new Set(), taps = new Map(), loose = new Set(), beepUntil = new WeakMap();
  let quietSince = performance.now(), forced = false, nextTry = 0;

  const isBeat = (w, n) => n instanceof w.OscillatorNode && n.type === 'sine' && Math.abs(n.frequency.value - 960) < 1;
  function tapOf(w, ctx, connect) {
    let t = taps.get(ctx);
    if (t) return t.node;
    if (!(ctx instanceof w.AudioContext)) return null; // 오프라인 렌더는 소리가 나지 않는다
    try {
      const node = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 1024;
      connect.call(node, ctx.destination); connect.call(node, an);
      t = { node, an, data: new Float32Array(an.fftSize), ctx }; taps.set(ctx, t);
      return node;
    } catch (_) { return null; }
  }
  function patch(w) {
    try { if (w.__breathPatched) return; w.__breathPatched = true; } catch (_) { return; }
    const MP = w.HTMLMediaElement && w.HTMLMediaElement.prototype;
    if (MP) {
      const play = MP.play;
      MP.play = function () { if (!this.__breath) media.add(this); return play.apply(this, arguments); };
    }
    const NP = w.AudioNode && w.AudioNode.prototype, D = w.AudioDestinationNode;
    if (NP && D) {
      const connect = NP.connect, disconnect = NP.disconnect;
      NP.connect = function (dest) {
        if (dest instanceof D) {
          const tap = tapOf(w, dest.context, connect);
          if (tap) { connect.apply(this, [tap, ...[].slice.call(arguments, 1)]); return dest; }
        }
        return connect.apply(this, arguments);
      };
      NP.disconnect = function (dest) {
        if (dest instanceof D && taps.has(dest.context)) {
          try { return disconnect.apply(this, [taps.get(dest.context).node, ...[].slice.call(arguments, 1)]); } catch (_) {}
        }
        return disconnect.apply(this, arguments);
      };
    }
    const SP = w.AudioScheduledSourceNode && w.AudioScheduledSourceNode.prototype;
    if (SP) {
      const start = SP.start;
      SP.start = function () {
        const ctx = this.context;
        if (isBeat(w, this)) beepUntil.set(ctx, performance.now() + 160);
        else if (!taps.has(ctx)) { loose.add(this); this.addEventListener('ended', () => loose.delete(this), { once: true }); }
        return start.apply(this, arguments);
      };
    }
  }
  function windows(w, list = []) {
    list.push(w);
    for (let i = 0; i < w.frames.length; i++) { try { const f = w.frames[i]; void f.document.body; windows(f, list); } catch (_) {} }
    return list;
  }
  function audible(m) {
    if (m.__breath || m.paused || m.ended || m.muted || m.volume < .01 || m.readyState < 2) return false;
    if ('webkitAudioDecodedByteCount' in m && m.currentTime > .6 && m.webkitAudioDecodedByteCount === 0) return false; // 소리 길이 없는 영상
    return true;
  }
  function loud() {
    const now = performance.now();
    for (const w of windows(window)) {
      patch(w);
      try { for (const m of w.document.querySelectorAll('audio,video')) if (audible(m)) return true; } catch (_) {}
    }
    for (const m of media) { if (!m.isConnected && m.paused) media.delete(m); else if (audible(m)) return true; }
    for (const t of taps.values()) {
      if (t.ctx.state !== 'running') continue;
      if (IGNORE_BEAT && (beepUntil.get(t.ctx) || 0) > now) continue;
      t.an.getFloatTimeDomainData(t.data);
      let peak = 0; for (let i = 0; i < t.data.length; i += 2) { const v = Math.abs(t.data[i]); if (v > peak) peak = v; }
      if (peak > THRESH) return true;
    }
    for (const n of loose) if (n.context.state === 'running') return true;
    if (!IGNORE_BEAT) for (const t of taps.values()) if ((beepUntil.get(t.ctx) || 0) > now) return true;
    return false;
  }
  function tick() {
    const now = performance.now();
    if (!forced && loud()) quietSince = now;
    const want = !document.hidden && (forced || now - quietSince >= QUIET_MS);
    if (want) {
      if (el.paused && now >= nextTry) { nextTry = now + 1000; el.play().catch(() => {}); } // 사용자가 한 번 누르기 전에는 브라우저가 막는다 → 1초마다 다시
      el.volume = Math.min(VOL, el.volume + (forced ? .2 : .045));
    } else if (!el.paused) {
      el.volume = Math.max(0, el.volume - .3);
      if (el.volume === 0) el.pause();
    }
  }
  patch(window);
  setInterval(tick, 100);
  window.ElderBreath = {
    force(on) { forced = !!on; if (!on) quietSince = performance.now(); tick(); },
    get playing() { return !el.paused && el.volume > 0; },
    get audio() { return el; }
  };
})();

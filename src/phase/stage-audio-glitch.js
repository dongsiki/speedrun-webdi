/* 게임 원래 소리에 글리치(2026-10-26, Claude Code). 스테이지 문서 맨 앞에 끼워 넣는다.
   WebAudio 소리는 목적지 앞에 디스토션·끊김을 끼우고, <audio> 소리는 음높이 흔들림 + (가능하면) 같은 디스토션을 거친다.
   음량은 압축기로 눌러 원래보다 크지 않게 한다. 사용 여부는 phase.js의 STAGE_SOUND 설정으로 정한다. */
function phaseStageAudioGlitch() {
  'use strict';
  var Native = window.AudioContext || window.webkitAudioContext;
  if (!Native || Native.__phaseGlitch) return;
  var destGet = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination').get;
  function chain(ctx) {
    var real = destGet.call(ctx);
    var drive = ctx.createGain(); drive.gain.value = 4;
    var shaper = ctx.createWaveShaper(), curve = new Float32Array(2048);
    for (var i = 0; i < curve.length; i++) { var x = i / 1024 - 1; curve[i] = Math.round(Math.tanh(x * 10) * 6) / 6; }
    shaper.curve = curve;
    var stutter = ctx.createGain();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 12; comp.attack.value = .003; comp.release.value = .15;
    var level = ctx.createGain(); level.gain.value = .35;
    drive.connect(shaper); shaper.connect(stutter); stutter.connect(comp); comp.connect(level); level.connect(real);
    setInterval(function () { // 가끔 소리가 뚝 끊긴다
      if (ctx.state !== 'running' || Math.random() > .2) return;
      var t = ctx.currentTime; stutter.gain.setValueAtTime(0, t); stutter.gain.setValueAtTime(1, t + .04 + Math.random() * .14);
    }, 450);
    return drive;
  }
  function Glitched(options) {
    var ctx = new Native(options);
    var input = chain(ctx);
    Object.defineProperty(ctx, 'destination', { get: function () { return input; } });
    return ctx;
  }
  Glitched.prototype = Native.prototype; Glitched.__phaseGlitch = true;
  window.AudioContext = Glitched; if (window.webkitAudioContext) window.webkitAudioContext = Glitched;
  var mediaCtx = null;
  document.addEventListener('play', function (event) {
    var el = event.target;
    if (!(el instanceof HTMLMediaElement) || el.__phaseGlitch) return;
    el.__phaseGlitch = true;
    try { el.preservesPitch = false; } catch (_) {}
    try {
      mediaCtx = mediaCtx || new Glitched();
      if (mediaCtx.state === 'suspended') mediaCtx.resume();
      if (mediaCtx.state === 'running') mediaCtx.createMediaElementSource(el).connect(mediaCtx.destination);
    } catch (_) {}
    setInterval(function () { // 음높이가 순간 꺾인다
      if (el.paused || Math.random() > .3) return;
      el.playbackRate = .55 + Math.random() * .9;
      setTimeout(function () { el.playbackRate = 1; }, 120 + Math.random() * 300);
    }, 600);
  }, true);
}

  // ── 3장. 소리: 바람 소리·째깍 소리 ──
  // ---- 소리 ------------------------------------------------------------------------------
  let audio = null, master = null, noise = null;
  function wake() {
    try {
      if (!audio) {
        const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
        audio = new A(); master = audio.createGain(); master.gain.value = .5; master.connect(audio.destination);
        noise = audio.createBuffer(1, audio.sampleRate * .8, audio.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }
  function hiss(t0, dur, f, q, peak, f2) {
    if (!audio) return;
    const a = audio, n = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    n.buffer = noise; bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur); bp.Q.value = q;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + Math.min(.02, dur / 3)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t, Math.random() * .3); n.stop(t + dur + .02);
    n.onended = () => { n.disconnect(); bp.disconnect(); g.disconnect(); };
  }
  function tick() {
    if (!audio) return;
    const a = audio, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(2300 + Math.random() * 500, t);
    g.gain.setValueAtTime(.09, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .08); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  const snipSound = () => { hiss(0, .05, 5200, 2, .32); hiss(.11, .06, 4600, 2, .36); };
  const gaspSound = () => hiss(0, .75, 900, .6, .16, 300);
  const throughSound = () => hiss(0, .9, 2600, 1.2, .12, 700);

  // ── 2장. 소리: 발소리·숨소리·넘어지는 소리 ──
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

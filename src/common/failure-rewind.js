(() => {
  'use strict';
  const timing = Object.freeze({ duration: 1380, reveal: 260, reducedDuration: 260, reducedReveal: 140, captureEvery: 125, maxFrames: 20 });
  function create(root, motion) {
    const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d', { alpha: true });
    const grain = document.createElement('canvas'); grain.width = 160; grain.height = 96;
    const grainContext = grain.getContext('2d'), grainPixels = grainContext.createImageData(grain.width, grain.height);
    let watched = null, source = null, history = [], replay = [], recording = 0, animation = 0, lastCapture = -Infinity;
    let finishTimer = 0, revealTimer = 0, pending = null, resolveCover = null, resolveReveal = null;
    let audio = null, sounding = [];
    function stopSound() {
      for (const node of sounding) { try { node.stop?.(); } catch (_) {} try { node.disconnect(); } catch (_) {} }
      sounding = []; if (root.dataset.audio === 'playing') root.dataset.audio = 'stopped';
    }
    function armAudio() {
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) { root.dataset.audio = 'unavailable'; return; }
        audio ||= new Context();
        if (audio.state === 'suspended') audio.resume().catch(() => { root.dataset.audio = 'blocked'; });
      } catch (_) { root.dataset.audio = 'unavailable'; }
    }
    function playSound(reduced) {
      stopSound();
      if (!audio || audio.state !== 'running') { root.dataset.audio = 'blocked'; return; }
      try {
        const seconds = (reduced ? timing.reducedDuration : timing.duration) / 1000, now = audio.currentTime;
        const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate), samples = buffer.getChannelData(0);
        for (let n = 0; n < samples.length; n++) {
          const t = n / audio.sampleRate, flutter = .35 + .65 * Math.abs(Math.sin(t * 73 + Math.sin(t * 19)));
          samples[n] = (Math.random() * 2 - 1) * flutter * (Math.random() < .005 ? 1 : .38);
        }
        const noise = audio.createBufferSource(), filter = audio.createBiquadFilter(), hiss = audio.createGain();
        noise.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1900; filter.Q.value = .65;
        hiss.gain.setValueAtTime(.0001, now); hiss.gain.exponentialRampToValueAtTime(reduced ? .025 : .065, now + .035);
        hiss.gain.exponentialRampToValueAtTime(.0001, now + seconds);
        noise.connect(filter); filter.connect(hiss); hiss.connect(audio.destination);
        const motor = audio.createOscillator(), motorGain = audio.createGain();
        motor.type = 'triangle'; motor.frequency.setValueAtTime(145, now); motor.frequency.exponentialRampToValueAtTime(470, now + seconds * .72);
        motor.frequency.exponentialRampToValueAtTime(85, now + seconds);
        motorGain.gain.setValueAtTime(reduced ? .003 : .009, now); motorGain.gain.exponentialRampToValueAtTime(.0001, now + seconds);
        motor.connect(motorGain); motorGain.connect(audio.destination);
        sounding = [noise, filter, hiss, motor, motorGain];
        noise.start(now); motor.start(now); noise.stop(now + seconds); motor.stop(now + seconds);
        root.dataset.audio = 'playing';
      } catch (_) { stopSound(); root.dataset.audio = 'unavailable'; }
    }
    function stopRecording() { cancelAnimationFrame(recording); recording = 0; watched = null; }
    function capture(frame) {
      try {
        const original = frame?.contentDocument?.querySelector('canvas');
        if (!original?.width || !original.height) return;
        const factor = Math.min(1, 640 / original.width, 400 / original.height);
        const width = Math.max(1, Math.round(original.width * factor)), height = Math.max(1, Math.round(original.height * factor));
        if (history.length && (history[0].width !== width || history[0].height !== height)) history = [];
        const frameCanvas = history.length === timing.maxFrames ? history.shift() : document.createElement('canvas');
        frameCanvas.width = width; frameCanvas.height = height;
        frameCanvas.getContext('2d').drawImage(original, 0, 0, width, height); history.push(frameCanvas);
      } catch (_) { /* DOM-only or unavailable canvases still receive the shared TV distortion. */ }
    }
    function watch(frame) {
      stopRecording(); history = []; lastCapture = -Infinity; watched = frame;
      if (!frame) return;
      function record(now) {
        recording = 0; if (!watched) return;
        if (!document.hidden && now - lastCapture >= timing.captureEvery) { capture(watched); lastCapture = now; }
        recording = requestAnimationFrame(record);
      }
      recording = requestAnimationFrame(record);
    }
    function makeGrain() {
      for (let n = 0; n < grainPixels.data.length; n += 4) {
        const value = Math.floor(Math.random() * 256);
        grainPixels.data[n] = grainPixels.data[n + 1] = grainPixels.data[n + 2] = value; grainPixels.data[n + 3] = 255;
      }
      grainContext.putImageData(grainPixels, 0, 0);
    }
    function resize() { canvas.width = Math.max(1, root.clientWidth); canvas.height = Math.max(1, root.clientHeight); }
    function paint(progress, elapsed, reduced) {
      if (canvas.width !== root.clientWidth || canvas.height !== root.clientHeight) resize();
      const width = canvas.width, height = canvas.height;
      ctx.clearRect(0, 0, width, height); ctx.imageSmoothingEnabled = false;
      const rewind = Math.min(1, progress / .81), index = Math.max(0, replay.length - 1 - Math.floor(rewind * Math.max(0, replay.length - 1)));
      const picture = replay[reduced ? Math.max(0, replay.length - 1) : index];
      root.dataset.replayIndex = String(index); root.dataset.progress = progress.toFixed(2);
      if (picture) ctx.drawImage(picture, 0, 0, width, height);
      if (!reduced) {
        for (let n = 0; n < 3; n++) {
          const y = ((elapsed * (.25 + n * .16) + n * height * .31) % (height + 70)) - 35;
          const band = Math.max(12, height * (.025 + n * .015)), shift = Math.sin(elapsed / 29 + n * 4) * width * (.025 + n * .009);
          if (picture && y >= 0 && y + band <= height) ctx.drawImage(picture, 0, y / height * picture.height, picture.width, band / height * picture.height, shift, y, width, band);
          ctx.fillStyle = n % 2 ? 'rgba(0,0,0,.20)' : 'rgba(255,255,255,.64)'; ctx.fillRect(0, y, width, band);
          ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, y + band, width, 2);
        }
        if (source) { source.style.setProperty('--rewind-x', `${Math.sin(elapsed / 31) * 9}px`); source.style.setProperty('--rewind-skew', `${Math.sin(elapsed / 43) * .7}deg`); }
        makeGrain();
      }
      ctx.globalAlpha = reduced ? .09 : .2; ctx.drawImage(grain, 0, 0, width, height); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
      const fade = reduced ? progress : Math.max(0, (progress - .76) / .24);
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, width, height);
      if (!reduced && progress > .89 && progress < 1) {
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (progress - .89) / .11)})`;
        ctx.fillRect(width * .03, height / 2, width * .94, 2);
      }
    }
    function cover(frame) {
      if (pending) return pending;
      stopRecording(); capture(frame); replay = history.slice(); source = frame;
      root.hidden = false; root.classList.remove('revealing'); root.dataset.phase = 'rewinding'; root.dataset.source = frame?.id || '';
      root.dataset.historyFrames = String(replay.length); root.dataset.reducedMotion = String(motion.matches);
      root.style.setProperty('--rewind-reveal', `${motion.matches ? timing.reducedReveal : timing.reveal}ms`);
      frame?.classList.add('rewind-source'); resize(); makeGrain();
      const reduced = motion.matches, duration = reduced ? timing.reducedDuration : timing.duration, started = performance.now();
      playSound(reduced); paint(0, 0, reduced);
      pending = new Promise(resolve => { resolveCover = resolve; });
      let done = false, lastPaint = -Infinity;
      function finish() {
        if (done) return; done = true; cancelAnimationFrame(animation); animation = 0; clearTimeout(finishTimer);
        paint(1, duration, reduced || motion.matches); root.dataset.phase = 'covered'; stopSound();
        const resolve = resolveCover; resolveCover = null; resolve?.();
      }
      function tick(now) {
        animation = 0; if (done) return;
        const elapsed = now - started;
        if (elapsed >= duration) { finish(); return; }
        if (now - lastPaint >= 40) { paint(elapsed / duration, elapsed, reduced || motion.matches); lastPaint = now; }
        animation = requestAnimationFrame(tick);
      }
      animation = requestAnimationFrame(tick); finishTimer = setTimeout(finish, duration);
      return pending;
    }
    function cleanSource() {
      source?.classList.remove('rewind-source'); source?.style.removeProperty('--rewind-x'); source?.style.removeProperty('--rewind-skew'); source = null;
    }
    function reveal() {
      cleanSource(); root.dataset.phase = 'revealing'; root.classList.add('revealing');
      return new Promise(resolve => {
        resolveReveal = resolve;
        revealTimer = setTimeout(() => {
          root.hidden = true; root.classList.remove('revealing'); root.dataset.phase = 'idle';
          history = []; replay = []; pending = null; resolveReveal = null; resolve();
        }, motion.matches ? timing.reducedReveal : timing.reveal);
      });
    }
    function dispose() {
      stopRecording(); cancelAnimationFrame(animation); clearTimeout(finishTimer); clearTimeout(revealTimer); stopSound(); cleanSource();
      history = []; replay = []; root.hidden = true; root.dataset.phase = 'idle';
      resolveCover?.(); resolveReveal?.(); resolveCover = resolveReveal = pending = null;
    }
    addEventListener('pagehide', dispose);
    return { armAudio, watch, cover, reveal, dispose };
  }
  window.FailureRewind = { timing, create };
})();

  // ── 8장. 돌리기: 매 순간 움직이고 다시 그리기, 일시정지 ──
  // ---------- loop and lifecycle ----------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (paused || document.hidden) return;
    if (!ended || s.phase === 'failed') update(dt);
    draw();
  }
  function resize() {
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight); scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ppm = Math.min(width / (width<600?4.8:8.5), height / 3.6);
  }
  function pause() { paused = true; held.clear(); silence(); LastWalkEnding.pause(); if (audio && audio.state === 'running') audio.suspend().catch(() => {}); }
  function resume() { paused = false; last = 0; LastWalkEnding.resume(); if (audio) audio.resume().catch(() => {}); }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { held.clear(); last = 0; if (document.hidden) silence(); });
  window.addEventListener('pagehide', () => { ended = true; cancelAnimationFrame(raf); if (audio) audio.close().catch(() => {}); });
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== channel) return;
    if (e.data.type === 'pause') pause();
    if (e.data.type === 'focus') { resume(); canvas.focus({ preventScroll: true }); }
  });
  // 10/31 개발자용 컷신 버튼: {channel:'speedrun-dev-cutscene'} 메시지로 걷지 않고 중환자실 컷신만 본다. 끝나면 처음부터(완료로 치지 않음).
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== 'speedrun-dev-cutscene') return;
    restart(); paused = false; last = 0; setPhase('ending'); silence(); held.clear(); status.textContent = '';
    LastWalkEnding.play({ onDone: restart });
  });
  $('stage-back').addEventListener('click', function () {
    this.disabled = true; ended = true; pause(); LastWalkEnding.stop();
    if (embedded) parent.postMessage({ channel, type: 'back' }, '*'); else { this.disabled = false; restart(); paused = false; }
  });
  resize(); setPhase('elder'); canvas.focus({ preventScroll: true }); raf = requestAnimationFrame(frame);
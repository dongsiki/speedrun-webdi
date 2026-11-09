  // ── 4장. 입력: 왼발·오른발·눈 깜빡이기·숨 ──
  // ---------- input ----------
  const held = new Set();
  function foot(which) {
    s.hintUsed.feet = true;
    // Pressing while frozen does nothing — but now it says so (dull knock + bar flash).
    if (s.stumble > 0) { if (s.frozenPress <= 0) tone(70, .08, .05, 'square'); s.frozenPress = .22; return; }
    // Same foot twice, or a new step before the last one settled → stumble.
    if (s.lastFoot === which || s.stepping > 0 || s.sinceStep < T.settle) {
      const same = s.lastFoot === which;
      s.stumble = T.stumbleTime; s.stumbles++; s.stepping = 0; s.lastFoot = null;
      s.oxygen = Math.max(0, s.oxygen - T.stumbleCost);
      stumbleSound();
      pop('step', same ? '비틀! 같은 발' : '비틀! 너무 빨라', s.stumbles <= 2 ? '잠깐 못 움직임' : '', T.stumbleTime);
      status.textContent = same ? '같은 발을 두 번 디뎌 비틀거립니다. 잠시 움직일 수 없습니다.' : '너무 빨리 디뎌 비틀거립니다. 잠시 움직일 수 없습니다.';
      return;
    }
    s.lastFoot = which; s.stepFoot = which; s.stepping = T.stepTime; s.stepFrom = s.x; s.sinceStep = 0; s.steps++;
    s.oxygen = Math.max(0, s.oxygen - T.stepCost);
  }
  function blinkEyes() { s.hintUsed.eyes = true; s.blink = .14; s.dryness = 0; s.blinks++; }
  canvas.addEventListener('keydown', e => {
    if (ended) return;
    const k = e.code;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyE'].includes(k)) e.preventDefault();
    startAudio();
    if (e.repeat) return;
    held.add(k);
    if (s.phase === 'elder' && PH && PH.key(k, s)) return;
    if (s.phase === 'elder') {
      if (k === 'KeyA' || k === 'ArrowLeft') foot('L');
      if (k === 'KeyD' || k === 'ArrowRight') foot('R');
      if (k === 'KeyE') blinkEyes();
      if (k === 'Space') s.hintUsed.breath = true;
    }
  });
  canvas.addEventListener('keyup', e => { held.delete(e.code); });
  const breathHeld = () => held.has('Space');
  canvas.addEventListener('pointerdown', () => { canvas.focus({ preventScroll: true }); startAudio(); });
  window.addEventListener('blur', () => held.clear());

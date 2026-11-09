  // ── 5장. 걷기 규칙: 넘어짐·성공·엔딩 컷신 시작 ──
  // ---------- simulation ----------
  function setPhase(p) { s.phase = p; s.phaseTime = 0; canvas.dataset.phase = p; }
  function fail() {
    if (ended) return; ended = true; setPhase('failed'); silence();
    status.textContent = '숨이 막혀 주저앉았습니다. 땅파기 로비로 돌아갑니다.';
    if (embedded) parent.postMessage({ channel, type: 'fail' }, '*');
    else setTimeout(restart, 1600);
  }
  function complete() {
    if (ended) return; ended = true; silence();
    if (embedded) parent.postMessage({ channel, type: 'complete' }, '*');
    else setTimeout(restart, 1600);
  }
  function restart() { LastWalkEnding.stop(); PH?.reset(); s = fresh(); ended = false; held.clear(); hintKey = ''; setPhase('elder'); clock = 0; }
  // 노인이 끝까지 걸으면 중환자실 엔딩 컷신 → 끝나면 이 게임 완료.
  function startEnding() {
    setPhase('ending'); silence(); held.clear(); status.textContent = '';
    LastWalkEnding.play({ onDone: complete });
  }

  function updateElder(dt) {
    // Feet
    s.sinceStep += dt;
    if (s.stumble > 0) { s.stumble = Math.max(0, s.stumble - dt); }
    if (s.stepping > 0) {
      s.stepping = Math.max(0, s.stepping - dt);
      const t = 1 - s.stepping / T.stepTime;
      s.x = s.stepFrom + T.stepLength * (t * t * (3 - 2 * t));
    }
    // Breath: hold Space to inhale, release to exhale.
    if (PH) { PH.update(dt, s); if (ended) return; }
    const inhaling = PH ? PH.inhaling(breathHeld(), dt, s) : breathHeld(), before = s.lung, breathsBefore = s.breaths, deepBefore = s.lungPeak > .55;
    s.lung = Math.max(0, Math.min(1, s.lung + (inhaling ? T.inhaleRate : -T.exhaleRate) * dt));
    if (inhaling) s.lungPeak = Math.max(s.lungPeak, s.lung);
    if (inhaling && s.lung >= 1) s.holdAtFull += dt; else if (!inhaling) s.holdAtFull = 0;
    if (!inhaling && s.lungPeak > .55 && s.lung < .15) { s.oxygen = Math.min(1, s.oxygen + T.breathGain * s.lungPeak); s.lungPeak = s.lung; s.breaths++; }
    if (!inhaling && s.lung < .15) s.lungPeak = Math.min(s.lungPeak, s.lung + .001);
    // Cues only — the oxygen rule above is untouched.
    if (inhaling) s.inhaledSinceLow = true;
    if (inhaling && !deepBefore && s.lungPeak > .55) tone(660, .08, .03);
    if (s.breaths !== breathsBefore) { s.inhaledSinceLow = false; pop('breath', '깊은 숨', '', .8); tone(392, .2, .03, 'sine', 587); status.textContent = '깊게 숨을 쉬었습니다.'; }
    else if (!inhaling && before >= .15 && s.lung < .15 && s.inhaledSinceLow) {
      s.inhaledSinceLow = false; s.shallow++;
      pop('breath', '얕은 숨', s.shallow <= 2 ? '점선 밖까지 들이쉬기' : '', 1.1); tone(140, .18, .045, 'triangle');
      status.textContent = '숨이 얕습니다. 원이 점선 밖까지 차도록 들이쉬십시오.';
    }
    if (s.holdAtFull > 1.2 && !s.holdWarned) {
      s.holdWarned = true; s.holdWarns++;
      pop('breath', '숨 참는 중', s.holdWarns <= 2 ? '산소가 더 빨리 줄어요' : '', 1.4); tone(150, .3, .045, 'square');
      status.textContent = '숨을 참고 있습니다. 산소가 더 빨리 줄어듭니다.';
    }
    if (!inhaling) s.holdWarned = false;
    breathSound((s.lung - before) / Math.max(dt, 1e-3), inhaling);
    // Oxygen
    s.oxygen -= (T.oxygenDecay + (s.holdAtFull > 1.2 ? T.holdPenalty : 0)) * dt;
    if (s.oxygen <= 0) { s.oxygen = 0; fail(); return; }
    // Eyes
    s.blink = Math.max(0, s.blink - dt);
    s.dryness = Math.min(1, s.dryness + T.dryRate * dt);
    if (s.x >= T.shiftAt) startEnding();
  }
  function update(dt) {
    clock += dt; s.phaseTime += dt;
    for (const k in s.pops) { const p = s.pops[k]; p.t += dt; if (p.t >= p.life) delete s.pops[k]; }
    s.frozenPress = Math.max(0, s.frozenPress - dt);
    if (s.phase === 'elder') updateElder(dt);
    updateHint();
    Object.assign(canvas.dataset, { x: s.x.toFixed(2), oxygen: s.oxygen.toFixed(3), lung: s.lung.toFixed(2), dryness: s.dryness.toFixed(2), stumbles: String(s.stumbles), steps: String(s.steps), breaths: String(s.breaths) });
  }

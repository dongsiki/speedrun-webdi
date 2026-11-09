  // ── 3장. 안내: 조작 안내 글 ──
  // ---------- hints (fade once each control has been used) ----------
  const hints = {
    elder: '<kbd>A</kbd> <kbd>D</kbd> 번갈아 걷기 &nbsp; <kbd>Space</kbd> 꾹 눌러 원을 점선 밖까지 · 떼면 내쉬기 &nbsp; <kbd>E</kbd> 눈 깜빡이기'
  };
  if (PH) hints.phase = PH.hint;
  let hintKey = '';
  function showHint(key) { if (hintKey === key) return; hintKey = key; keysHint.innerHTML = hints[key]; keysHint.dataset.hidden = 'false'; }
  function updateHint() {
    const u = s.hintUsed;
    if (s.phase === 'elder') { showHint(PH ? 'phase' : 'elder'); if (PH) return; if (u.feet && u.breath && u.eyes && clock > 6) keysHint.dataset.hidden = 'true'; }
    else keysHint.dataset.hidden = 'true';
  }

  // ── 4장. 입력: 마우스·방향키·누르고 있기(숨 참기) ──
  // ---- 입력 ------------------------------------------------------------------------------
  const keys = new Set();
  let usingKeys = false;
  canvas.addEventListener('pointermove', e => { if (st.phase !== 'play') return; usingKeys = false; st.target = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerdown', e => {
    wake(); canvas.focus({ preventScroll: true });
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    st.target = { x: e.clientX, y: e.clientY }; hold(true);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const up = () => hold(false);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); wake(); if (!e.repeat) hold(true); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); wake(); usingKeys = true; keys.add(e.key); }
  });
  addEventListener('keyup', e => {
    if (e.key === ' ' || e.code === 'Space') hold(false);
    keys.delete(e.key);
  });
  addEventListener('blur', () => { keys.clear(); hold(false); });
  function hold(on) {
    if (st.phase !== 'play') { st.holding = false; return; }
    if (on && st.gaspT > 0) return; // 숨이 터진 직후엔 다시 못 참는다
    if (on && !st.holding) { st.holdT = 0; st.everHeld = true; st.holdSeen = true; }
    st.holding = on;
  }

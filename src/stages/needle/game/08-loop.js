  // ── 8장. 돌리기: 매 순간 움직이고 다시 그리기, 일시정지 ──
  // ---- 돌리기 ----------------------------------------------------------------------------
  let last = performance.now(), lastBoil = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (now - lastBoil > 125) { boil = (boil + 1) % 4; lastBoil = now; }
    if (!paused) step(dt);
    draw();
    canvas.dataset.phase = st.phase; canvas.dataset.fray = String(st.fray); canvas.dataset.notches = String(st.notches);
    canvas.dataset.holding = String(st.holding); canvas.dataset.threading = String(st.threading); canvas.dataset.done = String(st.done);
    requestAnimationFrame(frame);
  }
  let paused = false;
  addEventListener('resize', layout);
  addEventListener('message', e => {
    if (e.source !== parent || e.data?.channel !== channel) return;
    if (e.data.type === 'focus') { paused = false; canvas.focus({ preventScroll: true }); }
    if (e.data.type === 'pause') { paused = true; hold(false); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hold(false); last = performance.now(); });
  layout(); say('실 끝을 바늘귀로 옮기세요.');
  requestAnimationFrame(frame);
  // 확인용(자동 검사): 상태를 읽고 커서를 옮길 수 있게.
  window.NeedleTest = { get state() { return st; }, geo, get s() { return s; }, cxAt };
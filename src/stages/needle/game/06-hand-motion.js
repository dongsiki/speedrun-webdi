  // ── 6장. 움직임: 떨리는 손과 실 끝 움직이기 ──
  // ---- 움직임 ----------------------------------------------------------------------------
  function shakeAmount(dt) {
    let want = T.shake + st.cuts * T.fatigue;
    if (st.gaspT > 0) { st.gaspT -= dt; want = (T.shake + 4.5) + st.cuts * T.fatigue; }
    else if (st.holding) {
      st.holdT += dt;
      const settled = lerp(want, T.shakeHeld, clamp(st.holdT / T.holdEase, 0, 1));
      const strain = clamp((st.holdT - T.holdMax) / (T.holdBreak - T.holdMax), 0, 1);
      want = lerp(settled, T.shake + 3, strain * strain);
      if (st.holdT >= T.holdBreak) { st.holding = false; st.gaspT = T.gasp; gaspSound(); say('숨이 찼습니다.'); }
    }
    st.shakeNow = lerp(st.shakeNow, want, 1 - Math.exp(-dt * 9));
    st.focus = lerp(st.focus, st.holding && st.gaspT <= 0 ? 1 : 0, 1 - Math.exp(-dt * (st.holding ? 2.2 : 4)));
    return st.shakeNow * s;
  }
  function tremor(t, a) {
    const p = phases;
    const x = .55 * Math.sin(TAU * 5.3 * t + p[0]) + .3 * Math.sin(TAU * 8.9 * t + p[1]) + .25 * Math.sin(TAU * 1.07 * t + p[2]) + .12 * Math.sin(TAU * 13.1 * t + p[3]);
    const y = .5 * Math.sin(TAU * 4.7 * t + p[4]) + .33 * Math.sin(TAU * 7.6 * t + p[5]) + .27 * Math.sin(TAU * .83 * t + p[6]) + .12 * Math.sin(TAU * 11.7 * t + p[7]);
    return { x: x * a, y: y * a };
  }
  function step(dt) {
    st.t += dt;
    if (st.phase === 'play') {
      if (usingKeys && keys.size) {
        const v = 210 * s * dt;
        if (keys.has('ArrowLeft')) st.target.x -= v; if (keys.has('ArrowRight')) st.target.x += v;
        if (keys.has('ArrowUp')) st.target.y -= v; if (keys.has('ArrowDown')) st.target.y += v;
      }
      st.target.x = clamp(st.target.x, 0, W); st.target.y = clamp(st.target.y, 0, H);
      const k = 1 - Math.exp(-dt * T.follow);
      st.hand.x += (st.target.x - st.hand.x) * k; st.hand.y += (st.target.y - st.hand.y) * k;
      if (st.snipT > 0) st.snipT -= dt;
      if (st.cool > 0) st.cool -= dt;
      const a = shakeAmount(dt), w = tremor(st.t, a);
      let x = st.hand.x + w.x, y = st.hand.y + w.y;
      const r = tipR(), cx = cxAt(y), hw = halfWidth(y);
      const onNeedle = y >= geo.top - r && y <= geo.bottom && hw > 0;
      const left = cx - hw - r, right = cx + hw + r;
      const inBand = onNeedle && x > left && x < right;
      const inSlot = Math.abs(y - geo.eyeY) <= geo.eh - r;
      if (!inBand) {
        if (st.threading && x >= right) { if (x > cx + 36 * s) { st.tip = { x, y }; finish('complete'); return; } }
        else st.threading = false;
        if (!st.threading) st.side = x < cx ? 'L' : 'R';
      } else if (inSlot && (st.threading || (st.side === 'L' && st.cool <= 0))) {
        // 바늘귀 안: 실이 구멍에 쓸려 천천히만 들어간다. 그동안에도 손은 떨린다.
        st.threading = true;
        const maxX = Math.max(st.tip.x, left) + T.rub * s * dt;
        if (x > maxX) { st.hand.x -= (x - maxX); x = maxX; }
      } else {
        // 바늘 몸에 걸림: 그 자리에 막힌다(손은 계속 민다)
        const edge = st.side === 'L' ? left : right;
        if (st.cool <= 0) { bump(); if (st.phase !== 'play') return; }
        st.threading = false;
        x = edge; st.hand.x = lerp(st.hand.x, edge - w.x + (st.side === 'L' ? -3 : 3) * s, .5);
      }
      st.tip = { x, y };
      st.near = Math.hypot(x - cxAt(geo.eyeY), y - geo.eyeY) < 80 * s;
      if (st.near) st.guideSeen = true;
    } else {
      st.endT += dt;
      if (st.phase === 'pulled') { st.pull = Math.min(1, st.endT / 1.3); st.tip.x += 140 * s * dt * (1 - st.pull); if (st.endT > 1.7) { if (st.done + 1 < T.passes) nextPass(); else report('complete'); } }
      if (st.phase === 'failed' && st.endT > 1.3) report('fail');
    }
  }

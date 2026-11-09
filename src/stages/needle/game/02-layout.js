  // ── 2장. 자리: 바늘·실타래·손의 위치와 크기 ──
  // ---- 자리 ------------------------------------------------------------------------------
  const geo = {};
  function layout() {
    W = innerWidth; H = innerHeight; s = Math.min(W, H) / 440;
    canvas.width = Math.ceil(W * ratio); canvas.height = Math.ceil(H * ratio);
    geo.nx = W * .64; geo.top = H * .05; geo.bottom = H * 1.08; geo.tilt = Math.tan(4 * Math.PI / 180);
    geo.eyeY = geo.top + 46 * s; geo.eh = 8.5 * s; geo.ew = 3.6 * s;
    geo.spool = { x: W * .47, y: H * .85 };
    geo.pinch = 28 * s; // 손가락 끝에서 실 끝까지
    if (!st.hand) { st.hand = { x: W * .34, y: geo.eyeY + 60 * s }; st.target = { ...st.hand }; }
  }
  const cxAt = y => geo.nx + (y - geo.top) * geo.tilt;
  function halfWidth(y) {
    const L = geo.bottom - geo.top, u = (y - geo.top) / L;
    if (u < 0 || u > 1) return 0;
    if (u < .03) return 9 * s * Math.sqrt(1 - (1 - u / .03) ** 2);
    if (u < .17) return 9 * s;
    if (u < .3) return lerp(9, 6, (u - .17) / .13) * s;
    if (u < .82) return 6 * s;
    return 6 * s * (1 - (u - .82) / .18);
  }

  // ── 7장. 신호: 화면에 뜨는 짧은 글자 신호 ──
  // ---------- cues (2026-10-11) ----------
  function cueBox(p, x, y, big) {
    const size = Math.round(Math.max(big ? 16 : 14, (big ? .2 : .15) * ppm)), subSize = Math.round(size * .62);
    const rise = reducedQuery.matches ? 0 : -Math.min(1, p.t / .25) * size * .4;
    const font = (w, px) => `${w} ${px}px "Malgun Gothic", sans-serif`;
    ctx.font = font(700, size); const w1 = ctx.measureText(p.text).width;
    ctx.font = font(600, subSize); const w2 = p.sub ? ctx.measureText(p.sub).width : 0;
    const pad = Math.round(size * .35), w = Math.max(w1, w2) + pad * 2, hh = size * 1.25 + (p.sub ? subSize * 1.35 : 0) + pad * .5;
    const left = Math.min(x, width - w - 8), top = y - hh / 2 + rise;
    ctx.fillStyle = '#fff'; ctx.fillRect(left, top, w, hh);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(left, top, w, hh);
    ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = font(700, size); ctx.fillText(p.text, left + pad, top + pad * .25 + size * .65);
    if (p.sub) { ctx.font = font(600, subSize); ctx.fillText(p.sub, left + pad, top + pad * .25 + size * 1.25 + subSize * .6); }
  }
  // Breath ring above the head: black disc = air in the lungs, dashed line = deep enough.
  // Once a breath passes the line the line turns solid: let go and breathe out.
  function drawCues(px, fy) {
    ctx.save(); ctx.lineCap = 'butt';
    const r = Math.max(18, .27 * ppm), cx = px + .08 * ppm, cy = fy - 2.2 * ppm, tr = r * .55;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
    const holding = s.holdAtFull > .5, flash = reducedQuery.matches || Math.floor(clock / .15) % 2 === 0;
    ctx.strokeStyle = '#000'; ctx.lineWidth = holding && flash ? 6 : 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, r * s.lung), 0, Math.PI * 2); ctx.fill();
    const deep = s.inhaledSinceLow && s.lungPeak > .55;
    ctx.strokeStyle = r * s.lung > tr ? '#fff' : '#000'; ctx.lineWidth = deep ? 3 : 1.5; ctx.setLineDash(deep ? [] : [3, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, tr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#000'; ctx.font = `600 ${Math.round(Math.max(12, .12 * ppm))}px "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(PH ? PH.breathLabel() : '숨', cx - r - 8, cy);
    // Under the feet: how long the stumble still holds him. Flashes if a key is pressed meanwhile.
    if (s.stumble > 0) {
      const bw = .7 * ppm, bh = Math.max(7, .06 * ppm), bx = px - bw / 2, by = fy + .16 * ppm;
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw * s.stumble / T.stumbleTime, bh);
      ctx.strokeStyle = '#000'; ctx.lineWidth = s.frozenPress > 0 ? 5 : 2; ctx.strokeRect(bx, by, bw, bh);
    }
    if (s.pops.breath) cueBox(s.pops.breath, cx + r + 12, cy, false);
    if (s.pops.step) cueBox(s.pops.step, px + .55 * ppm, fy - 1.35 * ppm, true);
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const phase = s.phase;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    const camX = s.x;
    drawWorld(camX);
    const px = sx(s.x, camX), fy = floorY();
    drawElder(px, fy);
    if (phase === 'elder' || phase === 'failed') {
      // Low oxygen darkens from the edges; dry eyes cloud them white.
      edgeVeil(Math.max(0, (.45 - s.oxygen) / .45), true);
      edgeVeil(Math.max(0, (s.dryness - .45) / .55), false);
      if (phase === 'elder') drawCues(px, fy);
      if (s.blink > 0) { ctx.fillStyle = '#000'; const h = height * .5 * Math.sin(s.blink / .14 * Math.PI); ctx.fillRect(0, 0, width, h); ctx.fillRect(0, height - h, width, h); }
      if (PH) PH.draw(ctx, width, height, ppm, px, fy, s, clock);
    }
  }

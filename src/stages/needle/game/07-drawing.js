  // ── 7장. 그림: 바늘·실·손·실타래 그리기 ──
  // ---- 그림 ------------------------------------------------------------------------------
  // 손으로 그린 선이 1초에 8번 조금씩 다시 그려진다(셀 애니메이션처럼).
  let boil = 0;
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263 + boil * 2246822519, 3266489917); h ^= h >>> 15; return ((h >>> 0) % 1000) / 1000 - .5; };
  const wob = (x, y, k, amt = .9) => [x + hash(k, 1) * amt * s, y + hash(k, 2) * amt * s];
  function path(points, k, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => { const [a, b] = wob(x, y, k + i); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
    if (close) ctx.closePath();
  }
  let dither = null;
  function pattern(level) {
    // 4x4 Bayer 점묘. level 0..16
    const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d');
    const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); g.fillStyle = '#000';
    m.forEach((v, i) => { if (v < level) g.fillRect(i % 4, Math.floor(i / 4), 1, 1); });
    const p = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix([1 / ratio, 0, 0, 1 / ratio, 0, 0])); return p;
  }
  // 11/02 개발자용 02만: 손으로 실 꿰는 화면 밑에 세일러문 그림(Codex). 사용자 「아 ㅇㅋ 4는 코덱스한테 이미지 맡기고 그 이미지를 집어넣어」.
  // 그림은 dev.template.html이 window.NeedleUnderlay로 넘긴다(본편 01엔 없음). 화면을 꽉 채운다(실 꿰기 화면은 흑백 잉크 필터를 거쳐 옅게 그리면 사라져서 그대로 그림, 세부는 Claude가 정함).
  function drawUnderlay() {
    const img = window.NeedleUnderlay; if (!img || !img.complete || !img.naturalWidth) return;
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); ctx.restore();
  }
  function draw() {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    drawUnderlay();
    if (!dither) dither = { mid: pattern(8), light: pattern(4), dark: pattern(12) };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#000';
    drawBits(); drawSpool(); drawNeedle(); drawStrands(); drawThread(false); drawHand(); drawThread(true); drawGuide(); drawBreath(); drawSnip();
  }
  function drawNeedle() {
    // 노안: 바늘이 흐릿하게 하나 더 겹쳐 보인다(점선). 숨을 참으면 초점이 맞아 겹침이 줄어든다. 판정은 실선 바늘만.
    const blur = lerp(13, 2.5, st.focus) * s, gx = Math.sin(st.t * .71 + phases[2]) * blur, gy = Math.cos(st.t * .53 + phases[5]) * blur * .8;
    ctx.save(); ctx.translate(gx, gy); ctx.setLineDash([5 * s, 4 * s]); ctx.lineWidth = 1.4 * s;
    { const n = 40, L = [], R = []; for (let i = 0; i <= n; i++) { const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), hh = halfWidth(y); L.push([c - hh, y]); R.unshift([c + hh, y]); } path([...L, ...R], 150, true); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cxAt(geo.eyeY), geo.eyeY, geo.ew, geo.eh, geo.tilt, 0, TAU); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]);
    const n = 60, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), h = halfWidth(y);
      L.push([c - h, y]); R.unshift([c + h, y]);
    }
    path([...L, ...R], 100, true);
    ctx.fillStyle = dither.light; ctx.fill(); ctx.lineWidth = 2.2 * s; ctx.stroke();
    // 그림자 쪽 빗금
    ctx.lineWidth = 1 * s;
    for (let i = 6; i < n - 6; i += 4) {
      const y = lerp(geo.top, geo.bottom, i / n), c = cxAt(y), h = halfWidth(y);
      path([[c + h * .35, y], [c + h * .85, y + 7 * s]], 200 + i); ctx.stroke();
    }
    // 바늘귀: 뚫린 구멍(흰 종이가 보임)
    const ex = cxAt(geo.eyeY);
    ctx.beginPath(); ctx.ellipse(...wob(ex, geo.eyeY, 300, .4), geo.ew, geo.eh, geo.tilt, 0, TAU);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.8 * s; ctx.stroke();
  }
  function threadFrom() { return { x: geo.spool.x + 10 * s, y: geo.spool.y - 30 * s }; }
  function drawThread(front) {
    const a = threadFrom(), f = { x: st.tip.x - geo.pinch, y: st.tip.y + 2 * s };
    ctx.lineWidth = 1.7 * s; ctx.strokeStyle = "#000";
    if (!front) {
      // 실타래에서 손가락까지 늘어진 실(손 뒤로 들어간다)
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x + 40 * s, a.y + 50 * s, f.x - 90 * s, f.y + 110 * s + hash(9, 9) * 4 * s, f.x - 20 * s, f.y + 8 * s); ctx.stroke();
      return;
    }
    // 손가락 밖으로 나온 실 끝
    const pulled = st.phase === "pulled";
    const tip = st.tip, through = pulled || st.threading;
    if (through) {
      const ex = cxAt(geo.eyeY);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo((f.x + ex) / 2, (f.y + geo.eyeY) / 2 + 3 * s, ex, geo.eyeY);
      ctx.lineTo(tip.x, tip.y + (pulled ? st.pull * 18 * s : 0)); ctx.stroke();
    } else {
      path([[f.x, f.y], [(f.x + tip.x) / 2, (f.y + tip.y) / 2 + 1.5 * s], [tip.x, tip.y]], 400); ctx.stroke();
    }
    // 풀린 끝: 가닥이 갈라진다
    if (st.fray > 0 && !through) {
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < st.fray * 2 + 1; i++) {
        const ang = (i - st.fray) * .42 + hash(500 + i, 3) * .5, len = (5 + st.fray * 3 + hash(520 + i, 4) * 4) * s;
        ctx.beginPath(); ctx.moveTo(tip.x - 3 * s, tip.y); ctx.lineTo(tip.x - 3 * s + Math.cos(ang) * len, tip.y + Math.sin(ang) * len); ctx.stroke();
      }
    }
  }
  function drawStrands() {
    // 앞서 꿴 실: 바늘귀 왼쪽에 짧은 꼬리, 오른쪽으로 빠져나가 아래로 늘어진다.
    const ex = cxAt(geo.eyeY), ey = geo.eyeY;
    ctx.lineWidth = 1.7 * s; ctx.strokeStyle = '#000';
    st.strands.forEach((b, i) => {
      const k = 1000 + i * 20, bx = b.x + i * 16 * s, by = b.y + i * 8 * s;
      const hang = { x: bx + (10 + i * 6) * s, y: Math.min(H * .97, by + (170 + i * 45) * s) };
      ctx.beginPath(); ctx.moveTo(...wob(ex - 14 * s, ey + (22 + i * 6) * s, k));
      ctx.quadraticCurveTo(...wob(ex - 6 * s, ey + 2 * s, k + 1), ex, ey);
      ctx.bezierCurveTo(...wob(lerp(ex, bx, .55), ey + i * 3 * s, k + 2), ...wob(bx + 6 * s, by, k + 3), ...wob(hang.x, hang.y, k + 4));
      ctx.stroke();
    });
  }
  function drawHand() {
    // The sprite's thumb/index contact (1148,218) is the actual thread pinch.
    // Its forearm continues off-screen. Movement follows the existing tip/shake.
    if (!handSprite.complete || !handSprite.naturalWidth) return;
    const px = st.tip.x - geo.pinch, py = st.tip.y + 2 * s;
    const width = 430 * s, height = width * handSprite.naturalHeight / handSprite.naturalWidth;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(handSprite, px - width * (1148 / 1254), py - height * (218 / 1254), width, height);
    ctx.restore();
  }
  function drawSpool() {
    const { x, y } = geo.spool;
    ctx.lineWidth = 2 * s; ctx.fillStyle = '#fff';
    // 나무 실패
    path([[x - 34 * s, y - 40 * s], [x + 34 * s, y - 40 * s], [x + 34 * s, y - 32 * s], [x - 34 * s, y - 32 * s]], 800, true); ctx.fill(); ctx.stroke();
    path([[x - 34 * s, y + 32 * s], [x + 34 * s, y + 32 * s], [x + 34 * s, y + 40 * s], [x - 34 * s, y + 40 * s]], 810, true); ctx.fill(); ctx.stroke();
    path([[x - 12 * s, y - 32 * s], [x + 12 * s, y - 32 * s], [x + 12 * s, y + 32 * s], [x - 12 * s, y + 32 * s]], 820, true); ctx.fill(); ctx.stroke();
    // 감긴 실: 남은 만큼만 두껍다
    const wide = (12 + st.notches * 4.5) * s;
    if (st.notches > 0) {
      path([[x - wide, y - 31 * s], [x + wide, y - 31 * s], [x + wide, y + 31 * s], [x - wide, y + 31 * s]], 830, true);
      ctx.fillStyle = dither.mid; ctx.fill(); ctx.stroke();
      ctx.lineWidth = .9 * s;
      for (let i = -27; i < 30; i += 5) { path([[x - wide, y + i * s], [x + wide, y + (i + 2.5) * s]], 840 + i); ctx.stroke(); }
    }
  }
  function drawBits() {
    ctx.lineWidth = 1.2 * s;
    st.bits.forEach((b, i) => {
      ctx.beginPath();
      for (let j = 0; j <= 6; j++) { const u = j / 6, xx = b.x + Math.cos(b.a) * u * 16 * s, yy = b.y + Math.sin(b.a) * u * 16 * s + Math.sin(u * 9 + b.k * 6) * 2.5 * s; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    });
  }
  function drawGuide() {
    // 가이드 아닌 가이드: 누가 연필로 그어 둔 점선 화살표와, 마우스를 꾹 누르라는 낙서.
    if (st.phase !== 'play') return;
    ctx.lineWidth = 1.3 * s;
    if (!st.guideSeen) {
      const ex = cxAt(geo.eyeY) - 22 * s, ey = geo.eyeY, sx = W * .34 + 24 * s, sy = geo.eyeY + 60 * s;
      ctx.setLineDash([6 * s, 7 * s]);
      ctx.beginPath(); ctx.moveTo(...wob(sx, sy, 900)); ctx.quadraticCurveTo(...wob((sx + ex) / 2, sy - 30 * s, 901), ...wob(ex, ey, 902)); ctx.stroke();
      ctx.setLineDash([]);
      path([[ex - 12 * s, ey - 7 * s], [ex, ey], [ex - 13 * s, ey + 6 * s]], 905); ctx.stroke();
    }
    if (!st.holdSeen) {
      // 마우스 낙서: 왼쪽 버튼만 빗금으로 칠해져 있다.
      const mx = W - 110 * s, my = H - 120 * s;
      ctx.lineWidth = 1.8 * s; ctx.fillStyle = '#fff';
      path([[mx, my], [mx + 44 * s, my - 2 * s], [mx + 46 * s, my + 66 * s], [mx + 2 * s, my + 68 * s]], 920, true); ctx.fill(); ctx.stroke();
      path([[mx + 1 * s, my + 24 * s], [mx + 45 * s, my + 23 * s]], 925); ctx.stroke();
      path([[mx + 23 * s, my - 1 * s], [mx + 23 * s, my + 24 * s]], 927); ctx.stroke();
      ctx.lineWidth = 1 * s;
      for (let i = 0; i < 5; i++) { path([[mx + 3 * s, my + (4 + i * 4) * s], [mx + 20 * s, my + (2 + i * 4) * s]], 930 + i * 2); ctx.stroke(); }
      // "꾹" 손글씨(살짝 기울어짐)
      ctx.save(); ctx.translate(mx - 34 * s + hash(940, 1) * s, my + 10 * s); ctx.rotate(-.14 + hash(941, 1) * .03);
      ctx.fillStyle = '#000'; ctx.font = `700 ${Math.round(26 * s)}px "Segoe Print","Comic Sans MS","Gulim",sans-serif`; ctx.fillText('꾹', 0, 0); ctx.restore();
      path([[mx - 6 * s, my + 16 * s], [mx - 1 * s, my + 13 * s]], 945); ctx.stroke();
    }
  }
  function drawBreath() {
    // 숨을 오래 참으면 화면 가장자리부터 점묘로 어두워진다. 숨이 터지면 한 번 크게 번진다.
    let k = 0;
    if (st.holding) k = clamp((st.holdT - 1.2) / (T.holdBreak - 1.2), 0, 1);
    if (st.gaspT > 0) k = Math.max(k, st.gaspT / T.gasp);
    if (k <= 0) return;
    const band = Math.min(W, H) * .22 * k;
    ctx.fillStyle = k > .66 ? dither.dark : k > .33 ? dither.mid : dither.light;
    ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band); ctx.fillRect(0, 0, band, H); ctx.fillRect(W - band, 0, band, H);
  }
  function drawSnip() {
    if (st.snipT <= 0) return;
    // 가위가 잠깐 들어와 풀린 끝을 자른다.
    const x = st.tip.x + 20 * s, y = st.tip.y, open = st.snipT > .3 ? .5 : .08;
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2 * s; ctx.fillStyle = '#fff';
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.rotate(sgn * open);
      path([[0, 0], [-46 * s, sgn * 2 * s], [-42 * s, sgn * 10 * s], [0, sgn * 9 * s]], 960 + sgn, true); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(16 * s, sgn * 10 * s, 11 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

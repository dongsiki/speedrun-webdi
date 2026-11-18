  // 11/17 개발자용(02)에만: 사진 바퀴벌레 + 다리 움직임 + 디더링(인트로 할배의 절반 세기)
  //  등 쪽 사진: 「Top view of a cockroach」 Johnnybam, Wikimedia Commons, CC0 1.0
  //        https://commons.wikimedia.org/wiki/File:Top_view_of_a_cockroach.jpg
  //  배 쪽 사진(11/18): 「Opisthoplatia orientalis-underside」 peterwchen, Wikimedia Commons, CC BY 4.0(출처 표시)
  //        https://commons.wikimedia.org/wiki/File:Opisthoplatia_orientalis-underside.jpg
  //  배경을 지우고 몸통 1조각 + 다리·더듬이 조각으로 잘라 한 장(roach-atlas.webp / roach-belly-atlas.webp)에 모음.
  //  조각 자리표: a = 그림 안 [x, y, 너비, 높이], at = 사진 안 왼쪽 위, pivot = 몸통에 붙는 점(사진 안).
  //  등 쪽: 1페 가운데 맴도는 한 마리, 2페 스페이스바로 모이는 일곱 마리. 배 쪽(11/18): 화면을 휙 가로지르는 바퀴벌레 전부 + 2페 큰 놈.
  const Roach = (() => {
    function model(src, M) {
      const img = new Image(); img.src = src;
      const UNIT = 84 / M.length; // 사진 1px → 예전 그림 단위(몸 길이 약 84)
      const ax = Math.cos(M.axis), ay = Math.sin(M.axis);
      // 몸 축의 어느 쪽에 붙었는지(왼쪽/오른쪽)에 따라 같은 각도가 앞·뒤로 반대가 되므로 부호를 맞춘다.
      for (const p of M.parts) if (p.pivot) p.side = Math.sign(ax * (p.pivot[1] - M.center[1]) - ay * (p.pivot[0] - M.center[0])) || 1;
      const body = M.parts[0], legs = M.parts.slice(1);
      const piece = (c, p) => c.drawImage(img, p.a[0], p.a[1], p.a[2], p.a[3], p.at[0], p.at[1], p.a[2], p.a[3]);
      // 예전 그림과 같은 좌표(머리가 -y)에서 부른다. step: 걸음 위상(라디안), t: 시간.
      return function draw(c, step, t, moving) {
        if (!img.complete || !img.naturalWidth) return false;
        c.rotate(-Math.PI / 2 - M.axis); c.scale(UNIT, UNIT); c.translate(-M.center[0], -M.center[1]);
        if (M.legsOnTop) piece(c, body); // 배 쪽: 발끝이 배 위에 얹혀 있으므로 몸통 먼저
        for (const p of legs) {
          // 세 다리씩 번갈아(삼각 걸음). 멈춰 있으면 아주 작게 떨기만.
          const a = p.antenna ? Math.sin(t * 5.3 + 1.1) * p.amp + Math.sin(t * 13) * .03
            : (moving ? Math.sin(step + (p.group ? Math.PI : 0)) * p.amp : Math.sin(t * 9 + p.pivot[0]) * .025) * p.side;
          c.save(); c.translate(p.pivot[0], p.pivot[1]); c.rotate(a); c.translate(-p.pivot[0], -p.pivot[1]); piece(c, p); c.restore();
        }
        if (!M.legsOnTop) piece(c, body); // 등 쪽: 다리 위에 몸통
        return true;
      };
    }
    const back = model('@@data:assets/images/mri/roach-atlas.webp@@', { center: [215.8, 536.8], axis: 1.3465, length: 489.4, parts: [
      { name: 'body', a: [0, 0, 251, 486], at: [94, 290] },
      { name: 'leg0', a: [255, 0, 94, 441], at: [268, 11], pivot: [278.4, 434.8], group: 0, amp: .2 },   // 뒷다리
      { name: 'leg1', a: [353, 0, 120, 360], at: [4, 75], pivot: [101.4, 395.2], group: 1, amp: .2 },    // 뒷다리
      { name: 'leg2', a: [477, 0, 174, 167], at: [321, 462], pivot: [327.1, 599.5], group: 1, amp: .26 }, // 가운뎃다리
      { name: 'leg3', a: [655, 0, 193, 159], at: [328, 625], pivot: [330.5, 645.3], group: 0, amp: .26 }, // 앞다리
      { name: 'leg4', a: [0, 490, 115, 92], at: [43, 634], pivot: [150, 653.8], group: 0, amp: .3 },      // 가운뎃다리
      { name: 'leg5', a: [852, 0, 113, 112], at: [160, 724], pivot: [234.4, 757.2], group: 1, amp: .16 }, // 앞다리 + 더듬이
      { name: 'leg6', a: [119, 490, 36, 77], at: [282, 759], pivot: [292.2, 765.4], antenna: true, amp: .14 } // 더듬이
    ] });
    // 배 쪽: 다리 대부분이 배 위에 접혀 있어 몸통 조각에 남기고, 몸 밖으로 뻗은 발끝 5개 + 더듬이 1개만 따로 움직인다.
    //  (움직이는 발끝이 배 위에 걸친 자리는 몸통 조각에서 주변 색으로 메워, 발이 움직여도 밑에 같은 발이 비치지 않게 함)
    const belly = model('@@data:assets/images/mri/roach-belly-atlas.webp@@', { center: [448.7, 358.5], axis: -2.5761, length: 889.2, legsOnTop: true, parts: [
      { name: 'body', a: [0, 0, 792, 627], at: [59, 49] },
      { name: 'ant', a: [114, 631, 17, 101], at: [153, 0], pivot: [163, 95], antenna: true, amp: .14 },     // 더듬이
      { name: 'L1', a: [323, 631, 119, 40], at: [661, 237], pivot: [672, 248], group: 0, amp: .24 },        // 위 오른쪽 발끝
      { name: 'L2', a: [796, 0, 163, 135], at: [777, 387], pivot: [788, 398], group: 1, amp: .2 },          // 오른쪽 긴 발끝
      { name: 'L3', a: [135, 631, 184, 54], at: [730, 554], pivot: [740, 565], group: 0, amp: .2 },         // 아래 오른쪽 발끝
      { name: 'L4', a: [0, 631, 110, 115], at: [520, 550], pivot: [530, 560], group: 1, amp: .22 },         // 아래 가운데 발끝
      { name: 'L5', a: [446, 631, 100, 24], at: [491, 104], pivot: [500, 116], group: 1, amp: .2 }          // 위 가운데 발끝
    ] });
    // ---------- 디더링 ----------
    // 인트로 할배와 같은 식: 화면 높이에 점 400줄, 지각 밝기 → smoothstep(0.16, 0.88) → 4×4 베이어 → 검정/흰색.
    // 사진 위에 이 흑백 점 그림을 덮는 세기(불투명도): 등 쪽 0.5(11/17 「절반」), 배 쪽 0.65(11/18 「살짝만 더 높게」).
    // 원래 인트로 할배는 1.0 = 사진이 안 보이고 점만.
    const STRENGTH = .5, BELLY_STRENGTH = .65, ROWS = 400;
    const lin = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; lin[i] = v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }
    const enc = x => x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055;
    const bay = (x, y) => (2 * (x & 1) + 3 * (y & 1)) % 4;
    const small = document.createElement('canvas'), sc = small.getContext('2d', { willReadFrequently: true });
    function layer(strength) {
      const cv = document.createElement('canvas'), lc = cv.getContext('2d');
      return { cv, lc, strength, used: false };
    }
    const layers = [layer(STRENGTH), layer(BELLY_STRENGTH)]; // 0 = 등 쪽, 1 = 배 쪽(위에 그림)
    function begin(W, H, dpr) {
      for (const L of layers) {
        if (L.cv.width !== Math.round(W * dpr) || L.cv.height !== Math.round(H * dpr)) { L.cv.width = Math.round(W * dpr); L.cv.height = Math.round(H * dpr); }
        L.lc.setTransform(dpr, 0, 0, dpr, 0, 0); L.lc.clearRect(0, 0, W, H); L.used = false;
      }
      return layers[0].lc;
    }
    function dither(c, L, W, H) {
      const cell = H / ROWS, cols = Math.ceil(W / cell);
      if (small.width !== cols || small.height !== ROWS) { small.width = cols; small.height = ROWS; }
      sc.clearRect(0, 0, cols, ROWS); sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'medium'; sc.drawImage(L.cv, 0, 0, cols, ROWS);
      const im = sc.getImageData(0, 0, cols, ROWS), d = im.data;
      for (let y = 0, i = 0; y < ROWS; y++) for (let x = 0; x < cols; x++, i += 4) {
        if (d[i + 3] < 6) { d[i + 3] = 0; continue; }
        const v = enc(.2126 * lin[d[i]] + .7152 * lin[d[i + 1]] + .0722 * lin[d[i + 2]]);
        const s = Math.min(1, Math.max(0, (v - .16) / (.88 - .16))), sm = s * s * (3 - 2 * s);
        const th = (4 * bay(x, y) + bay(x >> 1, y >> 1) + .5) / 16, o = sm >= th ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = o;
      }
      sc.putImageData(im, 0, 0);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L.cv, 0, 0);
      c.globalAlpha = L.strength; c.imageSmoothingEnabled = false; c.drawImage(small, 0, 0, cols * cell * L.cv.width / W, ROWS * cell * L.cv.height / H);
      c.restore();
    }
    function finish(c, W, H) { for (const L of layers) if (L.used) dither(c, L, W, H); }
    return {
      // belly = true면 배 쪽 사진
      draw: (c, step, t, moving, isBelly) => (isBelly ? belly : back)(c, step, t, moving),
      begin, finish,
      ctx: isBelly => layers[isBelly ? 1 : 0].lc,
      mark: isBelly => { layers[isBelly ? 1 : 0].used = true; },
      strength: STRENGTH, bellyStrength: BELLY_STRENGTH, rows: ROWS
    };
  })();

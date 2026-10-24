(() => {
  'use strict';
  const E = MazeEngine, player = E.initial(), canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d', { alpha: false });
  const channel = 'speedrun-midterm-v1', held = new Map(), lens = .78;
  let width = 1, height = 1, scale = 1, active = true, raf = 0, last = 0, drag = false, lastPointer = null;
  const trail = E.createTrail(), footprints = trail.marks;
  const motionPreference = matchMedia('(prefers-reduced-motion:reduce-off)');
  const world = typeof MazeWorld !== 'undefined' ? MazeWorld.create(E,canvas) : null;
  let worldDelta=0;
  const walkingCamera = { stepLength: .74, amplitude: .010, rise: 12, settle: 10 };
  let cameraTravel = 0, cameraPhase = 0, cameraStrength = 0, cameraOffset = 0;
  const livesDisplay = document.getElementById('maze-lives'), narration = document.getElementById('maze-narration');
  const impactCover = document.getElementById('maze-impact'), status = document.getElementById('maze-status');
  const collisionLine = '나이가 들면 벽에 부딪히기만 해도 죽는다더니. 너도 이제 벽을 조심할 나이가 됐네.';
  let collisionLineSeen = false, failed = false, totalImpacts = 0;
  let impactTimer = 0, narrationTimer = 0;
  // 2026-10-13: every wall hit leaves a dark smear where the head met the wall.
  // It stays for the rest of this attempt. A faint groan plays with each hit;
  // the sound is one swappable file (#maze-groan).
  const wallMarks = [], groan = document.getElementById('maze-groan');
  let markSeed = 911;
  function stainSprite(seed) {
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const sprite = document.createElement('canvas'); sprite.width = 96; sprite.height = 144;
    const ink = sprite.getContext('2d'), cx = 48, cy = 50;
    ink.fillStyle = '#000';
    for (let k = 0; k < 7; k++) {
      const r = 7 + rnd() * 11, a = rnd() * Math.PI * 2, d = rnd() * 12;
      ink.beginPath(); ink.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, r, r * (.6 + rnd() * .5), rnd() * Math.PI, 0, Math.PI * 2); ink.fill();
    }
    for (let k = 0; k < 16; k++) {
      const a = rnd() * Math.PI * 2, d = 22 + rnd() * 22, r = .8 + rnd() * 2.6;
      ink.beginPath(); ink.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, r, 0, Math.PI * 2); ink.fill();
    }
    for (let k = 0, n = 1 + Math.floor(rnd() * 3); k < n; k++) {
      const x = cx - 13 + rnd() * 26, length = 26 + rnd() * 58, w = 2 + rnd() * 2.6;
      ink.fillRect(x - w / 2, cy + 4, w, length);
      ink.beginPath(); ink.arc(x, cy + 4 + length, w * .95, 0, Math.PI * 2); ink.fill();
    }
    return sprite;
  }
  function markWall() {
    const contact = player.contacts[player.contacts.length - 1];
    if (!contact) return;
    const axis = contact[0], sign = Number(contact.slice(1)), along = axis === 'x' ? 'z' : 'x';
    const plane = Math.round(player[axis] + sign * E.radius), cell = sign > 0 ? plane : plane - 1;
    const blocked = u => axis === 'x' ? E.wall(cell, Math.floor(u)) : E.wall(Math.floor(u), cell);
    let u = player[along];
    // Corner hits: slide the mark onto the wall cell that actually stopped the walk.
    if (!blocked(u)) u = blocked(u + E.radius) ? Math.floor(u + E.radius) + .07 : Math.ceil(u - E.radius) - .07;
    const rnd = () => (markSeed = (markSeed * 16807) % 2147483647) / 2147483647;
    wallMarks.push({ axis, plane: plane - sign * .004, face: axis + plane, u: u + (rnd() - .5) * .05,
      y: E.dimensions.eyeHeight - .06 + (rnd() - .5) * .08, w: .26 + rnd() * .06, h: .40, sprite: stainSprite(Math.floor(rnd() * 1e9) + 1) });
  }
  // 2026-10-13: 가이드 아닌 가이드. 시작하자마자 보이는 정면 벽(x=4)에 누가 매직으로 그려 둔 WASD 키 낙서.
  // 글로 된 안내는 없다. 삐뚤빼뚤한 손그림이라 글자 위치·크기가 조금씩 어긋난다.
  function doodleSprite() {
    const sprite = document.createElement('canvas'); sprite.width = 300; sprite.height = 222;
    const ink = sprite.getContext('2d');
    let s = 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, j = n => (rnd() - .5) * n;
    ink.strokeStyle = ink.fillStyle = '#000'; ink.lineCap = ink.lineJoin = 'round';
    const wobblyBox = (x, y, size) => {
      ink.lineWidth = 5 + rnd() * 2;
      ink.beginPath(); ink.moveTo(x + j(6), y + j(6));
      for (const [px, py] of [[x + size, y], [x + size, y + size], [x, y + size], [x, y - 2]]) ink.lineTo(px + j(9), py + j(9));
      ink.stroke();
    };
    const keys = [['W', 112, 18, -.06], ['A', 22, 112, .05], ['S', 116, 116, -.03], ['D', 208, 110, .08]];
    for (const [letter, x, y, tilt] of keys) {
      wobblyBox(x, y, 76 + j(8));
      ink.save(); ink.translate(x + 38 + j(6), y + 40 + j(6)); ink.rotate(tilt);
      ink.font = '700 ' + (46 + Math.round(j(8))) + 'px "Segoe Print","Comic Sans MS",cursive'; ink.textAlign = 'center'; ink.textBaseline = 'middle';
      ink.fillText(letter, 0, 0); ink.restore();
    }
    // 매직이 마르며 흘러내린 자국 하나
    ink.lineWidth = 3; ink.beginPath(); ink.moveTo(250, 186); ink.lineTo(251, 214); ink.stroke();
    return sprite;
  }
  wallMarks.push({ axis: 'x', plane: 4 - .004, face: 'x4', u: 1.47, y: E.dimensions.eyeHeight + .1, w: .66, h: .49, sprite: doodleSprite() });
  function drawWallMarks() {
    const strips = 6;
    for (const m of wallMarks) {
      const at = (u, y) => m.axis === 'x' ? project(m.plane, u, y) : project(u, m.plane, y);
      const centre = at(m.u, m.y);
      if (!centre || centre.x < -width || centre.x > width * 2) continue;
      const sw = m.sprite.width / strips, sh = m.sprite.height;
      for (let i = 0; i < strips; i++) {
        const u0 = m.u + (i / strips - .5) * m.w, u1 = m.u + ((i + 1) / strips - .5) * m.w;
        const middle = at((u0 + u1) / 2, m.y);
        if (!middle || middle.x < -40 || middle.x > width + 40) continue;
        // Same ray test as the guide's wall imprint: hidden behind corners.
        const hit = E.cast(player, middle.x / width * 2 - 1, lens);
        if (hit.face !== m.face || Math.abs(middle.depth - hit.distance) > .03) continue;
        const a = at(u0, m.y + m.h * .35), b = at(u1, m.y + m.h * .35), d = at(u0, m.y - m.h * .65);
        if (!a || !b || !d) continue;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.transform((b.x - a.x) / sw, (b.y - a.y) / sw, (d.x - a.x) / sh, (d.y - a.y) / sh, a.x, a.y);
        ctx.drawImage(m.sprite, i * sw, 0, sw, sh, 0, 0, sw * 1.04, sh);
        ctx.restore();
      }
    }
  }
  function groanOnce() {
    if (!groan) return;
    try {
      groan.pause(); groan.currentTime = 0; groan.volume = .38;
      groan.preservesPitch = false; groan.playbackRate = .95 + Math.random() * .1;
      groan.play()?.catch(() => {});
    } catch (_) {}
  }
  // Damage is shown only as vision loss: white fog and TV static creep in from
  // the screen edges, then withdraw while the player avoids the walls.
  livesDisplay.style.display = 'none';
  const vision = document.createElement('canvas'), visionCtx = vision.getContext('2d');
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16);
  let visionShown = 0, visionSeed = 1, visionImage = null;
  function renderLives() {}
  function drawVision(dt) {
    const target = player.damage / E.motion.maxDamage;
    visionShown += (target - visionShown) * (1 - Math.exp(-(target > visionShown ? 14 : 4) * dt));
    if (Math.abs(target - visionShown) < .002) visionShown = target;
    canvas.dataset.vision = visionShown.toFixed(3);
    if (visionShown < .004) return;
    const cell = 3, w = Math.ceil(width / cell), h = Math.ceil(height / cell);
    if (vision.width !== w || vision.height !== h) { vision.width = w; vision.height = h; visionImage = visionCtx.createImageData(w, h); }
    const data = visionImage.data, still = motionPreference.matches;
    let seed = still ? 7 : (visionSeed = (visionSeed * 16807) % 2147483647);
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Front: 1 at the edges, 0 at the centre. Full damage leaves a small hole.
    const front = 1 - visionShown * .78, band = .10 + visionShown * .16;
    const tear = !still && visionShown > .45 ? Math.floor(random() * h) : -1;
    for (let y = 0; y < h; y++) {
      const ny = Math.abs(y / (h - 1) * 2 - 1), shift = tear >= 0 && Math.abs(y - tear) < 3 + visionShown * 6 ? .06 : 0;
      for (let x = 0; x < w; x++) {
        const nx = Math.abs(x / (w - 1) * 2 - 1);
        const d = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), .25) + shift;
        const dither = bayer[(y & 3) * 4 + (x & 3)], i = (y * w + x) * 4;
        let value = -1;
        if (d > front + band * .5 + (dither - .5) * .08) value = random() < .015 + visionShown * .03 ? 0 : 255; // mostly white fog, sparse specks
        else if (d > front - band * .5) {
          const t = (d - (front - band * .5)) / band; // 0 inner edge → 1 fog
          if (random() < t * .9) value = random() < .5 ? 0 : 255; // static
        }
        if (value < 0) { data[i + 3] = 0; continue; }
        data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
      }
    }
    visionCtx.putImageData(visionImage, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(vision, 0, 0, width, height); ctx.restore();
  }
  function stopFeedback() {
    clearTimeout(impactTimer); clearTimeout(narrationTimer);
    impactCover.dataset.on = 'false'; narration.hidden = true;
  }
  function fail() {
    if (failed || !active) return;
    failed = true; active = false; clear(); stopFeedback(); cancelAnimationFrame(raf);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    status.textContent = '시야가 모두 흐려졌습니다. 땅파기 로비로 돌아갑니다.';
    parent.postMessage({ channel, type: 'fail' }, '*');
  }
  function impact() {
    totalImpacts++; renderLives(); markWall(); groanOnce();
    impactCover.dataset.on = 'true'; clearTimeout(impactTimer);
    impactTimer = setTimeout(() => { impactCover.dataset.on = 'false'; }, 240);
    let announcement = '벽에 부딪혔습니다. 시야 가장자리가 흐려집니다.';
    if (!collisionLineSeen) {
      collisionLineSeen = true;
      narration.textContent = collisionLine; narration.hidden = false;
      announcement += ` ${collisionLine}`;
      parent.postMessage({ channel, type: 'maze-collision-line-seen' }, '*');
      narrationTimer = setTimeout(() => { narration.hidden = true; }, 8500);
    }
    status.textContent = announcement;
    if (player.dead) fail();
  }
  const ghost = MazeGuide.create(E), { actor, trail: ghostTrail, wall: ghostWall } = ghost.state;
  const walkerArt = document.getElementById('guide-walker-art'), spriteWidth = 414, spriteHeight = 640;
  // Measured nontransparent vertical bounds in the two existing PNG frames.
  // Cropping this padding makes the actual soles meet elevation zero.
  const frameBounds = [[24, 1086], [24, 1097]];
  const spriteFrames = [], crossingLayer = document.createElement('canvas'), imprintLayer = document.createElement('canvas');
  for (const layer of [crossingLayer, imprintLayer]) { layer.width = spriteWidth; layer.height = spriteHeight; }
  const crossingCtx = crossingLayer.getContext('2d'), imprintCtx = imprintLayer.getContext('2d');
  const wallLayer = document.createElement('canvas'), wallPaint = wallLayer.getContext('2d');
  let lastImprintProgress = -1, imprintSource = null;
  let ghostAlpha = 0, ghostTime = 0, ghostReduced = false;
  StageGuide.create({
    duration: MazeGuide.duration,
    step(time, before, reduced) {
      ghost.advance(time, reduced);
      ghostTime = time; ghostReduced = reduced;
      document.body.dataset.guideAction = ghost.state.phase;
    },
    render(time, reduced, alpha) { ghostAlpha = alpha * Math.min(1, time / 650); ghostReduced = reduced; },
    hide() { ghostAlpha = 0; draw(); }
  });
  function project(x, z, elevation = 0) {
    const dx = x - player.x, dz = z - player.z, depth = dx * Math.cos(player.yaw) + dz * Math.sin(player.yaw);
    if (depth <= .08) return null;
    const lateral = -dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw), focal = width / (2 * lens);
    return { x: width * .5 + lateral / depth * focal, y: height * (.5 + player.pitch) + (E.dimensions.eyeHeight + cameraOffset - elevation) / depth * focal, depth, focal };
  }
  function prepareSprites() {
    if (spriteFrames.length) return true;
    if (!walkerArt.complete || !walkerArt.naturalWidth) return false;
    for (let column = 0; column < 2; column++) {
      const frame = document.createElement('canvas'); frame.width = spriteWidth; frame.height = spriteHeight;
      const ink = frame.getContext('2d');
      ink.filter = 'grayscale(1) contrast(12) url(#guide-opaque)';
      const [top, bottom] = frameBounds[column];
      ink.drawImage(walkerArt, column * walkerArt.naturalWidth / 2, top, walkerArt.naturalWidth / 2, bottom - top, 0, 0, spriteWidth, spriteHeight);
      spriteFrames.push(frame);
    }
    // Reuse the body's alpha as a damp contact stain. No ink outline remains.
    imprintSource = document.createElement('canvas'); imprintSource.width = spriteWidth; imprintSource.height = spriteHeight;
    const print = imprintSource.getContext('2d'), pose = spriteFrames[Math.floor(MazeGuide.contact / 520) % 2];
    print.drawImage(pose, 0, 0); print.globalCompositeOperation = 'source-in';
    const damp = print.createLinearGradient(0, 0, spriteWidth * .18, spriteHeight);
    for (const [at, color] of [[0, '#b9b9b9'], [.23, '#a3a3a3'], [.57, '#bfbfbf'], [.82, '#aaa'], [1, '#969696']]) damp.addColorStop(at, color);
    print.fillStyle = damp; print.fillRect(0, 0, spriteWidth, spriteHeight);
    print.globalCompositeOperation = 'source-atop';
    for (const [x, y, radius, light] of [[.50,.14,.20,true],[.37,.29,.24,false],[.66,.37,.18,true],[.45,.54,.28,true],[.62,.69,.17,false],[.48,.87,.22,true]]) {
      const patch = print.createRadialGradient(x * spriteWidth, y * spriteHeight, 0, x * spriteWidth, y * spriteHeight, radius * spriteHeight);
      patch.addColorStop(0, light ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.09)'); patch.addColorStop(1, 'transparent');
      print.fillStyle = patch; print.fillRect(0, 0, spriteWidth, spriteHeight);
    }
    return true;
  }
  function crossingMask(target, progress, reveal) {
    // A soft front travels from the head to the feet. White fill is removed
    // with the ink, so the corridor returns gradually only at wall contact.
    target.globalCompositeOperation = 'destination-in';
    const front = (-.22 + progress * 1.44) * spriteHeight;
    const gradient = target.createLinearGradient(0, front - spriteHeight * .20, 0, front + spriteHeight * .20);
    gradient.addColorStop(0, reveal ? '#000' : 'transparent');
    gradient.addColorStop(1, reveal ? 'transparent' : '#000');
    target.fillStyle = gradient; target.fillRect(0, 0, spriteWidth, spriteHeight);
    target.globalCompositeOperation = 'source-over';
  }
  function drawWallImprint() {
    const progress = ghost.state.progress;
    if (!progress || player.x >= ghostWall.x || !prepareSprites()) return;
    if (progress !== lastImprintProgress) {
      imprintCtx.clearRect(0, 0, spriteWidth, spriteHeight);
      imprintCtx.filter = 'blur(1.1px)'; imprintCtx.drawImage(imprintSource, 0, 0); imprintCtx.filter = 'none';
      if (!ghostReduced) crossingMask(imprintCtx, progress, true);
      lastImprintProgress = progress;
    }
    // Project narrow strips onto the actual wall plane, not onto a billboard.
    // Ray depth clips the impression behind corners as the player looks around.
    const wallX = ghostWall.x - .004;
    const left = project(wallX, ghostWall.z - ghostWall.width / 2, .5), right = project(wallX, ghostWall.z + ghostWall.width / 2, .5);
    const strips = left && right ? Math.max(4, Math.min(64, Math.ceil(Math.abs(right.x - left.x) / 4))) : 64;
    const visibleStrips = [];
    wallPaint.setTransform(scale, 0, 0, scale, 0, 0); wallPaint.clearRect(0, 0, width, height);
    wallPaint.save(); wallPaint.beginPath();
    for (let i = 0; i < strips; i++) {
      const z0 = ghostWall.z + (i / strips - .5) * ghostWall.width;
      const z1 = ghostWall.z + ((i + 1) / strips - .5) * ghostWall.width;
      const middle = project(wallX, (z0 + z1) / 2, .5);
      if (!middle || middle.x < -8 || middle.x > width + 8) continue;
      const hit = E.cast(player, middle.x / width * 2 - 1, lens);
      if (hit.face !== ghostWall.face || Math.abs(middle.depth - hit.distance) > .025) continue;
      const a = project(wallX, z0, ghostWall.top), b = project(wallX, z1, ghostWall.top);
      const c = project(wallX, z1, ghostWall.bottom), d = project(wallX, z0, ghostWall.bottom);
      if (!a || !b || !c || !d || b.x <= a.x) continue;
      wallPaint.moveTo(a.x, a.y); wallPaint.lineTo(b.x, b.y); wallPaint.lineTo(c.x, c.y); wallPaint.lineTo(d.x, d.y); wallPaint.closePath();
      visibleStrips.push({ i, a, b, c, d });
    }
    // Composite the whole stain once: individual translucent strips would
    // darken their shared edges and create unwanted vertical seams.
    wallPaint.clip();
    for (const { i, a, b, c, d } of visibleStrips) {
      const top = Math.min(a.y, b.y), bottom = Math.max(c.y, d.y);
      wallPaint.drawImage(imprintLayer, i / strips * spriteWidth, 0, spriteWidth / strips, spriteHeight, a.x, top, b.x - a.x + .6, bottom - top);
    }
    wallPaint.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .64 * (ghostReduced ? progress : 1);
    ctx.drawImage(wallLayer, 0, 0, width, height);
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    const frame=world?.render(player,{width,height,lens,cameraOffset,reduced:motionPreference.matches,dt:worldDelta,footprints});worldDelta=0;
    if(frame){ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,0,0,width,height);}
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const focal = width / (2 * lens), horizon = height * (.5 + player.pitch), samples = [], step = Math.max(1, width / 700);
    for (let x = 0; x <= width + step; x += step) {
      const hit = E.cast(player, x / width * 2 - 1, lens), size = focal / hit.distance;
      const outdoor = typeof MazeAlley !== 'undefined' ? MazeAlley.surfaceAt(E, player, x / width * 2 - 1, lens, hit) : null;
      samples.push({ x, top: horizon + (E.dimensions.eyeHeight + cameraOffset - (outdoor?.height || E.dimensions.wallHeight)) * size, bottom: horizon + (E.dimensions.eyeHeight + cameraOffset) * size, ...hit, outdoor: !!outdoor });
    }
    // Ink only at changes of plane. Collinear wall tiles share a single outline.
    for (const edge of ['top', 'bottom']) {
      ctx.beginPath();
      let continuing = false;
      samples.forEach((s, i) => {
        if (frame && edge === 'top' && s.outdoor) { continuing = false; return; }
        if (!continuing || i === 0 || s.face !== samples[i - 1].face) ctx.moveTo(s.x, s[edge]); else ctx.lineTo(s.x, s[edge]);
        continuing = true;
      });
      ctx.stroke();
    }
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (a.face === b.face) continue;
      const near = a.distance < b.distance ? a : b;
      if (frame && near.outdoor) continue;
      ctx.beginPath(); ctx.moveTo((a.x + b.x) / 2, near.top); ctx.lineTo((a.x + b.x) / 2, near.bottom); ctx.stroke();
    }
    const visible = p => p && p.x > -30 && p.x < width + 30 && p.depth < E.cast(player, p.x / width * 2 - 1, lens).distance + .03;
    for (const foot of [...ghostTrail.marks, ...(frame?[]:footprints)]) {
      ctx.globalAlpha = ghostTrail.marks.includes(foot) ? .32 : 1;
      const p = project(foot.x, foot.z, .002);
      if (!visible(p) || p.y > height + 40) continue;
      const poly = [[-.029, -.065], [.027, -.068], [.03, .038], [.016, .064], [-.026, .049]].map(([across, along]) => project(foot.x + foot.dx * along - foot.dz * across, foot.z + foot.dz * along + foot.dx * across, .002));
      if (poly.some(point => !point)) continue;
      ctx.beginPath(); poly.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const door = project(E.exit.x, E.exit.z, 0);
    if (!frame && visible(door)) {
      const top = project(E.exit.x, E.exit.z, E.dimensions.doorHeight), w = focal * E.dimensions.doorWidth / door.depth;
      ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(door.x - w / 2, door.y); ctx.lineTo(door.x - w / 2 + .6, top.y); ctx.lineTo(door.x + w / 2, top.y + .8); ctx.lineTo(door.x + w / 2, door.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(door.x - w / 2 + 4, top.y + 3); ctx.lineTo(door.x + w * .13, top.y + w * .2); ctx.lineTo(door.x + w * .13, door.y - w * .2); ctx.lineTo(door.x - w / 2 + 4, door.y - 3); ctx.stroke();
    }
    drawWallImprint(); drawWallMarks();
    if (ghostAlpha > 0 && ghost.state.progress < 1 && prepareSprites()) {
      const progress = ghost.state.progress;
      const column = ghostReduced ? 0 : Math.floor((progress ? MazeGuide.contact : ghostTime) / 520) % 2;
      let sprite = spriteFrames[column];
      if (progress && !ghostReduced) {
        crossingCtx.clearRect(0, 0, spriteWidth, spriteHeight); crossingCtx.drawImage(sprite, 0, 0);
        crossingMask(crossingCtx, progress, false); sprite = crossingLayer;
      }
      const drawActor = (back, opacity) => {
        const x = Math.min(actor.x - back, ghostWall.x - .006);
        const feet = project(x, actor.z, 0), head = project(x, actor.z, E.dimensions.guideHeight);
        if (!visible(feet) || !head) return;
        const h = feet.y-head.y, w = h * spriteWidth / spriteHeight, sway = ghostReduced || progress ? 0 : Math.sin(ghostTime / 260) * h * .006;
        ctx.globalAlpha = opacity * ghostAlpha * (ghostReduced ? 1 - progress : 1);
        ctx.drawImage(sprite, feet.x-w/2+sway, head.y, w, h);
      };
      if (!ghostReduced) drawActor(.045,.075 * (1 - progress));
      drawActor(0,1); ctx.globalAlpha = 1;
    }
    // DOM telemetry is inspectable without exposing a gameplay or test control.
    canvas.dataset.x = player.x.toFixed(3); canvas.dataset.z = player.z.toFixed(3); canvas.dataset.yaw = player.yaw.toFixed(3); canvas.dataset.pitch = player.pitch.toFixed(3);
    canvas.dataset.footprints = String(footprints.length);
    canvas.dataset.guideFootprints = String(ghostTrail.marks.length);
    canvas.dataset.guideCrossing = ghost.state.progress.toFixed(2);
    canvas.dataset.guideWallMarks = ghost.state.progress > 0 ? '1' : '0';
    canvas.dataset.cameraBob = cameraOffset.toFixed(5);
    canvas.dataset.cameraMotion = cameraStrength > .001 ? 'walking' : 'still';
    canvas.dataset.velocityX = player.vx.toFixed(4); canvas.dataset.velocityZ = player.vz.toFixed(4);
    canvas.dataset.speed = Math.hypot(player.vx, player.vz).toFixed(4);
    canvas.dataset.damage = player.damage.toFixed(3); canvas.dataset.impacts = String(totalImpacts); canvas.dataset.wallMarks = String(wallMarks.length);
    canvas.dataset.phase = failed ? 'failed' : player.finished ? 'complete' : 'playing';
    canvas.dataset.collisionLineSeen = String(collisionLineSeen);
  }
  function complete() {
    if (!active || !player.finished) return;
    active = false; clear(); stopFeedback();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    parent.postMessage({ channel, type: 'complete' }, '*');
  }
  function movePlayer(forward, sideways, dt) {
    if (!active) return;
    const x = player.x, z = player.z, impacts = player.impacts;
    E.step(player, forward, sideways, dt, trail);
    cameraTravel += Math.hypot(player.x - x, player.z - z);
    if (player.impacts !== impacts) impact();
  }
  function updateCamera(dt) {
    const distance = cameraTravel; cameraTravel = 0;
    if (motionPreference.matches) { cameraPhase = cameraStrength = cameraOffset = 0; return; }
    const moving = distance > 1e-7;
    // Actual travel advances the rhythm, so collisions and opposing keys do
    // not produce walking in place. Stopping settles without another step.
    if (moving) cameraPhase = (cameraPhase + distance / walkingCamera.stepLength * Math.PI * 2) % (Math.PI * 2);
    const rate = moving ? walkingCamera.rise : walkingCamera.settle;
    cameraStrength += ((moving ? 1 : 0) - cameraStrength) * (1 - Math.exp(-rate * dt));
    cameraOffset = Math.sin(cameraPhase) * walkingCamera.amplitude * cameraStrength;
    if (!moving && cameraStrength < .001) cameraPhase = cameraStrength = cameraOffset = 0;
  }
  motionPreference.addEventListener('change', () => { if (motionPreference.matches) { cameraPhase = cameraStrength = cameraOffset = cameraTravel = 0; draw(); } });
  function tick(time) {
    raf = 0; if (!active) return;
    canvas.dataset.frameMs = last ? (time-last).toFixed(1) : '0';
    const dt = last ? Math.min((time - last) / 1000, .045) : 0; last = time;
    worldDelta = document.hidden ? 0 : dt;
    if (!document.hidden) movePlayer(Number(held.has('KeyW')) - Number(held.has('KeyS')), Number(held.has('KeyD')) - Number(held.has('KeyA')), dt);
    updateCamera(dt);
    draw(); drawVision(dt); complete(); if (active) raf = requestAnimationFrame(tick);
  }
  function clear() { held.clear(); drag = false; lastPointer = null; E.stop(player); }
  canvas.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Tab' && document.pointerLockElement === canvas) {
      event.preventDefault(); document.exitPointerLock(); clear();
      document.getElementById('stage-back').focus({ preventScroll: true }); return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault(); if (!held.has(event.code)) held.set(event.code, performance.now()); return;
    }
    // Keyboard-only access supplements the primary mouse look.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); if (!event.repeat) E.look(player, (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 2, 0); }
  });
  canvas.addEventListener('keyup', event => {
    if (!active) return;
    const started = held.get(event.code);
    if (started === undefined) return;
    event.preventDefault(); held.delete(event.code);
    const remaining = Math.max(0, .07 - (performance.now() - started) / 1000);
    if (remaining) movePlayer(event.code === 'KeyW' ? 1 : event.code === 'KeyS' ? -1 : 0, event.code === 'KeyD' ? 1 : event.code === 'KeyA' ? -1 : 0, remaining);
    draw(); complete();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !active) return;
    canvas.focus(); drag = true; lastPointer = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'mouse' && canvas.requestPointerLock) {
      try { const request = canvas.requestPointerLock(); request?.catch(() => {}); } catch (_) { /* Drag look remains available when locking is disallowed. */ }
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (!active) return;
    if (document.pointerLockElement === canvas) E.look(player, event.movementX * .0027, -event.movementY * .0025);
    else if (drag && lastPointer) {
      E.look(player, (event.clientX - lastPointer.x) * .0027, -(event.clientY - lastPointer.y) * .0025);
      lastPointer = { x: event.clientX, y: event.clientY };
    }
  });
  window.addEventListener('pointerup', () => { drag = false; lastPointer = null; });
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', () => { active=false;clear();cancelAnimationFrame(raf);world?.dispose(); });
  canvas.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); last = 0; });
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'pause') { active = false; clear(); stopFeedback(); cancelAnimationFrame(raf); if (document.pointerLockElement === canvas) document.exitPointerLock(); }
    if (event.data.type === 'maze-state') collisionLineSeen ||= event.data.collisionLineSeen === true;
    if (event.data.type === 'focus') canvas.focus({ preventScroll: true });
  });
  function resize() { width = Math.max(1, innerWidth); height = Math.max(1, innerHeight); scale = Math.min(devicePixelRatio || 1, 2); canvas.width = wallLayer.width = Math.round(width * scale); canvas.height = wallLayer.height = Math.round(height * scale); draw(); }
  window.addEventListener('resize', resize); renderLives(); resize(); raf = requestAnimationFrame(tick);
})();

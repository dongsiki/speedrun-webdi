// 기억(치매) 스테이지 페이즈 장면(2026-10-29, Claude Code). 설정은 phases.js, 그림은 phase-images.js(Codex 그림 → make-phase-images.cjs).
// 아이 맵(엄마 그림·아이 소품·엄마 말 자막), 어질러진 집(그림 더미), 이상한 음식(그림 + 날파리 + 씹는 소리 + 화면 울렁임),
// 3페 마지막 회차의 현관 너머 길(헤드라이트 → 흰 빛 → 암전 → 기계 숨소리).
// 그림은 전부 Codex가 만든 PNG이고, 여기서는 붙일 자리·보이기·움직임만 정한다. 그림이 없으면 그 자리는 비어 있다.
(function (root) {
  'use strict';
  const IMAGES = root.MemoryPhaseImages || {};

  // bedroom-taste.js와 같은 처리: 순수 흑/백으로 바꾸고, 가장자리에서 이어지는 흰 바탕만 투명하게.
  function loadInto(THREE, name, mat, renderer) {
    const src = IMAGES[name];
    if (!src) return false;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const surface = document.createElement('canvas'); surface.width = w; surface.height = h;
      const g = surface.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, w, h), px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const v = (px[i] * .2126 + px[i + 1] * .7152 + px[i + 2] * .0722) > 140 ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
      }
      const seen = new Uint8Array(w * h), stack = [];
      for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
      while (stack.length) {
        const i = stack.pop();
        if (seen[i] || px[i * 4] === 0) continue;
        seen[i] = 1; px[i * 4 + 3] = 0;
        const x = i % w;
        if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1);
        if (i >= w) stack.push(i - w); if (i < w * (h - 1)) stack.push(i + w);
      }
      g.putImageData(data, 0, 0);
      const texture = new THREE.CanvasTexture(surface);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.map = texture; mat.opacity = 1; mat.needsUpdate = true;
      // 그림 비율에 맞춰 높이를 고친다(폭 기준).
      for (const plane of mat.userData.planes || []) plane.scale.y = plane.userData.baseW * h / w / plane.userData.baseH;
    };
    img.src = src;
    return true;
  }

  function create(ctx) {
    const { THREE, scene, stages, renderer, camera, tone, audioRef } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const mats = {};
    function matFor(name) {
      if (!mats[name]) {
        const m = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: false, alphaTest: .5, side: THREE.DoubleSide });
        m.userData.planes = [];
        if (!loadInto(THREE, name, m, renderer)) m.visible = false;
        mats[name] = m;
      }
      return mats[name];
    }
    const billboards = [];
    // 세워 두는 그림 한 장. w = 폭(m), h = 대략 높이(그림이 들어오면 비율로 고침). bottom = 바닥에 닿는 높이.
    function standee(parent, name, w, h, x, bottom, z, { face = true, list = null } = {}) {
      const mat = matFor(name);
      const holder = new THREE.Group(); holder.position.set(x, bottom, z); parent.add(holder);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      plane.geometry.translate(0, h / 2, 0);
      plane.userData.tasteCutout = true; plane.userData.baseW = w; plane.userData.baseH = h;
      mat.userData.planes.push(plane);
      holder.add(plane);
      if (face) billboards.push(holder);
      if (list) list.push(holder);
      return holder;
    }
    const [bath, kitchen, entry, bedroom] = stages;

    // --- 엄마: 방마다 한 명씩 서 있다(보이는 건 아이 맵에서 그 방에 있을 때만) ---
    // 2026-10-31: 세운 그림 대신 Codex 3D 엄마 모델(모델이 없으면 예전 그림).
    const MM = root.MemoryPhaseModels;
    const hasMom = !!(MM && MM.has('mom'));
    function momFigure(parent, x, z) {
      if (!hasMom) return standee(parent, 'mom-stand', 1.05, 1.6, x, 0, z);
      const m = MM.build(THREE, 'mom');
      const holder = new THREE.Group(); holder.position.set(x, 0, z); parent.add(holder);
      m.group.scale.setScalar(1.6 / m.height); holder.add(m.group);
      if (m.parts.brush) m.parts.brush.visible = false;
      holder.userData.mom = m; billboards.push(holder);
      return holder;
    }
    const mom = [
      momFigure(bath.group, .55, -1.95),
      momFigure(kitchen.group, .95, -1.95),
      momFigure(entry.group, -.95, -1.70),
      momFigure(bedroom.group, .95, -1.05)
    ];
    // 엄마 손 + 칫솔: 양치하는 동안 눈앞에서 왔다 갔다 한다(카메라 앞에 둔다).
    const brush = new THREE.Group(); scene.add(brush); brush.visible = false;
    // 양치: 화장실 엄마가 아이 옆(오른쪽)으로 와서 오른팔을 들어 칫솔질해 준다(같은 3D 모델).
    let brushArm = null;
    const bathMom = mom[0].userData.mom;
    if (bathMom && bathMom.parts.armR) {
      const arm = bathMom.parts.armR, tool = bathMom.parts.brush;
      if (tool) { bathMom.group.remove(tool); arm.add(tool); tool.position.set(tool.userData.pivot[0] - arm.userData.pivot[0], tool.userData.pivot[1] - arm.userData.pivot[1], tool.userData.pivot[2] - arm.userData.pivot[2]); }
      brushArm = { holder: mom[0], arm, tool, home: mom[0].position.clone() };
    }
    if (!brushArm) standee(brush, 'mom-hand-brush', .34, .34, 0, -.17, 0, { face: false });

    // --- 아이 소품(침실). 아이 맵에서는 할아버지 꾸밈 그림(교복·화장품·액자)을 치운다 ---
    const kidProps = [
      standee(bedroom.group, 'kid-bear', .42, .42, .30, .58, .30),
      standee(bedroom.group, 'kid-drawing', .95, .80, 1.72, 1.05, -2.68, { face: false }),
      standee(bedroom.group, 'kid-backpack', .55, .55, -1.55, 0, -2.35)
    ];
    const tasteCutouts = [];
    bedroom.group.traverse(o => { if (o.isMesh && o.userData.tasteCutout && !o.userData.baseW) tasteCutouts.push(o); });

    // --- 어질러진 집: [그림, 폭, 높이, x, 바닥, z, 몇 단계부터] ---
    const MESS = [
      [bedroom, [['mess-clothes', 1.0, .55, 1.15, 0, -1.05, 1], ['mess-papers', .9, .4, -1.45, 0, -1.55, 2], ['mess-trash', .85, .85, 2.05, 0, -2.25, 3], ['mess-dishes', .5, .45, -1.55, .91, 1.30, 4]]],
      [bath, [['mess-clothes', 1.0, .55, 2.15, 0, -.55, 1], ['mess-trash', .85, .85, -2.35, 0, -1.25, 2], ['mess-papers', .9, .4, .85, 0, .15, 3], ['mess-clothes', .8, .45, -1.95, 0, .55, 4]]],
      [kitchen, [['mess-dishes', .6, .55, -1.75, .965, -2.25, 1], ['mess-trash', .85, .85, -2.40, 0, -.95, 1], ['mess-papers', .9, .4, .70, 0, .30, 2], ['mess-dishes', .45, .45, .62, .99, -.70, 3], ['mess-trash', .75, .75, 2.55, 0, -.85, 3], ['mess-clothes', 1.0, .55, .05, 0, 1.05, 4], ['mess-papers', .8, .4, -1.75, 0, .75, 4], ['mess-dishes', .5, .45, -2.45, 0, .20, 4]]],
      [entry, [['mess-clothes', 1.0, .55, -1.10, 0, .75, 1], ['mess-papers', .9, .4, .30, 0, -.55, 2], ['mess-trash', .85, .85, 1.15, 0, -1.65, 3], ['mess-trash', .7, .7, -1.20, 0, -1.10, 4], ['mess-dishes', .5, .45, .95, 0, .60, 4]]]
    ];
    const messItems = [];
    for (const [stage, items] of MESS) for (const [name, w, h, x, b, z, level] of items) {
      const s = standee(stage.group, name, w, h, x, b, z); s.userData.level = level; messItems.push(s);
    }

    // --- 이상한 음식: 접시 위 세 조각과 냉장고 안 쟁반에 그림을 얹는다 ---
    const FOODS = ['mold', 'rotten', 'tissue', 'soap'];
    const biteFoods = kitchen.bites.map(bite => {
      const box = bite.children.slice();
      const pics = {};
      for (const f of FOODS) { pics[f] = standee(bite, 'food-' + f, .22, .22, 0, -.035, 0); pics[f].visible = false; }
      return { bite, box, pics };
    });
    const fridgePics = {};
    const fridgeBoxes = kitchen.fridgeFood.children.slice(1);
    for (const f of FOODS) { fridgePics[f] = standee(kitchen.fridgeFood, 'food-' + f, .40, .30, 0, .02, 0); fridgePics[f].visible = false; }
    // 날파리: 접시 위를 맴도는 점 몇 개.
    const flyGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => V(0, 0, 0)));
    const flies = new THREE.Points(flyGeometry, new THREE.PointsMaterial({ color: 0x000000, size: .032, sizeAttenuation: true }));
    kitchen.group.add(flies); flies.visible = false;

    // --- 2페 바퀴벌레(2026-10-31, Codex 3D 모델): 달리다 멈추고, 멈추면 더듬이가 떨리고, 시선이 가까우면 도망 ---
    // 자리: [방, x0, x1, z0, z1, 높이]. 주방 바닥·식탁 위·냉장고 앞, 화장실 바닥·세면대.
    const ROACH_AREAS = {
      kitchen: [[kitchen, -2.3, 2.3, -2.2, 1.5, 0], [kitchen, -.50, .30, -.90, -.38, .998], [kitchen, 1.05, 2.1, -1.25, -.55, 0]],
      bath: [[bath, -2.3, 2.3, -2.0, 1.4, 0], [bath, -1.30, .05, -2.36, -2.10, 1.424]]
    };
    const roaches = [];
    if (MM && MM.has('cockroach')) for (let i = 0; i < 8; i++) {
      const m = MM.build(THREE, 'cockroach');
      m.group.scale.setScalar(1.6); m.group.visible = false;
      roaches.push({ m, area: null, run: 0, wait: 0, to: V(0, 0, 0), speed: .55 });
    }
    function placeRoaches(cfg) {
      for (const r of roaches) { r.m.group.visible = false; if (r.m.group.parent) r.m.group.parent.remove(r.m.group); }
      const n = cfg.roaches || 0; if (!n) return;
      const list = [];
      for (let i = 0; i < n; i++) list.push(ROACH_AREAS.kitchen[i % 3]);
      for (let i = 0; i < (cfg.bathRoaches || 0); i++) list.push(ROACH_AREAS.bath[i % 2]);
      list.slice(0, roaches.length).forEach((area, i) => {
        const r = roaches[i]; r.area = area; area[0].group.add(r.m.group); r.m.group.visible = true;
        r.m.group.position.set(area[1] + Math.random() * (area[2] - area[1]), area[5] + .002, area[3] + Math.random() * (area[4] - area[3]));
        r.m.group.rotation.y = Math.random() * Math.PI * 2; r.run = 0; r.wait = Math.random() * 1.5;
      });
    }
    const camLocal = V(0, 0, 0);
    function moveRoaches(dt, now) {
      for (const r of roaches) {
        const g = r.m.group; if (!g.visible || !g.parent || !g.parent.visible) continue;
        const a = r.area, p = g.position;
        camLocal.copy(camera.position); g.parent.worldToLocal(camLocal);
        const near = Math.hypot(camLocal.x - p.x, camLocal.z - p.z) < 1.1;
        if (r.run <= 0) {
          r.wait -= dt;
          const wig = Math.sin(now * 38 + p.x * 9) * .35;
          if (r.m.parts.antennaL) r.m.parts.antennaL.rotation.y = wig;
          if (r.m.parts.antennaR) r.m.parts.antennaR.rotation.y = -wig;
          if (r.wait <= 0 || near) {
            r.run = .3 + Math.random() * .5; r.speed = near ? .95 : .55;
            if (near) r.to.set(p.x + (p.x - camLocal.x) * 2, p.y, p.z + (p.z - camLocal.z) * 2);
            else r.to.set(a[1] + Math.random() * (a[2] - a[1]), p.y, a[3] + Math.random() * (a[4] - a[3]));
            r.to.x = Math.max(a[1], Math.min(a[2], r.to.x)); r.to.z = Math.max(a[3], Math.min(a[4], r.to.z));
          }
        } else {
          r.run -= dt; if (r.run <= 0) r.wait = 1 + Math.random();
          const dx = r.to.x - p.x, dz = r.to.z - p.z, d = Math.hypot(dx, dz);
          if (d > .01) { const k = Math.min(1, r.speed * dt / d); p.x += dx * k; p.z += dz * k; g.rotation.y = Math.atan2(dx, dz); }
          else r.run = 0;
          if (r.m.parts.legs) r.m.parts.legs.position.y = r.m.parts.legs.userData.pivot[1] + Math.abs(Math.sin(now * 60)) * .003;
        }
      }
    }

    // --- 2페 마지막 회차 컷신(엔딩 아님): 침대에서 낑낑 → 떨어짐 → 피 기침 → 쓰러짐 → 암전 ---
    const splats = ['blood-splat-1', 'blood-splat-2'].map((name, i) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matFor(name));
      plane.rotation.x = -Math.PI / 2; plane.position.set(-1.10 + i * .12, .006 + i * .002, 1.05 - i * .10);
      plane.visible = false; bedroom.group.add(plane); return plane;
    });
    const drops = document.createElement('img'); drops.id = 'memory-drops'; drops.alt = ''; drops.setAttribute('aria-hidden', 'true');
    if (root.MemoryPhaseImages && root.MemoryPhaseImages['blood-drops']) drops.src = root.MemoryPhaseImages['blood-drops'];
    (document.getElementById('experience') || document.body).append(drops);
    function groan(at) {
      const audio = audioRef(); if (!audio) return;
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + at;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(118, t0); o.frequency.linearRampToValueAtTime(150, t0 + .35); o.frequency.linearRampToValueAtTime(96, t0 + .8);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.035, t0 + .12); g.gain.linearRampToValueAtTime(0, t0 + .8);
      o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + .85); o.onended = () => { o.disconnect(); g.disconnect(); };
    }
    function cough(wet) { noiseBurst(.16, 520, .9, .55); setTimeout(() => noiseBurst(.22, wet ? 260 : 420, 1.2, .45), 130); }
    const smooth01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    // t(초) → 카메라 자리·시선·옆으로 기운 각도. 끝나면 done.
    function collapse(t, pos, target, start, startTarget) {
      const st = state.collapse || (state.collapse = {});
      const floor = V(-1.02, .24, 1.62), floorTarget = V(-.70, .10, -.40);
      let roll = 0;
      if (t < 3) {
        pos.copy(start); target.copy(startTarget);
        const heave = Math.max(0, Math.sin((t % 1) * Math.PI)) * smooth01(t * 3);
        pos.y += .16 * heave; target.y += .30 * heave;
        pos.x += Math.sin(t * 41) * .006 * heave; roll = Math.sin(t * 23) * .03 * heave;
        for (const k of [0, 1, 2]) if (t > k + .15 && !st['g' + k]) { st['g' + k] = true; groan(0); }
      } else if (t < 4) {
        const u = smooth01(t - 3);
        pos.lerpVectors(start, floor, u); pos.y += Math.sin(u * Math.PI) * .25;
        target.lerpVectors(startTarget, floorTarget, u);
        roll = -1.3 * Math.sin(u * Math.PI * .5) + .95 * u * u;
      } else {
        pos.copy(floor); target.copy(floorTarget); roll = -.35;
        if (!st.thud) { st.thud = true; tone(70, .25, .09, 'sine'); noiseBurst(.2, 160, .8, .6); }
        if (t < 4.35) pos.y += Math.sin((t - 4) * 60) * .02 * (1 - (t - 4) / .35);
        [4.5, 5.2, 5.9, 6.6].forEach((at, i) => {
          if (t > at && !st['c' + i]) { st['c' + i] = true; cough(i >= 2); if (i >= 2) splats[i - 2].visible = true; if (i === 2) drops.classList.add('show'); }
          const k = t - at; if (k > 0 && k < .3) { pos.y += Math.sin(k / .3 * Math.PI) * .045; target.y -= Math.sin(k / .3 * Math.PI) * .25; }
        });
        for (const [i, p] of splats.entries()) if (p.visible) p.scale.setScalar(.25 + .55 * smooth01((t - (5.9 + i * .7)) / 1.2));
        if (t > 7.2) { const u = smooth01((t - 7.2) / .8); roll = -.35 - 1.1 * u; pos.y -= .12 * u; target.y -= .2 * u; }
        if (t > 8.0 && flash.className !== 'black') { flash.className = 'black'; tone(55, .4, .05, 'sine'); }
      }
      return { roll, done: t > 9.5 };
    }
    function clearCollapse() { state.collapse = null; for (const p of splats) p.visible = false; drops.classList.remove('show'); }

    // --- 3페 마지막 회차: 현관 너머 길과 헤드라이트 ---
    const road = new THREE.Group(); entry.group.add(road); road.visible = false;
    // 집 밖은 까만 밤(안에서는 벽에 가려 안 보인다). 길 가운데 흰 점선.
    const night = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
    night.position.set(0, 6, -14); road.add(night);
    for (let z = -4.2; z > -22; z -= 1.6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(.12, .7), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, .01, z); road.add(dash);
    }
    // 문 뒤를 막고 있던 까만 판(entryway의 C.ink 상자)은 길이 열릴 때 치운다.
    let doorBlack = null;
    entry.group.traverse(o => { if (o.isMesh && Math.abs(o.position.z + 3.18) < .01 && Math.abs(o.position.y - 1.30) < .01) doorBlack = o; });
    const lights = [];
    for (const x of [-.55, .55]) {
      const disk = new THREE.Mesh(new THREE.CircleGeometry(.16, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      disk.position.set(x, .75, -9); road.add(disk); lights.push(disk);
    }

    // --- 자막(엄마 말)·화면 효과 ---
    const lineBox = document.createElement('p'); lineBox.id = 'mom-line'; lineBox.setAttribute('aria-live', 'polite');
    document.getElementById('experience').append(lineBox);
    const flash = document.createElement('div'); flash.id = 'memory-flash'; flash.setAttribute('aria-hidden', 'true');
    document.getElementById('experience').append(flash);
    let lineTimer = 0;
    function murmur(text) {
      // 엄마 목소리 대신 낮게 웅얼거리는 짧은 소리(글자 수만큼 2~5음).
      const n = Math.max(2, Math.min(5, Math.round(text.length / 4)));
      for (let i = 0; i < n; i++) setTimeout(() => tone(250 + Math.random() * 70, .14, .02, 'sine'), i * 120);
    }
    function say(text, ms = 2600) {
      clearTimeout(lineTimer);
      if (!text) { lineBox.classList.remove('show'); return; }
      lineBox.textContent = text; lineBox.classList.add('show');
      if (!state.lines?.silent) murmur(text);
      lineTimer = setTimeout(() => lineBox.classList.remove('show'), ms);
    }

    // --- 씹는 소리·삼키는 소리(합성) ---
    function noiseBurst(duration, freq, q, volume) {
      const audio = audioRef();
      if (!audio) return;
      const len = Math.floor(audio.sampleRate * duration), data = audio.createBuffer(1, len, audio.sampleRate), s = data.getChannelData(0);
      for (let i = 0; i < len; i++) s[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
      const src = audio.createBufferSource(); src.buffer = data;
      const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = audio.createGain(); g.gain.value = volume;
      src.connect(f); f.connect(g); g.connect(audio.destination); src.start();
      src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    }
    function chew() { noiseBurst(.11 + Math.random() * .09, 380 + Math.random() * 520, 1.6, .5); }
    function gulp() { tone(170, .22, .05, 'sine'); setTimeout(() => noiseBurst(.16, 260, 3, .35), 60); }
    function hiss() { noiseBurst(1.1, 1400, .7, .28); setTimeout(() => tone(90, .08, .05, 'square'), 1150); }

    const state = { phase: 1, cfg: null, lines: null, room: -1, served: false, chewAt: 0, lastBite: -1, ending: null };
    const canvas = document.getElementById('world');

    function setRound(phase, cfg) {
      state.phase = phase; state.cfg = cfg; state.lines = cfg.child ? root.MemoryPhase.lines(cfg.story) : null;
      state.served = false; state.ending = null; state.room = -1;
      const child = !!cfg.child;
      for (const m of mom) m.visible = child && !state.lines?.hidden;
      for (const p of kidProps) p.visible = child;
      for (const t of tasteCutouts) t.visible = !child;
      for (const s of messItems) s.visible = (cfg.mess || 0) >= s.userData.level;
      const food = cfg.food;
      for (const { box, pics } of biteFoods) {
        for (const b of box) b.visible = !food;
        for (const f of FOODS) pics[f].visible = food === f;
      }
      for (const b of fridgeBoxes) b.visible = !food;
      for (const f of FOODS) fridgePics[f].visible = food === f;
      flies.visible = false; road.visible = false; brush.visible = false; momArms(0); placeRoaches(cfg); clearCollapse(); if (doorBlack) doorBlack.visible = true;
      flash.className = ''; canvas.classList.remove('memory-queasy');
      say('');
      document.body.dataset.memoryPhase = String(phase);
      document.body.dataset.memoryChild = String(child);
      canvas.dataset.memoryPhase = String(phase);
      canvas.dataset.memoryMess = String(cfg.mess || 0);
      canvas.dataset.memoryFood = food || 'none';
      canvas.dataset.memoryChild = String(child);
      canvas.dataset.memoryStory = cfg.story || 'none';
    }
    // 방에 들어와 조작할 수 있게 됐을 때 한 번.
    function enterRoom(index) {
      if (state.room === index) return;
      state.room = index;
      if (!state.lines) return;
      if (index === 3) say(state.lines.wake);
      else say(state.lines.room[index] || '', index === 2 ? 3400 : 2600);
    }
    // 아이 키 눈높이: 서 있을 때 크게, 앉거나 누웠을 때 조금 낮춘다(식탁보다는 위).
    function childEye(position, target, amount = 1) { // amount: 1 = 아이 눈높이, 0 = 낮추지 않음(1페 3회차 거울 보기 동안 발돋움)
      if (!state.cfg?.child) return;
      const drop = amount * .5 * Math.max(0, Math.min(1, (position.y - 1.3) / .6));
      position.y -= drop; target.y -= drop * .55;
    }
    const tmp = V(0, 0, 0), right = V(0, 0, 0), up = V(0, 0, 0);
    let brushT = -1;
    function brushing(t) { // t: 0→1. 자리는 update()에서(그릴 때의 아이 눈높이 카메라 기준) 잡는다.
      brushT = t;
      brush.visible = t > .02 && t < .97;
      const lines = state.lines?.brush || ['', ''];
      if (t > .02 && !brush.userData.said0) { brush.userData.said0 = true; say(lines[0], 1600); }
      if (t > .70 && !brush.userData.said1) { brush.userData.said1 = true; say(lines[1], 1800); }
      if (t <= .02) brush.userData.said0 = brush.userData.said1 = false;
      if (t > .1 && t < .9 && Math.random() < .25) noiseBurst(.05, 2600, 2, .12);
    }
    function placeBrush() {
      if (!brush.visible) return;
      const t = brushT;
      camera.updateMatrixWorld(); camera.getWorldDirection(tmp);
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      const scrub = Math.sin(t * Math.PI * 22) * .06;
      if (brushArm) return; // 엄마 팔은 update() 끝의 momBrush()에서 움직인다.
      brush.position.copy(camera.position).addScaledVector(tmp, .42).addScaledVector(right, .02 + scrub).addScaledVector(up, -.10);
      brush.quaternion.copy(camera.quaternion);
    }
    // 엄마가 차려 주기: 0→1 동안 접시에 하나씩 놓인다.
    function momArms(k) { // 0 = 내린 팔, 1 = 두 팔을 앞으로(차려 주기)
      const mm = mom[1].userData.mom; if (!mm) return;
      for (const a of [mm.parts.armL, mm.parts.armR]) if (a) a.rotation.x = -1.2 * k;
    }
    function serving(t) {
      momArms(Math.sin(Math.PI * Math.min(1, t)));
      kitchen.bites.forEach((bite, i) => { bite.visible = t > (i + 1) / 4; });
      if (t > .2 && !state.served) { state.served = true; say(state.lines?.serve || '', 2000); }
    }
    function ate() { if (state.lines?.ate) say(state.lines.ate, 1800); }

    // 이상한 음식 먹기: 조각이 입으로 올 때마다 씹는 소리, 넘길 때 삼키는 소리, 화면 울렁임.
    function eating(t, biteCount = 3) {
      if (!state.cfg?.food) return;
      canvas.classList.toggle('memory-queasy', t > .02 && t < .99);
      const piece = Math.min(biteCount - 1, Math.floor(t * biteCount)), local = t * biteCount - piece;
      if (local > .45 && local < .95 && performance.now() > state.chewAt) { chew(); state.chewAt = performance.now() + 150 + Math.random() * 120; }
      if (local > .93 && state.lastBite !== piece) { state.lastBite = piece; gulp(); }
      if (t <= .01) state.lastBite = -1;
    }
    function endEating() { canvas.classList.remove('memory-queasy'); }

    // 3페 마지막: 문이 열리면 길. 헤드라이트가 다가오고, 흰 빛, 암전, 기계 숨소리 세 번.
    function roadOpen() { road.visible = !!(state.cfg && state.cfg.ending === 'road'); if (doorBlack) doorBlack.visible = !road.visible; }
    function ending(t) { // t: 초
      road.visible = true;
      const k = Math.min(1, t / 2.6);
      for (const d of lights) { d.position.z = -9 + 6.2 * k * k; d.scale.setScalar(1 + 3 * k * k); }
      if (t > 2.55 && flash.className === '') { flash.className = 'white'; tone(880, .5, .05, 'square'); }
      if (t > 3.3 && flash.className === 'white') flash.className = 'black';
      for (const [at, key] of [[4.2, 'h1'], [6.0, 'h2'], [7.8, 'h3']]) if (t > at && !state[key]) { state[key] = true; hiss(); }
      return t > 9.4;
    }
    function clearEnding() { flash.className = ''; state.h1 = state.h2 = state.h3 = false; }

    // 양치하는 동안: 엄마가 아이 오른쪽 바닥에 서서 오른팔(칫솔)을 아이 입으로 뻗고 좌우로 문지른다.
    const mouth = V(0, 0, 0), local = V(0, 0, 0);
    function momBrush() {
      if (!brushArm) return;
      const { holder, arm, tool } = brushArm, on = brush.visible;
      if (tool) tool.visible = on;
      if (!on) { holder.position.copy(brushArm.home); arm.quaternion.identity(); return; }
      camera.updateMatrixWorld(); camera.getWorldDirection(tmp); right.setFromMatrixColumn(camera.matrixWorld, 0);
      const flat = V(tmp.x, 0, tmp.z).normalize();
      const scrub = Math.sin(brushT * Math.PI * 22) * .04;
      // 손이 닿을 곳: 입 바로 앞(눈 아래). 엄마 어깨는 거기서 팔 길이만큼 오른쪽 뒤에 둔다.
      mouth.copy(camera.position).addScaledVector(flat, .13).addScaledVector(right, scrub); mouth.y -= .11;
      const s = holder.children[0].scale.x, pivot = arm.userData.pivot, reach = Math.max(.2, -arm.userData.box.min.y) * s * .96;
      const rise = pivot[1] * s - mouth.y, across = Math.sqrt(Math.max(.01, reach * reach - rise * rise));
      const hdir = V(right.x * .5 - flat.x * .87, 0, right.z * .5 - flat.z * .87).normalize();
      const sx = mouth.x + hdir.x * across, sz = mouth.z + hdir.z * across;
      const yaw = Math.atan2(camera.position.x - sx, camera.position.z - sz), c = Math.cos(yaw), si = Math.sin(yaw);
      holder.rotation.y = yaw;
      holder.position.set(sx - (pivot[0] * c + pivot[2] * si) * s, 0, sz - (-pivot[0] * si + pivot[2] * c) * s);
      holder.updateMatrixWorld(true);
      local.copy(mouth); arm.parent.worldToLocal(local);
      arm.quaternion.setFromUnitVectors(V(0, -1, 0), local.sub(arm.position).normalize());
      if (tool) { arm.updateMatrixWorld(true); tool.lookAt(camera.position.x, camera.position.y - .11, camera.position.z); }
    }
    function update(dt, info) {
      if (info.stageIndex !== 0 || !state.cfg?.child) brush.visible = false;
      placeBrush();
      for (const b of billboards) {
        if (!b.visible) continue;
        if (brushArm && b === brushArm.holder && brush.visible) continue;
        b.getWorldPosition(tmp);
        b.rotation.y = Math.atan2(camera.position.x - tmp.x, camera.position.z - tmp.z);
      }
      momBrush();
      moveRoaches(dt, performance.now() / 1000);
      // 날파리: 이상한 음식이 접시에 있으면 접시 위를 맴돈다.
      flies.visible = !!state.cfg?.food && info.stageIndex === 1 && kitchen.bites.some(b => b.visible);
      if (flies.visible) {
        kitchen.group.updateMatrixWorld();
        const c = V(-.10, 1.16, -.62), p = flyGeometry.attributes.position, now = performance.now() / 1000;
        for (let i = 0; i < p.count; i++) {
          const a = now * (2.2 + i * .37) + i * 1.7;
          p.setXYZ(i, c.x + Math.cos(a) * (.10 + .03 * Math.sin(now * 3 + i)), c.y + Math.sin(a * 1.9) * .05 + .03 * Math.sin(now * 7 + i), c.z + Math.sin(a) * (.10 + .02 * i % .05));
        }
        p.needsUpdate = true;
        if (Math.random() < dt * 1.5) tone(210 + Math.random() * 40, .25, .006, 'sawtooth');
      }
    }

    return {
      setRound, enterRoom, childEye, collapse, clearCollapse, brushing, serving, ate, eating, endEating, roadOpen, ending, clearEnding, update, say,
      get child() { return !!state.cfg?.child; },
      get phase() { return state.phase; },
      get served() { return state.served; },
      get cfg() { return state.cfg; }
    };
  }
  root.MemoryPhaseScenes = { create };
})(window);

/* 개발자용 02 미로 3페 — 미로 화면(iframe) 안에서 돈다(2026-10-29, Claude Code). 본편 01에는 들어가지 않는다.
   10/29 사용자: 「스토리 전개. 미로바닥이나 벽면에 화살표를 추가해서, 각 막히는 길 같은 데마다 뭐 내 기억의 단편을
   3d형태로 보여준다던가 아님 그림으로 보여준다던가. 하는식으로.」
   맵은 1페 그대로. 바닥 화살표(꺾이는 곳은 벽에도)가 다음 막다른 길까지만 보이고, 막다른 길 끝 벽에 기억의 단편 그림이 있다.
   네 곳을 다 보면 화살표가 출구로 이어진다. 그림은 window.MazeMemoryArt(Codex가 만든 그림, memory-art.js)에서 순서대로. */
(() => {
  'use strict';
  const R = window.MazeRuntime;
  if (!R || !R.world) return;
  const { E, player } = R, world = R.world, { T, scene } = world.kit;
  const art = Array.isArray(window.MazeMemoryArt) ? window.MazeMemoryArt : [];
  // 막다른 길 네 곳(시작에서 가까운 순서). 원래 맵(engine.js)에서 이웃 길이 하나뿐인 칸.
  const STOPS = [[9, 5], [19, 1], [7, 11], [19, 9]];
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const open = (x, z) => !E.wall(x, z);

  function path(from, to) {
    const key = p => p[0] + ',' + p[1], prev = new Map([[key(from), null]]), queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      if (c[0] === to[0] && c[1] === to[1]) break;
      for (const [dx, dz] of DIRS) {
        const n = [c[0] + dx, c[1] + dz];
        if (open(...n) && !prev.has(key(n))) { prev.set(key(n), c); queue.push(n); }
      }
    }
    const out = []; let c = to;
    while (c) { out.unshift(c); c = prev.get(key(c)); }
    return out;
  }

  // --- 손으로 그린 매직 화살표(→ 방향) ---
  function arrowTexture(seed) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 96;
    const ink = c.getContext('2d'); let s = seed;
    const j = n => ((s = (s * 16807) % 2147483647) / 2147483647 - .5) * n;
    ink.strokeStyle = '#000'; ink.lineCap = ink.lineJoin = 'round'; ink.lineWidth = 13;
    ink.beginPath(); ink.moveTo(14 + j(6), 48 + j(8)); ink.quadraticCurveTo(64, 46 + j(10), 104 + j(4), 48 + j(4)); ink.stroke();
    ink.beginPath(); ink.moveTo(72 + j(6), 20 + j(6)); ink.lineTo(108, 48 + j(3)); ink.lineTo(72 + j(6), 76 + j(6)); ink.stroke();
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.magFilter = T.NearestFilter;
    return new T.MeshBasicMaterial({ map, transparent: true, alphaTest: .5, side: T.DoubleSide, depthWrite: false });
  }
  const arrowMaterials = [11, 23, 37, 51].map(arrowTexture), arrowShape = new T.PlaneGeometry(.5, .375);
  let shown = [];
  function clearArrows() { for (const o of shown) scene.remove(o); shown = []; }
  function showArrows(cells) {
    clearArrows();
    for (let i = 0; i < cells.length - 1; i++) {
      const [x, z] = cells[i], [nx, nz] = cells[i + 1], dx = nx - x, dz = nz - z;
      const floor = new T.Group(), mark = new T.Mesh(arrowShape, arrowMaterials[(x * 3 + z) % 4]);
      mark.rotation.x = -Math.PI / 2; floor.add(mark);
      floor.position.set(x + .5 + dx * .12, .004, z + .5 + dz * .12); floor.rotation.y = Math.atan2(-dz, dx);
      scene.add(floor); shown.push(floor);
      // 꺾이는 곳: 걸어오던 쪽 정면 벽에도 꺾을 방향 화살표
      const before = cells[i - 1];
      if (before) {
        const ix = x - before[0], iz = z - before[1];
        if ((ix !== dx || iz !== dz) && !open(x + ix, z + iz)) {
          const yaw = Math.atan2(-ix, -iz), wallMark = new T.Mesh(arrowShape, arrowMaterials[(x + z) % 4]);
          wallMark.position.set(x + .5 + ix * .49, .52, z + .5 + iz * .49); wallMark.rotation.y = yaw;
          if (dx * Math.cos(yaw) - dz * Math.sin(yaw) < 0) wallMark.scale.x = -1;
          scene.add(wallMark); shown.push(wallMark);
        }
      }
    }
  }

  // --- 막다른 길 끝 벽의 그림: 멀리서는 빈 흰 종이, 다가가면 그림이 떠오른다(글 없음) ---
  const frames = STOPS.map(([x, z], i) => {
    const [ex, ez] = DIRS.find(([dx, dz]) => open(x + dx, z + dz)); // 들어오는 쪽
    const c = document.createElement('canvas'); c.width = 320; c.height = 240;
    const ink = c.getContext('2d'), map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    const image = new Image(); let ready = false; image.onload = () => { ready = true; paint(0); }; if (art[i]) image.src = art[i];
    const group = new T.Group(); group.position.set(x + .5 - ex * .44, 0, z + .5 - ez * .44); group.rotation.y = Math.atan2(ex, ez);
    world.kit.box(group, 0, .80, 0, .70, .54, .02, world.kit.black);
    const picture = world.kit.plane(group, 0, .80, .012, .64, .48, new T.MeshBasicMaterial({ map }));
    picture.name = 'memory-' + (i + 1); scene.add(group);
    let shownAlpha = -1;
    function paint(alpha) {
      ink.fillStyle = '#fff'; ink.fillRect(0, 0, c.width, c.height);
      if (ready && alpha > 0) { ink.globalAlpha = alpha; ink.drawImage(image, 0, 0, c.width, c.height); ink.globalAlpha = 1; }
      map.needsUpdate = true; shownAlpha = alpha;
    }
    paint(0);
    return { x, z, update(distance) {
      const alpha = Math.max(0, Math.min(1, (2.6 - distance) / 1.6));
      if (Math.abs(alpha - shownAlpha) > .04 || (alpha === 1 && shownAlpha !== 1)) paint(alpha);
    } };
  });

  let stop = 0;
  showArrows(path([1, 1], STOPS[0]));
  document.body.dataset.memoryStop = '0';
  world.addFrameHook(() => {
    for (const f of frames) f.update(Math.hypot(player.x - f.x - .5, player.z - f.z - .5));
    if (stop >= STOPS.length) return;
    const [x, z] = STOPS[stop];
    if (Math.hypot(player.x - x - .5, player.z - z - .5) < .75) {
      stop++; document.body.dataset.memoryStop = String(stop);
      const next = stop < STOPS.length ? STOPS[stop] : [Math.floor(E.exit.x), Math.floor(E.exit.z)];
      clearArrows();
      setTimeout(() => showArrows(path([x, z], next)), 1200);
    }
  });
  window.MazeDevPhase3 = { get stop() { return stop; }, stops: STOPS, art: art.length };
})();

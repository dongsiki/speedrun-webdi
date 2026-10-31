/* 개발자용 02 미로 2페 — 미로 화면(iframe) 안에서 돈다(2026-10-29, Claude Code). 본편 01에는 들어가지 않는다.
   10/29 사용자: 「원래 exit문이 글리치로 막히게 하고, 글리치로 막힌 걸 제대로 보는 순간(코드 적으로는 제대로 볼 만한 위치에
   트리거를 걸어서) 미로의 배경이 지금2페이즈처럼 꺼멓게 변하고, 음산하게 변하고, 공포적인 분위기를 연출하는걸로.
   뒤를 돌아보면 어쩌다 한 번 씩 벽에 붙어서 스토커처럼 아이든 아줌마든 누군가가 나를 몰래 본다던가 하는 연출도 넣으면 좋겠고,
   그리고 검은배경이 될때 미로맵이 변경돼서 더 존나 어려워지게 하는 걸로」
   화면을 까맣게 뒤집는 것·소리는 바깥 페이지(phase-toggle.js)가 하고, 여기서는 문 글리치·트리거·맵 바꾸기·스토커를 한다. */
(() => {
  'use strict';
  const R = window.MazeRuntime;
  if (!R || !R.world) return;
  const { E, player, lens } = R, channel = 'speedrun-maze-dev-phase';
  const tell = (type, detail = {}) => parent.postMessage({ channel, type, ...detail }, '*');
  const now = () => performance.now();
  const rand = (a, b) => a + Math.random() * (b - a);

  // 검은 배경이 되면 바뀌는 맵. 크기·시작 칸은 같고, 서 있던 출구 앞 방(15~19, 12~15)은 그대로 비워 둔다.
  // 방에서 나가는 길은 (14,15) 하나, 새 출구는 왼쪽 아래 (1,15). 출구까지 126칸(원래 맵 40칸), 막다른 길이 많다.
  const HARD = [
    '#####################',
    '#S..#.........#...#.#',
    '#.#.#.#######.#.#.#.#',
    '#.#...#.....#...#...#',
    '#.#####.###.#######.#',
    '#...#...#.....#.....#',
    '###.#.###.#####.#####',
    '#...#.#.#...#...#...#',
    '#.###.#.###.#.###.#.#',
    '#...#...#.#...#...#.#',
    '###.###.#.#####.#.#.#',
    '#...#.#.#.....#######',
    '#.###.#.#.###.#.....#',
    '#...#...#...#.#.....#',
    '###.#.#####.#.#.....#',
    '#E..#.......#......##',
    '#####################'
  ], HARD_EXIT = [1, 15];

  // --- 1) 원래 EXIT 문을 덮는 글리치: 흑백 노이즈 덩어리가 계속 자리를 바꾼다. 문은 지나갈 수 없다. ---
  E.setExitOpen(false);
  const old = { x: E.exit.x, z: E.exit.z }, door = { x: old.x, z: old.z + .33 };
  function glitchOn(world, x, y, z, w, h, yaw) {
    const { T, scene } = world.kit, c = document.createElement('canvas'); c.width = 48; c.height = 80;
    const ink = c.getContext('2d'), map = new T.CanvasTexture(c);
    map.magFilter = map.minFilter = T.NearestFilter; map.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map, transparent: true, alphaTest: .5, side: T.DoubleSide }));
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; mesh.name = 'exit-glitch'; scene.add(mesh);
    let at = 0;
    world.addFrameHook(() => {
      const t = now(); if (t - at < 70) return; at = t;
      ink.clearRect(0, 0, c.width, c.height);
      // 가로로 찢어진 띠 + 띠 안의 굵은 노이즈 칸. 빈 곳으로는 원래 문이 보인다.
      for (let band = 0; band < 16; band++) {
        const y0 = Math.floor(Math.random() * c.height), bh = 2 + Math.floor(Math.random() * 14), shift = Math.floor(rand(-10, 10));
        for (let px = 0; px < c.width; px += 4) {
          if (Math.random() < .12) continue;
          ink.fillStyle = Math.random() < .5 ? '#000' : '#fff';
          ink.fillRect(px + shift, y0, 4, bh);
        }
      }
      for (let k = 0; k < 420; k++) { ink.fillStyle = Math.random() < .5 ? '#000' : '#fff'; ink.fillRect(rand(0, 48) & ~1, rand(0, 80) & ~1, 2, 2); }
      for (let k = 0; k < 6; k++) { ink.fillStyle = Math.random() < .6 ? '#000' : '#fff'; ink.fillRect(rand(0, 40) | 0, rand(0, 72) | 0, rand(3, 14) | 0, rand(2, 9) | 0); }
      map.needsUpdate = true;
      mesh.position.x = x + (Math.random() < .2 ? rand(-.06, .06) : 0);
    });
  }
  glitchOn(R.world, door.x, .66, door.z, .86, 1.34, Math.PI);

  // --- 2) 트리거: 문 3.4칸 안 · 화면 가운데 ±18° · 가리는 벽 없음이 0.4초 이어지면 ---
  let seeing = 0, last = 0, dark = false;
  function looksAt(x, z, maxAngle) {
    const dx = x - player.x, dz = z - player.z, distance = Math.hypot(dx, dz);
    const angle = Math.atan2(Math.sin(Math.atan2(dz, dx) - player.yaw), Math.cos(Math.atan2(dz, dx) - player.yaw));
    if (Math.abs(angle) > maxAngle) return null;
    const depth = distance * Math.cos(angle), hit = E.cast(player, Math.tan(angle) / lens, lens);
    return hit.distance >= depth - .15 ? { distance, angle } : null;
  }
  R.world.addFrameHook(() => {
    if (dark) return;
    const t = now(), dt = last ? Math.min(.1, (t - last) / 1000) : 0; last = t;
    const view = looksAt(door.x, door.z, .314);
    seeing = view && view.distance < 3.4 ? seeing + dt : 0;
    if (seeing >= .4) goDark();
  });

  // --- 3) 발동: 바깥이 0.6초 크게 깨지는 사이에 맵을 바꾸고 다시 짓는다 ---
  function goDark() {
    dark = true; tell('dark');
    setTimeout(() => {
      E.setGrid(HARD, HARD_EXIT[0], HARD_EXIT[1]); E.setExitOpen(true);
      const world = R.rebuild({ npcs: false });
      if (!world) return;
      // 삼켜진 원래 문 자리(이제 벽)에 글리치가 남는다.
      glitchOn(world, old.x, .66, old.z - .5 - .008, .9, 1.3, Math.PI);
      stalker(world);
      document.body.dataset.mazeDark = '1';
      tell('map-changed');
    }, 300);
  }

  // --- 4) 스토커: 12~25초마다 한 번, 등 뒤 벽에 붙어 아이나 아줌마가 몰래 본다. 보이면 0.6초 뒤 사라짐. 피해 없음 ---
  function stalker(world) {
    const { scene, buildActor } = world.kit;
    let figure = null, nextAt = now() + rand(12000, 25000), bornAt = 0, seen = 0, told = false, t0 = 0, role = Math.random() < .5 ? 'child' : 'caregiver';
    const open = (x, z) => !E.wall(x, z);
    function spot() {
      const sx = Math.floor(player.x), sz = Math.floor(player.z), queue = [[sx, sz, 0]], visited = new Set([sx + ',' + sz]), found = [];
      for (let i = 0; i < queue.length; i++) {
        const [x, z, steps] = queue[i];
        if (steps >= 2) {
          const dx = x + .5 - player.x, dz = z + .5 - player.z, d = Math.hypot(dx, dz);
          const behind = Math.abs(Math.atan2(Math.sin(Math.atan2(dz, dx) - player.yaw), Math.cos(Math.atan2(dz, dx) - player.yaw)));
          const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !open(x + a, z + b));
          // 돌아보면 바로 보이는 자리만(가운데 벽에 가리지 않음)
          const sight = E.cast({ x: player.x, z: player.z, yaw: Math.atan2(dz, dx) }, 0, lens).distance >= d - .35;
          if (d >= 2.5 && d <= 5 && behind > 1.9 && walls.length && sight) found.push({ x, z, walls });
        }
        if (steps >= 7) continue;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = (x + a) + ',' + (z + b);
          if (open(x + a, z + b) && !visited.has(key)) { visited.add(key); queue.push([x + a, z + b, steps + 1]); }
        }
      }
      return found.length ? found[Math.floor(Math.random() * found.length)] : null;
    }
    function remove(loud) {
      if (!figure) return;
      scene.remove(figure.npc.object); figure = null;
      if (loud) tell('stalker-gone');
      nextAt = now() + rand(12000, 25000);
    }
    world.addFrameHook(() => {
      const t = now(), dt = t0 ? Math.min(.1, (t - t0) / 1000) : 0; t0 = t;
      if (!figure) {
        if (t < nextAt) return;
        const place = spot();
        if (!place) { nextAt = t + 1500; return; }
        const [wx, wz] = place.walls[Math.floor(Math.random() * place.walls.length)];
        const who = role, built = buildActor(who); role = who === 'child' ? 'caregiver' : 'child';
        const o = built.npc.object, child = who === 'child';
        o.scale.setScalar(built.scale);
        let x = place.x + .5 + wx * .3, z = place.z + .5 + wz * .3, fixed = null;
        if (child) {
          // 아이는 원래 미로처럼 벽에 손을 짚고 붙어 선다. 몸은 복도를 따라 이쪽을 향하게(필요하면 좌우를 뒤집음).
          const reach = .5 + built.npc.bounds.min.x * built.scale - .007;
          x = place.x + .5 + wx * reach; z = place.z + .5 + wz * reach;
          const toward = wz * (player.x - x) - wx * (player.z - z);
          if (toward >= 0) fixed = Math.atan2(wz, -wx);
          else { fixed = Math.atan2(-wz, wx); o.scale.x = -built.scale; }
        }
        o.position.set(x, .001 - built.npc.bounds.min.y * built.scale, z);
        o.name = 'maze-stalker'; scene.add(o);
        figure = { ...built, x, z, fixed }; bornAt = t; seen = 0; told = false;
        document.body.dataset.stalker = 'out';
        return;
      }
      const o = figure.npc.object;
      o.rotation.y = figure.fixed ?? Math.atan2(player.x - figure.x, player.z - figure.z);
      figure.npc.pose?.(0);
      const view = looksAt(figure.x, figure.z, .62);
      if (view) {
        seen += dt;
        if (!told) { told = true; tell('stalker-seen'); }
        if (seen >= .6) { remove(true); document.body.dataset.stalker = 'gone'; }
      } else if (!told && t - bornAt > 6000) { remove(false); document.body.dataset.stalker = 'missed'; }
      else if (told && t - bornAt > 10000) { remove(true); document.body.dataset.stalker = 'gone'; }
    });
  }
  window.MazeDevPhase2 = { get dark() { return dark; }, goDark };
})();

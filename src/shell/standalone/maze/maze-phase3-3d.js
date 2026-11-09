/* Developer maze phase 3: proposed three alley/dead-end pairs, 2026-11-05.
 * New entry because the requested backup directory currently rejects writes.
 * Claude should inline this entry INSTEAD OF maze-phase3.js, never both.
 * This is a staging proposal, not an assertion that the story order is final.
 */
/* @inline src/shell/standalone/maze/maze-phase3-scenes.js */
(() => {
  'use strict';
  const R = window.MazeRuntime;
  if (!R?.world || typeof MazePhase3Figures === 'undefined') return;
  const { E, player } = R, world = R.world, { T, scene } = world.kit;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  // Three proposals only. No specific workplace, additional character or dialogue.
  const PAIRS = [
    { id: 'trust', stop: [9, 5], before: 'listening', after: 'seated-alone', weary: 0 },
    { id: 'follow-again', stop: [19, 1], before: 'reaching', after: 'exhausted', weary: .45 },
    { id: 'still-following', stop: [7, 11], before: 'reaching', after: 'exhausted', weary: 1 }
  ];
  const key = p => p.join(','), open = (x, z) => !E.wall(x, z);
  function route(from, to) {
    const previous = new Map([[key(from), null]]), queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (key(p) === key(to)) break;
      for (const [dx, dz] of DIRS) {
        const n = [p[0] + dx, p[1] + dz];
        if (open(...n) && !previous.has(key(n))) { previous.set(key(n), p); queue.push(n); }
      }
    }
    if (!previous.has(key(to))) throw new Error('Maze phase 3 stop is unreachable: ' + key(to));
    const cells = []; let at = to;
    while (at) { cells.unshift(at); at = previous.get(key(at)); }
    return cells;
  }
  const routes = PAIRS.map((p, i) => route(i ? PAIRS[i - 1].stop : [1, 1], p.stop));
  for (let i = 0; i < PAIRS.length; i++) {
    const p = routes[i], index = Math.max(1, p.length - 4), cell = p[index], from = p[index - 1];
    PAIRS[i].alley = cell;
    PAIRS[i].approach = [from[0] - cell[0], from[1] - cell[1]];
  }

  const materials = {
    paper: new T.MeshLambertMaterial({ color: 0xf4f4f4 }),
    shade: new T.MeshLambertMaterial({ color: 0x858585 }),
    ink: new T.MeshBasicMaterial({ color: 0x101010 })
  };
  const texture = new T.TextureLoader().load(MazeNPCAssets.neighbor);
  texture.colorSpace = T.SRGBColorSpace; texture.magFilter = T.NearestFilter;
  texture.minFilter = T.LinearFilter; texture.generateMipmaps = false;
  const data = MazeNPCMeshes.neighbor, figures = [], groups = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);

  function figure(name, weariness) {
    // Keep the old weighted mesh and atlas. The extra bend belongs to this
    // study alone and does not change the normal NPCs in phases 1 or 2.
    const maker = (t, d, body, role, head, pose) => {
      if (pose && name === 'exhausted') {
        // Fold inward rather than spreading the arms. Use the same bind-joint
        // construction as the existing caregiver study, with this figure's stoop.
        const joint = i => V().setFromMatrixPosition(new T.Matrix4().set(...d.bindPoses[i]).invert());
        const around = (p, m) => new T.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(m)
          .multiply(new T.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
        const rot = (x, y, z) => new T.Matrix4().makeRotationFromEuler(new T.Euler(x, y, z, 'XYZ'));
        const extra = around(joint(5), rot(weariness * .15, 0, 0));
        const torso = around(joint(5), rot(.46 + weariness * .15, 0, 0));
        pose = { name: pose.name, bones: pose.bones.map((m, i) => i >= 5 && i <= 62 ? extra.clone().multiply(m) : m.clone()) };
        for (const [shoulder, elbow, last, sign] of [[9, 10, 33, 1], [38, 39, 62, -1]]) {
          const upper = around(joint(shoulder), rot(-.65, 0, sign * 1.4));
          pose.bones[shoulder] = torso.clone().multiply(upper);
          const lower = torso.clone().multiply(upper).multiply(around(joint(elbow), rot(0, sign * -.42, sign * 2.1)));
          for (let i = elbow; i <= last; i++) pose.bones[i] = lower.clone();
        }
      }
      if (pose && weariness && name === 'reaching') {
        const pivot = V().setFromMatrixPosition(new T.Matrix4().set(...d.bindPoses[5]).invert());
        const bend = new T.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z)
          .multiply(new T.Matrix4().makeRotationX(weariness * .20))
          .multiply(new T.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
        pose = { name: pose.name, bones: pose.bones.map((m, i) => i >= 5 && i <= 62 ? bend.clone().multiply(m) : m.clone()) };
      }
      return createNPC(t, d, body, role, head, pose);
    };
    const actor = MazePhase3Figures.create(T, data, texture, texture, maker, name, E.dimensions.npcHeights.neighbor);
    figures.push(actor); return actor;
  }
  const box = (g, x, y, z, w, h, d, mat = materials.paper) => world.kit.box(g, x, y, z, w, h, d, mat, true);

  // The neutral device marks AI, without inventing a job, recommendation text,
  // or dialogue. The same display recurs despite the changed human posture.
  function device(group, x, y, z, lean = 0) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = lean; group.add(g);
    box(g, 0, 0, 0, .145, .19, .035, materials.ink);
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 96, 128);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.font = 'bold 44px monospace'; ctx.fillText('AI', 48, 70);
    ctx.fillRect(20, 93, 56, 3);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.magFilter = T.NearestFilter;
    world.kit.plane(g, 0, 0, .019, .122, .165, new T.MeshBasicMaterial({ map }));
    box(g, 0, -.135, -.005, .022, .10, .022, materials.shade);
    box(g, 0, -.19, .002, .14, .012, .09, materials.shade);
    return g;
  }
  function chair(group) {
    const g = new T.Group(); g.position.set(-.06, 0, .065); group.add(g);
    box(g, 0, .25, 0, .28, .026, .245);
    box(g, 0, .40, -.11, .28, .28, .026);
    for (const x of [-.11, .11]) for (const z of [-.09, .09]) box(g, x, .12, z, .02, .24, .02, materials.shade);
    return g;
  }
  function shell(cell, direction, terminal) {
    const g = new T.Group(); g.name = 'memory-alley-tableau';
    const [dx, dz] = direction;
    // Figures stay in the existing walkable cell. Physics grid and camera are untouched.
    g.position.set(cell[0] + .5 - dx * (terminal ? .22 : .12), 0, cell[1] + .5 - dz * (terminal ? .22 : .12));
    g.rotation.y = Math.atan2(dx, dz); scene.add(g); groups.push(g);
    if (terminal) {
      // A shallow, dimensional blocked recess; not a new room or a named workplace.
      box(g, 0, .49, -.20, .88, .98, .045);
      for (const x of [-.43, .43]) box(g, x, .49, -.13, .03, .98, .16, materials.shade);
      box(g, 0, .015, -.02, .86, .025, .38, materials.shade);
    }
    return g;
  }
  const views = [];
  for (let i = 0; i < PAIRS.length; i++) {
    const p = PAIRS[i], [x, z] = p.stop;
    const entry = DIRS.find(([dx, dz]) => open(x + dx, z + dz));
    const before = shell(p.alley, p.approach, false), after = shell(p.stop, entry, true);
    before.name = 'memory-' + p.id + '-alley'; after.name = 'memory-' + p.id + '-dead-end';
    before.userData.storyProposal = after.userData.storyProposal = true;
    const a = figure(p.before, p.weary), b = figure(p.after, p.weary);
    a.object.position.x = -.09; a.object.rotation.y = .28;
    b.object.position.x = -.06; b.object.position.z = .03;
    before.add(a.object); after.add(b.object);
    device(before, .28, .59, .04, -.16);
    // Results remain alone: no other character, bullying action or explanatory picture.
    chair(after);
    if (i === 2) device(after, .31, .53, -.01, -.25);
    views.push({ pair: i, type: 'alley', cell: p.alley, direction: p.approach, group: before });
    views.push({ pair: i, type: 'dead-end', cell: p.stop, direction: entry, group: after });
  }

  // Existing monochrome floor/wall arrows, now routing to three pairs then EXIT.
  const arrowCanvas = document.createElement('canvas'); arrowCanvas.width = 128; arrowCanvas.height = 96;
  const ink = arrowCanvas.getContext('2d'); ink.strokeStyle = '#000'; ink.lineCap = ink.lineJoin = 'round'; ink.lineWidth = 13;
  ink.beginPath(); ink.moveTo(15, 48); ink.quadraticCurveTo(64, 45, 106, 48); ink.moveTo(74, 22); ink.lineTo(107, 48); ink.lineTo(73, 75); ink.stroke();
  const arrowMap = new T.CanvasTexture(arrowCanvas); arrowMap.colorSpace = T.SRGBColorSpace; arrowMap.magFilter = T.NearestFilter;
  const arrowMaterial = new T.MeshBasicMaterial({ map: arrowMap, transparent: true, alphaTest: .5, side: T.DoubleSide, depthWrite: false });
  const arrowShape = new T.PlaneGeometry(.5, .375), marks = [];
  function clearArrows() { for (const o of marks) scene.remove(o); marks.length = 0; }
  // 11/07 Claude Code(사용자 OK): 마지막 출구 길에서는 출구에 가까울수록 AI 화살표가 틀린 길을 가리킨다(못 나가게 붙잡음).
  //   가는 길의 반을 넘으면 갈림길마다, 8할을 넘으면 모든 칸에서 다른 열린 칸(없으면 되돌아가는 쪽)을 가리킨다.
  function wrongWay(cells, i) {
    const t = (i + 1) / (cells.length - 1), [x, z] = cells[i], next = cells[i + 1], prior = cells[i - 1];
    if (t <= .5) return null;
    const alts = DIRS.filter(([ax, az]) => open(x + ax, z + az) && key([x + ax, z + az]) !== key(next) && (!prior || key([x + ax, z + az]) !== key(prior)));
    if (alts.length) return alts[i % alts.length];
    if (t > .8 && prior) return [prior[0] - x, prior[1] - z];
    return null;
  }
  function arrows(cells, lie = false) {
    clearArrows();
    for (let i = 0; i < cells.length - 1; i++) {
      const wrong = lie ? wrongWay(cells, i) : null;
      const [x, z] = cells[i], [nx, nz] = cells[i + 1], dx = wrong ? wrong[0] : nx - x, dz = wrong ? wrong[1] : nz - z;
      const g = new T.Group(), mark = new T.Mesh(arrowShape, arrowMaterial); mark.rotation.x = -Math.PI / 2; g.add(mark);
      g.position.set(x + .5 + dx * .12, .004, z + .5 + dz * .12); g.rotation.y = Math.atan2(-dz, dx);
      scene.add(g); marks.push(g);
      const prior = cells[i - 1];
      if (!prior) continue;
      const ix = x - prior[0], iz = z - prior[1];
      if ((ix !== dx || iz !== dz) && !open(x + ix, z + iz)) {
        const yaw = Math.atan2(-ix, -iz), wallMark = new T.Mesh(arrowShape, arrowMaterial);
        wallMark.position.set(x + .5 + ix * .49, .52, z + .5 + iz * .49); wallMark.rotation.y = yaw;
        if (dx * Math.cos(yaw) - dz * Math.sin(yaw) < 0) wallMark.scale.x = -1;
        scene.add(wallMark); marks.push(wallMark);
      }
    }
  }
  let stop = 0, elapsed = 0, pendingRoute = null;
  arrows(routes[0]);
  document.body.dataset.memoryStop = '0'; document.body.dataset.memory3d = 'proposal';
  world.addFrameHook((_player, seconds, dt) => {
    elapsed += dt;
    for (const actor of figures) actor.update(seconds, reduced.matches);
    // Keep unseen memories out of the renderer, without changing their state.
    for (const g of groups) g.visible = Math.hypot(player.x - g.position.x, player.z - g.position.z) < 8;
    if (pendingRoute && elapsed >= pendingRoute.at) { arrows(pendingRoute.cells, pendingRoute.lie); pendingRoute = null; }
    if (stop >= PAIRS.length) return;
    const [x, z] = PAIRS[stop].stop;
    if (Math.hypot(player.x - x - .5, player.z - z - .5) < .75) {
      stop++; document.body.dataset.memoryStop = String(stop);
      const next = stop < PAIRS.length ? PAIRS[stop].stop : [Math.floor(E.exit.x), Math.floor(E.exit.z)];
      clearArrows(); pendingRoute = { at: elapsed + 1.2, cells: route([x, z], next), lie: stop >= PAIRS.length };
    }
  });
  // Inspection hooks only; no new player-facing controls.
  window.MazeDevPhase3 = {
    get stop() { return stop; }, stops: PAIRS.map(p => p.stop), pairs: PAIRS,
    views: views.map(v => ({ pair: v.pair, type: v.type, cell: v.cell, direction: v.direction })),
    art: 0, proposal: true, workplace: null, route,
    inspect() { return { stop, figures: figures.length, groups: groups.length, arrowCount: marks.length }; }
  };
})();

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MazeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const grid = [
    '#####################',
    '#S..#.....###.......#',
    '###.#.###.###.#######',
    '#...#.###.#...#.....#',
    '#.###.###.#.###.###.#',
    '#.......#.#.###.###.#',
    '###.###.###.###.###.#',
    '#...#...#.......#...#',
    '#.###.###.....###.###',
    '#.###.........###...#',
    '#.#########.#########',
    '#.....#...#.........#',
    '#####.###.#####..##.#',
    '#.....###.#####..##.#',
    '#.#######.#####.....#',
    '#.........#####....E#',
    '#####################'
  ];
  const exit = { x: 19.5, z: 15.5 }, radius = .18, speed = 1.65;
  // One maze unit represents two metres. All renderers share these proportions.
  const dimensions = Object.freeze({ metresPerUnit:2, eyeHeight:.765, wallHeight:1.30,
    doorHeight:1.05, doorWidth:.50, handleHeight:.49, railHeight:.45, seatHeight:.225,
    guideHeight:.835, npcHeights:Object.freeze({caregiver:.82,neighbor:.84,child:.60}) });
  // 2026-10-07: no momentum. A new wall hit adds one unit of damage; after a
  // quiet spell the damage fades back. Reaching maxDamage still fails the stage.
  const motion = Object.freeze({ contactRelease: .035, hitCooldown: .6, maxDamage: 5, regenDelay: 2.5, regenRate: .5 });
  const wall = (x, z) => !grid[Math.floor(z)] || !grid[Math.floor(z)][Math.floor(x)] || grid[Math.floor(z)][Math.floor(x)] === '#';
  // Spatial dressing follows distance from the entrance, including wrong turns.
  // It is stable when backtracking and never reveals the shortest exit route.
  const distances = new Map();
  function measure() {
    distances.clear(); distances.set('1,1', 0);
    const cells = [[1, 1]];
    for (let i = 0; i < cells.length; i++) {
      const [x, z] = cells[i];
      for (const [dx, dz] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const nx=x+dx, nz=z+dz, key=`${nx},${nz}`;
        if (wall(nx,nz) || distances.has(key)) continue;
        distances.set(key,distances.get(`${x},${z}`)+1); cells.push([nx,nz]);
      }
    }
  }
  measure();
  // 2026-10-29 개발자용 미로 2·3페(Claude Code): 페이즈 스크립트만 부르는 두 함수. 본편 01은 부르지 않아 그대로다.
  // exitOpen=false면 출구에 닿아도 끝나지 않는다. setGrid는 같은 크기의 새 맵으로 바꾸고 출구 칸을 옮긴다.
  let exitOpen = true;
  function setExitOpen(open) { exitOpen = open !== false; }
  function setGrid(rows, exitX, exitZ) {
    if (!Array.isArray(rows) || rows.length !== grid.length) throw new Error('maze grid size');
    for (let i = 0; i < rows.length; i++) grid[i] = rows[i];
    exit.x = exitX + .5; exit.z = exitZ + .5; measure();
  }
  const distanceAt = (x,z) => distances.get(`${Math.floor(x)},${Math.floor(z)}`) ?? -1;
  const zoneAt = (x,z) => { const d=distanceAt(x,z); return d<18?'blank':d<32?'care':'town'; };
  const initial = () => ({ x: 1.5, z: 1.5, yaw: 0, pitch: 0, finished: false, vx: 0, vz: 0, damage: 0, sinceHit: 0, dead: false, impacts: 0, contacts: [], hitCooldown: 0 });
  function fits(x, z) {
    for (let iz = Math.floor(z - radius); iz <= Math.floor(z + radius); iz++) {
      for (let ix = Math.floor(x - radius); ix <= Math.floor(x + radius); ix++) {
        if (!wall(ix, iz)) continue;
        const dx = x - Math.max(ix, Math.min(ix + 1, x));
        const dz = z - Math.max(iz, Math.min(iz + 1, z));
        if (dx * dx + dz * dz < radius * radius) return false;
      }
    }
    return true;
  }
  const createTrail = () => ({ marks: [], distance: 0 });
  function recordTrail(trail, startX, startZ, endX, endZ) {
    if (!trail) return;
    const length = Math.hypot(endX - startX, endZ - startZ);
    if (length < 1e-8) return;
    const dx = (endX - startX) / length, dz = (endZ - startZ) / length, spacing = .3;
    let travelled = spacing - trail.distance;
    while (travelled <= length + 1e-9) {
      const side = trail.marks.length % 2 ? .055 : -.055;
      trail.marks.push({ x: startX + dx * travelled - dz * side, z: startZ + dz * travelled + dx * side, dx, dz });
      travelled += spacing;
    }
    trail.distance = (trail.distance + length) % spacing;
    if (trail.distance > spacing - 1e-8) trail.distance = 0;
  }
  function displace(player, dx, dz, trail) {
    const contacts = new Set();
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .06));
    for (let i = 0; i < steps; i++) {
      const startX = player.x, startZ = player.z;
      for (const [axis, amount] of [['x', dx / steps], ['z', dz / steps]]) {
        if (Math.abs(amount) < 1e-12) continue;
        const allowed = fraction => fits(player.x + (axis === 'x' ? amount * fraction : 0), player.z + (axis === 'z' ? amount * fraction : 0));
        if (allowed(1)) player[axis] += amount;
        else {
          contacts.add(`${axis}${Math.sign(amount)}`);
          // Stop at the wall itself, without losing a whole simulation step.
          let low = 0, high = 1;
          for (let n = 0; n < 18; n++) { const middle = (low + high) / 2; if (allowed(middle)) low = middle; else high = middle; }
          player[axis] += amount * low;
        }
      }
      recordTrail(trail, startX, startZ, player.x, player.z);
      if (exitOpen && Math.hypot(player.x - exit.x, player.z - exit.z) < .32) { player.finished = true; break; }
    }
    return [...contacts];
  }
  // Kinematic movement remains available for the introductory ghost.
  function move(player, forward, sideways, dt, trail) {
    if (player.finished || player.dead) return player;
    const length = Math.hypot(forward, sideways);
    if (!length) return player;
    const distance = speed * Math.min(Math.max(dt, 0), .25) / Math.max(1, length);
    displace(player, (Math.cos(player.yaw) * forward - Math.sin(player.yaw) * sideways) * distance,
      (Math.sin(player.yaw) * forward + Math.cos(player.yaw) * sideways) * distance, trail);
    return player;
  }
  function stop(player) { player.vx = player.vz = 0; return player; }
  function reset(player) { return Object.assign(player, initial()); }
  function step(player, forward, sideways, dt, trail) {
    if (player.finished || player.dead) return player;
    const duration = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .25);
    const length = Math.hypot(forward, sideways), factor = speed / Math.max(1, length);
    const targetX = (Math.cos(player.yaw) * forward - Math.sin(player.yaw) * sideways) * factor;
    const targetZ = (Math.sin(player.yaw) * forward + Math.cos(player.yaw) * sideways) * factor;
    const slices = Math.max(1, Math.ceil(duration * 120)), h = duration / slices;
    for (let n = 0; n < slices && !player.finished && !player.dead; n++) {
      player.hitCooldown = Math.max(0, player.hitCooldown - h);
      player.sinceHit += h;
      if (player.sinceHit > motion.regenDelay) player.damage = Math.max(0, player.damage - motion.regenRate * h);
      player.contacts = player.contacts.filter(contact => {
        const direction = Number(contact.slice(1)) * motion.contactRelease;
        return !fits(player.x + (contact[0] === 'x' ? direction : 0), player.z + (contact[0] === 'z' ? direction : 0));
      });
      // Velocity follows the keys directly: releasing a key stops at once.
      const dx = targetX * h, dz = targetZ * h;
      player.vx = targetX; player.vz = targetZ;
      const contacts = displace(player, dx, dz, trail);
      const fresh = contacts.some(contact => !player.contacts.includes(contact));
      for (const contact of contacts) {
        player[contact[0] === 'x' ? 'vx' : 'vz'] = 0;
        if (!player.contacts.includes(contact)) player.contacts.push(contact);
      }
      if (fresh && player.hitCooldown === 0 && !player.finished) {
        player.damage = Math.min(motion.maxDamage, player.damage + 1); player.impacts++;
        player.hitCooldown = motion.hitCooldown; player.sinceHit = 0;
        if (player.damage >= motion.maxDamage) player.dead = true;
      }
      if (player.finished || player.dead) stop(player);
    }
    if (!length) stop(player);
    return player;
  }
  function look(player, dx, dy) {
    player.yaw = Math.atan2(Math.sin(player.yaw + dx), Math.cos(player.yaw + dx));
    player.pitch = Math.max(-.48, Math.min(.48, player.pitch + dy));
    return player;
  }
  function cast(player, cameraX, lens = .78) {
    const dx = Math.cos(player.yaw) - Math.sin(player.yaw) * cameraX * lens;
    const dz = Math.sin(player.yaw) + Math.cos(player.yaw) * cameraX * lens;
    let x = Math.floor(player.x), z = Math.floor(player.z);
    const stepX = dx < 0 ? -1 : 1, stepZ = dz < 0 ? -1 : 1;
    const deltaX = Math.abs(1 / dx), deltaZ = Math.abs(1 / dz);
    let sideX = (dx < 0 ? player.x - x : x + 1 - player.x) * deltaX;
    let sideZ = (dz < 0 ? player.z - z : z + 1 - player.z) * deltaZ;
    for (let n = 0; n < 80; n++) {
      let side, distance;
      if (sideX < sideZ) { distance = sideX; sideX += deltaX; x += stepX; side = 0; }
      else { distance = sideZ; sideZ += deltaZ; z += stepZ; side = 1; }
      if (wall(x, z)) return { distance: Math.max(.015, distance), face: side === 0 ? `x${x + (stepX < 0 ? 1 : 0)}` : `z${z + (stepZ < 0 ? 1 : 0)}` };
    }
    return { distance: 30, face: 'far' };
  }
  function route() {
    const queue = [[1, 1]], visited = new Set(['1,1']), previous = new Map();
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      if (x === Math.floor(exit.x) && z === Math.floor(exit.z)) break;
      for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const next = [x + dx, z + dz], key = next.join(',');
        if (wall(...next) || visited.has(key)) continue;
        visited.add(key); previous.set(key, [x, z]); queue.push(next);
      }
    }
    const points = []; let current = [Math.floor(exit.x), Math.floor(exit.z)];
    while (current) { points.unshift({ x: current[0] + .5, z: current[1] + .5 }); current = previous.get(current.join(',')); }
    return points;
  }
  return { grid, exit, speed, radius, motion, dimensions, initial, wall, fits, move, step, stop, reset, look, cast, route, createTrail, distanceAt, zoneAt, setExitOpen, setGrid };
});
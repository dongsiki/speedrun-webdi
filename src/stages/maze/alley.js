

/* The existing movement grid remains authoritative. This renderer dresses its
 * walls and reuses the local NPC studies; it adds no quest, dialogue or damage. */
/* MAZE_OPEN_ALLEY: only the existing town zone becomes an outdoor street. */
const MazeAlley = (() => {
  function buildingHeight(x, z) {
    const blockX = Math.floor(x / 3), blockZ = Math.floor(z / 3);
    return 1.85 + ((Math.abs(blockX * 17 + blockZ * 11) % 4) * .22);
  }
  function surfaceAt(E, player, cameraX, lens, hit) {
    const c = Math.cos(player.yaw), s = Math.sin(player.yaw);
    const dx = c - s * cameraX * lens, dz = s + c * cameraX * lens;
    const x = Math.floor(player.x + dx * (hit.distance - .0001));
    const z = Math.floor(player.z + dz * (hit.distance - .0001));
    if (E.zoneAt(x + .5, z + .5) !== 'town') return null;
    const wallX = x + (hit.face[0] === 'x' ? Math.sign(dx) : 0);
    const wallZ = z + (hit.face[0] === 'z' ? Math.sign(dz) : 0);
    return { height: buildingHeight(wallX, wallZ) };
  }
  function create(T, E, { box, plane, texture, white, black, grey, windowFrame, door, rail }) {
    const materials = new Map();
    function facadeMaterial(seed, height) {
      const key = seed + '/' + height;
      if (materials.has(key)) return materials.get(key);
      const material = texture('brick', seed).clone(), map = material.map.clone();
      map.wrapT = T.RepeatWrapping; map.repeat.set(1, height / E.dimensions.wallHeight);
      map.needsUpdate = true; material.map = map; materials.set(key, material); return material;
    }
    const paving = document.createElement('canvas'); paving.width = paving.height = 256;
    const ink = paving.getContext('2d'); ink.fillStyle = '#fff'; ink.fillRect(0, 0, 256, 256);
    ink.strokeStyle = '#393939'; ink.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      const y = row * 64; ink.beginPath(); ink.moveTo(0, y); ink.lineTo(256, y); ink.stroke();
      for (let x = (row % 2) * 64 - 128; x < 256; x += 128) { ink.beginPath(); ink.moveTo(x, y); ink.lineTo(x, y + 64); ink.stroke(); }
    }
    let seed = 1991;
    for (let i = 0; i < 160; i++) { seed = Math.imul(seed, 1664525) + 1013904223; const x = (seed >>> 16) & 255; seed = Math.imul(seed, 1664525) + 1013904223; ink.fillStyle = i % 4 ? '#777' : '#222'; ink.fillRect(x, (seed >>> 16) & 255, 1, 1); }
    const pavingMap = new T.CanvasTexture(paving); pavingMap.colorSpace = T.SRGBColorSpace; pavingMap.magFilter = T.NearestFilter;
    const floor = new T.MeshBasicMaterial({ map: pavingMap });
    function facade(g, x, z, dx, dz, seed, exitFace) {
      const height = buildingHeight(x + dx, z + dz); g.userData.alleyHeight = height;
      plane(g, 0, height / 2, -.003, 1, height, facadeMaterial(seed % 3, height));
      // The roof stops against white open sky; there is no surface across the lane.
      box(g, 0, height - .022, -.055, 1, .052, .15, white, true);
      box(g, 0, height - .075, .024, 1, .018, .035, black);
      box(g, 0, .018, .035, 1, .036, .07, white, true);
      if (seed % 11 === 3) box(g, -.23, height + .10, -.07, .13, .20, .13, white, true);
      if (exitFace) return;
      if (seed % 3 === 0) windowFrame(g, seed);
      else if (seed % 7 === 1) door(g, true);
      // A second storey establishes a building rather than a wallpapered corridor.
      if (seed % 4 !== 1) { const upper = new T.Group(); upper.position.y = .72; g.add(upper); windowFrame(upper, seed | 1); }
      if (seed % 4 === 2) rail(g); // Existing hospital fragment persists in the memory.
      if (seed % 3 === 1) box(g, .445, (height - .06) / 2, .036, .021, height - .06, .033, grey, true);
    }
    return { floor, facade };
  }
  return { buildingHeight, surfaceAt, create };
})();
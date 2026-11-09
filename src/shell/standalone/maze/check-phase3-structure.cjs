const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const T = require(path.join(root, 'assets/vendor/three-0.180.0.cjs'));
const E = require(path.join(root, 'src/stages/maze/engine.js'));
const { createNPC } = require(path.join(root, 'src/stages/maze/npc-model.js'));
const models = require(path.join(root, 'assets/models/maze-npc-assets-maze-npcmeshes-1998fb0107.json'));
const before = JSON.stringify(E.grid), scene = new T.Scene(), hooks = [], player = E.initial();
const kit = { T: { ...T, TextureLoader: class { load() { return new T.Texture(); } } }, scene,
  box(g, x, y, z, w, h, d, mat) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; },
  plane(g, x, y, z, w, h, mat) { const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.set(x, y, z); g.add(m); return m; }
};
const document = { body: { dataset: {} }, createElement() { return { getContext() { return { fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, quadraticCurveTo() {}, lineTo() {}, stroke() {} }; } }; } };
const window = { MazeRuntime: { E, player, world: { kit, addFrameHook(f) { hooks.push(f); } } } };
let code = fs.readFileSync(path.join(__dirname, 'maze-phase3-3d.js'), 'utf8');
code = code.replace('/* @inline src/shell/standalone/maze/maze-phase3-scenes.js */', fs.readFileSync(path.join(__dirname, 'maze-phase3-scenes.js'), 'utf8'));
vm.runInNewContext(code, { window, document, MazeNPCAssets: { neighbor: '' }, MazeNPCMeshes: models, createNPC, matchMedia: () => ({ matches: true }), console });
const api = window.MazeDevPhase3;
assert.equal(api.views.length, 6); assert.equal(api.inspect().figures, 6); assert.equal(api.proposal, true);
for (const v of api.views) assert.equal(E.wall(...v.cell), false);
for (const g of scene.children.filter(g => g.userData.storyProposal)) {
  g.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(g);
  assert(bounds.min.y >= -.001, 'figure/furniture below floor');
  for (const m of g.children.filter(o => o.userData.storyPose)) {
    assert(Math.abs(m.userData.standingHeight - E.dimensions.npcHeights.neighbor) < 1e-6);
    const posed = m.children.find(child => child.isMesh).geometry;
    assert(Array.from(posed.attributes.position.array).every(Number.isFinite), 'invalid posed vertex');
    if (m.userData.storyPose === 'exhausted') {
      const geometry = m.children.find(child => child.isMesh).geometry, armX = [];
      for (let i = 0; i < models.neighbor.boneIndices.length; i++) {
        const onArm = models.neighbor.boneIndices[i].some((bone, j) => ((bone >= 9 && bone <= 33) || (bone >= 38 && bone <= 62)) && models.neighbor.boneWeights[i][j] > .5);
        if (onArm) armX.push(geometry.attributes.position.getX(i) * m.scale.x);
      }
      assert(Math.max(...armX) - Math.min(...armX) < .45, 'exhausted arms should fold inward');
    }
  }
}
let seconds = 0;
for (let i = 0; i < api.stops.length; i++) {
  const p = api.stops[i]; player.x = p[0] + .5; player.z = p[1] + .5;
  hooks.forEach(h => h(player, seconds += .1, .1));
  assert.equal(api.stop, i + 1);
  hooks.forEach(h => h(player, seconds += 1.3, 1.3));
}
assert.equal(JSON.stringify(E.grid), before); assert(api.inspect().arrowCount > 0);
let from = [1, 1], segments = 0;
for (const to of [...api.stops, [19, 15]]) {
  const cells = api.route(from, to);
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1], b = cells[i], p = E.initial(); p.x = a[0] + .5; p.z = a[1] + .5; p.yaw = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let j = 0; j < 61; j++) E.step(p, 1, 0, .01);
    assert.equal(p.damage, 0); assert.equal(p.dead, false); segments++;
  }
  from = to;
}
console.log(JSON.stringify({ pairs: api.pairs.map(p => ({ id: p.id, alley: p.alley, stop: p.stop })), figures: 6, progression: api.stop, movementSegments: segments, mapUnchanged: true, finalArrows: api.inspect().arrowCount }));
module.exports = { scene, api, E, T };

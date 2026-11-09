/* 빈건물 CCTV 3D 방·모델(2026-11-10, Claude Code). 프로토타입(materialscctv-3d-prototype) 그대로 옮김.
   사용자 11/10: 「3d로 해」「계단은 그대로 스고, 싹 다 3d로 해」「움직이는 거 말고, 모델이 걍 그대로 멈춰있는 걸로 해」「카메라 3개 모델 저 일단 너가 만들어」.
   three.js 기본 도형 + 단색(무늬 없음). 계단은 11/05 시험 3D(assets/models/cctv/stairs.json, glb를 three.js JSON으로 바꾼 것). */
const Cctv3D = (() => {
const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .92, metalness: 0 });
function box(parent, w, h, d, c, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y + h / 2, z); m.rotation.y = ry; parent.add(m); return m; }
function cyl(parent, r1, r2, h, c, x, y, z, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), M(c)); m.position.set(x, y + h / 2, z); parent.add(m); return m; }
function ball(parent, r, c, x, y, z, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), M(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
function limb(parent, a, b, r, c) { // a→b 를 잇는 막대(팔·다리)
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), M(c));
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); parent.add(m); return m;
}
function shell(scene, W, H, D, wall, floor) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ color: wall, roughness: .95, side: THREE.BackSide }));
  s.position.y = H / 2; scene.add(s);
  box(scene, W, .02, D, floor, 0, 0, 0);
  for (const [w, d, x, z] of [[W, .06, 0, -D / 2 + .03], [.06, D, -W / 2 + .03, 0], [.06, D, W / 2 - .03, 0]]) box(scene, w, .12, d, 0x2a2a2a, x, 0, z); // 걸레받이
}
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.0)); // 천장이 새까맣게 안 되게 아래쪽 빛도 조금
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(3, 6, 4); scene.add(sun);
}
function roomCam(pos, look) { const c = new THREE.PerspectiveCamera(62, 16 / 10, .05, 100); c.position.set(...pos); c.lookAt(...look); return c; }

// --- 멈춰 있는 모델(발끝 y=0, 앞이 +z) ---
const ACTORS = {
  cat() { const g = new THREE.Group(), c = 0x3a3a3a;
    ball(g, .2, c, 0, .2, 0, 1.6, .9, .9); ball(g, .11, c, .3, .34, 0);
    for (const z of [-.06, .06]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.04, .08, 6), M(c)); e.position.set(.31, .46, z); g.add(e); }
    for (const [x, z] of [[-.18, -.08], [-.18, .08], [.18, -.08], [.18, .08]]) cyl(g, .025, .025, .16, c, x, 0, z);
    limb(g, [-.3, .2, 0], [-.42, .45, 0], .025, c); return g; },
  bag() { const g = new THREE.Group(), c = 0xdedede; ball(g, .2, c, 0, .55, 0, 1, 1.15, .7);
    for (const x of [-.08, .08]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.06, .015, 6, 12, Math.PI), M(c)); t.position.set(x, .77, 0); g.add(t); } return g; },
  mannequin() { const g = new THREE.Group(), c = 0xcfc8bd;
    cyl(g, .22, .26, .04, 0x222222, 0, 0, 0); cyl(g, .025, .025, .3, 0x222222, 0, .04, 0);
    limb(g, [-.09, .34, 0], [-.14, 1.0, 0], .055, c); limb(g, [.09, .34, 0], [.22, .98, .05], .055, c);
    ball(g, .2, c, 0, 1.28, 0, .9, 1.4, .6); ball(g, .11, c, 0, 1.66, 0);
    limb(g, [-.18, 1.45, 0], [-.48, 1.85, .05], .04, c); limb(g, [.18, 1.45, 0], [.5, 1.2, .1], .04, c); return g; },
  robot() { const g = new THREE.Group(); cyl(g, .26, .26, .09, 0x9a9a9a, 0, 0, 0, 24); cyl(g, .1, .12, .05, 0x2e2e2e, 0, .09, 0); ball(g, .02, 0xffffff, .2, .07, .12); return g; },
  shadow() { const g = new THREE.Group(), c = 0x050505;
    limb(g, [-.1, 0, 0], [-.11, .9, 0], .07, c); limb(g, [.1, 0, 0], [.11, .9, 0], .07, c);
    ball(g, .22, c, 0, 1.25, 0, 1, 1.6, .6); ball(g, .12, c, 0, 1.72, 0);
    limb(g, [-.22, 1.5, 0], [-.27, .88, .02], .05, c); limb(g, [.22, 1.5, 0], [.27, .88, .02], .05, c); return g; },
  skirt() { const g = new THREE.Group(), c = 0x1f2433;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.17, .36, .42, 12, 1, true), new THREE.MeshStandardMaterial({ color: c, roughness: .9, side: THREE.DoubleSide, flatShading: true }));
    s.position.y = .21; g.add(s); cyl(g, .175, .175, .05, 0x111111, 0, .42, 0); return g; },
  elder() { const g = new THREE.Group(), cloth = 0x6b6b6b, skin = 0xcbb8a4;
    limb(g, [-.09, 0, 0], [-.08, .82, 0], .065, 0x4a4a4a); limb(g, [.09, 0, 0], [.08, .82, 0], .065, 0x4a4a4a);
    const body = ball(g, .2, cloth, 0, 1.12, .05, 1, 1.45, .7); body.rotation.x = .28;
    ball(g, .11, skin, 0, 1.47, .2); limb(g, [.2, 1.3, .1], [.32, .82, .3], .045, cloth); limb(g, [.34, 0, .32], [.33, .84, .3], .015, 0x222222);
    limb(g, [-.2, 1.3, .1], [-.24, .86, .18], .045, cloth); return g; },
  elderSit() { const g = new THREE.Group(), cloth = 0x6b6b6b, skin = 0xcbb8a4;
    for (const [x, z] of [[-.22, -.2], [.22, -.2], [-.22, .2], [.22, .2]]) cyl(g, .02, .02, .45, 0x3a2e24, x, 0, z, 8);
    box(g, .5, .05, .48, 0x5a4636, 0, .45, 0); box(g, .5, .5, .05, 0x5a4636, 0, .5, -.22);
    limb(g, [-.1, .52, 0], [-.1, .52, .3], .07, 0x4a4a4a); limb(g, [.1, .52, 0], [.1, .52, .3], .07, 0x4a4a4a);
    limb(g, [-.1, .52, .3], [-.1, 0, .32], .06, 0x4a4a4a); limb(g, [.1, .52, .3], [.1, 0, .32], .06, 0x4a4a4a);
    ball(g, .2, cloth, 0, .82, -.04, 1, 1.35, .7); ball(g, .11, skin, 0, 1.16, .02);
    limb(g, [-.2, .98, 0], [-.18, .6, .28], .045, cloth); limb(g, [.2, .98, 0], [.18, .6, .28], .045, cloth); return g; }
};
function put(scene, kind, x, y, z, ry = 0) { const g = ACTORS[kind](); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g; }

// --- 방 ---
function buildHall() { // CAM 1 복도: 폭 3m, 길이 16m, 양쪽 문, 천장 등
  const scene = new THREE.Scene(); shell(scene, 3, 3, 16, 0xbfc3bd, 0x8a8d88); lights(scene);
  for (const z of [-6, -2, 2]) for (const s of [-1, 1]) { box(scene, .06, 2.1, 1, 0x3c3c3c, s * 1.47, 0, z); box(scene, .03, .04, .12, 0xdddddd, s * 1.43, 1.0, z + .35); }
  for (const z of [-6, -2, 2, 6]) box(scene, .6, .04, 1.2, 0xffffff, 0, 2.94, z);
  box(scene, 3, 2.4, .06, 0x2f2f2f, 0, 0, -7.95); // 복도 끝 어두운 문
  return { scene, camera: roomCam([.9, 2.7, 7.6], [-.1, .8, -4]), spots: { p1: [['mannequin', -.6, 0, -3.5, .3]], far: [-.2, 0, -6.5], near: [.1, 0, 3.8], p3: [['elder', .3, 0, -1.5, Math.PI]] } };
}
function buildLobby() { // CAM 3 로비: 엘리베이터, 안내 데스크, 긴 의자
  const scene = new THREE.Scene(); shell(scene, 10, 4, 9, 0xb8bcb6, 0x7f827d); lights(scene);
  box(scene, 2.6, 2.8, .1, 0x2b2b2b, -1, 0, -4.45); for (const x of [-1.47, -.53]) box(scene, .9, 2.4, .06, 0x9ea19c, x, 0, -4.38);
  box(scene, .9, .25, .06, 0x111111, -1, 2.95, -4.4); box(scene, .12, .3, .04, 0xe0e0e0, .55, 1.1, -4.42);
  box(scene, 3.2, 1.1, .8, 0x4a4a4a, 2.5, 0, -1.6); box(scene, 3.3, .05, .9, 0x2a2a2a, 2.5, 1.1, -1.6);
  box(scene, 2.2, .45, .5, 0x3a3a3a, -3.4, 0, 1.6); cyl(scene, .25, .2, .5, 0x3a3a3a, 3.9, 0, 3.2); ball(scene, .45, 0x2d2d2d, 3.9, 1.0, 3.2, 1, 1.2, 1);
  return { scene, camera: roomCam([4.6, 3.7, 4.2], [-1.2, .5, -2.2]), spots: { p1: [['cat', -1.6, 0, .4, .6]], far: [-1, 0, -3.6], near: [2.2, 0, 2.2], p3: [['elderSit', -1.4, 0, 1.4, .5]] } };
}
function buildStore() { // CAM 4 창고: 선반 두 줄, 상자 더미
  const scene = new THREE.Scene(); shell(scene, 7, 3.2, 6, 0xb2b5af, 0x7a7c78); lights(scene);
  for (const x0 of [-2.6, -.6]) { for (const x of [x0, x0 + 1.6]) for (const z of [-2.7, -2.1]) box(scene, .05, 2.2, .05, 0x2a2a2a, x, 0, z);
    for (const y of [.15, .9, 1.65]) box(scene, 1.65, .04, .65, 0x555555, x0 + .8, y, -2.4);
    box(scene, .5, .4, .45, 0x8b7355, x0 + .4, .94, -2.4); box(scene, .6, .5, .45, 0x7a6448, x0 + 1.1, .19, -2.4); box(scene, .4, .3, .4, 0x8b7355, x0 + 1.2, 1.69, -2.4); }
  box(scene, .8, .6, .7, 0x7a6448, 2.2, 0, -1.2); box(scene, .7, .55, .6, 0x8b7355, 2.25, .6, -1.2, .2); box(scene, .6, .5, .6, 0x8b7355, 1.3, 0, -.4, -.3);
  return { scene, camera: roomCam([3.2, 3.0, 2.7], [-1, .6, -1.5]), spots: { p1: [['robot', -.5, 0, .2, 0]], far: [-2.8, 0, -1.4], near: [1.5, 0, 1.6], p3: [['elder', -1.2, 0, -.9, .4]] } };
}

function buildStairs(json) { // CAM 2 계단: 11/05 시험 3D 그대로
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101010);
  const model = new THREE.ObjectLoader().parse(json); scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 1.0)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(3, 6, 2); scene.add(sun);
  const camera = roomCam([5.8, 5.4, 8.8], [2.0, 1.0, 2.6]);
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), at = (x, z) => { ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(model, true)[0]; return [x, h ? h.point.y : 0, z]; };
  return { scene, camera, spots: { actor: at(3.4, 6.8), far: at(1.6, 2.6), near: at(4.2, 6.8), elder: at(3.0, 5.2), hint: at(2.6, 6.2) } };
}
// 방마다 모델 세울 자리: actor = 1페 것들, far→near = 2페 그림자(확인할수록 가까이), elder = 3페 할배, hint = 교복 치마
const SPOTS = {
  hall: { actor: [-.6, 0, -3.5], far: [-.2, 0, -6.5], near: [.1, 0, 3.8], elder: [.3, 0, -1.5], hint: [.5, 0, -.5] },
  lobby: { actor: [-1.6, 0, .4], far: [-1, 0, -3.6], near: [2.2, 0, 2.2], elder: [-1.4, 0, 1.4], hint: [0, 0, 1.2] },
  store: { actor: [-.5, 0, .2], far: [-2.8, 0, -1.4], near: [1.5, 0, 1.6], elder: [-1.2, 0, -.9], hint: [.4, 0, .9] }
};
function build(id, stairsJson) {
  const s = id === 'hall' ? buildHall() : id === 'lobby' ? buildLobby() : id === 'store' ? buildStore() : buildStairs(stairsJson);
  if (SPOTS[id]) s.spots = SPOTS[id];
  return s;
}
// 모델 하나를 세운다(멈춰 있음, 카메라 쪽을 봄). t = 그림자 가까움(0 먼 곳 → 1 가까운 곳, 1보다 크면 더 앞)
function stand(s, kind, t = 0) {
  if (s.actors) s.scene.remove(s.actors);
  const g = new THREE.Group(); s.actors = g; s.scene.add(g); if (!kind) return;
  const sp = s.spots; let p = kind === 'shadow' ? sp.far.map((v, i) => v + (sp.near[i] - v) * t) : kind === 'skirt' ? sp.hint : (kind === 'elder' || kind === 'elderSit') ? sp.elder : sp.actor;
  if (kind === 'shadow' && t > 1) p = sp.near.map((v, i) => v + (s.camera.position.toArray()[i] - v) * Math.min(.6, (t - 1)) * (i === 1 ? 0 : 1));
  put(g, kind, p[0], p[1], p[2], Math.atan2(s.camera.position.x - p[0], s.camera.position.z - p[2]));
}
function addSkirt(s, on) { if (s.skirt) { s.scene.remove(s.skirt); s.skirt = null; } if (on) { const p = s.spots.hint; s.skirt = put(s.scene, 'skirt', p[0], p[1], p[2], 0); } }
// 인트로와 같은 흑백 4×4 디더 + 선·모서리 살짝 진하게(사용자 「선·모서리」「지금보다 살짝 더 진하게ㅇㅇ」)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), EDGE = .24;
let renderer = null;
function render(s, canvas) {
  const rect = canvas.getBoundingClientRect(); if (!rect.width) return;
  const w = Math.max(120, Math.min(360, Math.round(rect.width / 2.4))), h = Math.max(1, Math.round(w * rect.height / rect.width));
  canvas.width = w; canvas.height = h;
  renderer = renderer || new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(w, h, false); s.camera.aspect = w / h; s.camera.updateProjectionMatrix(); renderer.render(s.scene, s.camera);
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(renderer.domElement, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h), d = img.data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (.2126 * d[i * 4] + .7152 * d[i * 4 + 1] + .0722 * d[i * 4 + 2]) / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let l = L[i]; l = l < .16 ? 0 : l > .88 ? 1 : (l - .16) / .72;
    let v = l > BAYER[(y & 3) * 4 + (x & 3)] ? 255 : 0;
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) { const p = (dx, dy) => L[(y + dy) * w + x + dx];
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1), gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
      if (Math.hypot(gx, gy) > EDGE * 4) v = 0; }
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
return { build, stand, addSkirt, render };
})();

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
function shell(scene, W, H, D, wall, floor, cz = 0) { // cz = 방 가운데 z(11/17 창고를 뒤로 늘릴 때 씀, 나머지 방은 0 그대로)
  const s = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ color: wall, roughness: .95, side: THREE.BackSide }));
  s.position.set(0, H / 2, cz); scene.add(s);
  box(scene, W, .02, D, floor, 0, 0, cz);
  for (const [w, d, x, z] of [[W, .06, 0, -D / 2 + .03], [.06, D, -W / 2 + .03, 0], [.06, D, W / 2 - .03, 0]]) box(scene, w, .12, d, 0x2a2a2a, x, 0, z + cz); // 걸레받이
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

// --- 방마다 놓아 두는 물건(11/17 사용자 「ㅇㅇ」: 화면마다 빈 건물에 어울리는 물건을 여러 개 더, 규칙·정답 자리는 그대로) ---
// 모두 멈춰 있는 기본 도형. 모델이 서는 자리(actor·far→near 길·elder·hint)와 카메라 사이를 피해 벽·구석에 둔다.
const PROPS = {
  chair() { const g = new THREE.Group(), c = 0x3d3d3d; // 앞이 +z
    for (const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) cyl(g, .018, .018, .45, 0x222222, x, 0, z, 8);
    box(g, .46, .05, .46, c, 0, .45, 0); box(g, .46, .45, .04, c, 0, .5, -.21); return g; },
  chairDown() { const g = PROPS.chair(); g.rotation.x = -Math.PI / 2; g.position.y = .23; const o = new THREE.Group(); o.add(g); return o; }, // 넘어진 의자
  bin() { const g = new THREE.Group(); cyl(g, .19, .15, .48, 0x2c2c2c, 0, 0, 0, 14); cyl(g, .2, .2, .03, 0x1a1a1a, 0, .48, 0, 14); ball(g, .1, 0xd8d8d8, .03, .52, .02, 1.2, .7, 1); return g; },
  papers() { const g = new THREE.Group(); // 바닥에 흩어진 종이
    for (const [x, z, r] of [[0, 0, .3], [.22, .1, -.5], [-.15, .2, 1.1], [.05, -.25, .8], [.3, -.15, 2.2]]) box(g, .3, .006, .22, 0xf0f0f0, x, 0, z, r); return g; },
  paperStack() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) box(g, .32, .025, .24, i % 2 ? 0xe8e8e8 : 0xcfcfcf, (i % 3) * .01, i * .025, 0, (i % 3 - 1) * .08); return g; },
  sign() { const g = new THREE.Group(), c = 0xd9d9d9; // 바닥 주의 표지(A자)
    for (const s of [-1, 1]) { const m = box(g, .32, .62, .02, c, 0, 0, s * .1); m.rotation.x = s * .28; m.position.y = .29; }
    box(g, .2, .05, .01, 0x111111, 0, .38, .2); return g; },
  cabinet() { const g = new THREE.Group(); box(g, .5, 1.3, .55, 0x5e5e5e, 0, 0, 0);
    for (const y of [.2, .55, .9]) { box(g, .44, .02, .01, 0x1c1c1c, 0, y + .3, .28); box(g, .12, .03, .02, 0xbdbdbd, 0, y + .15, .29); } return g; },
  extinguisher() { const g = new THREE.Group(); cyl(g, .08, .08, .42, 0x4a4a4a, 0, 0, 0, 12); cyl(g, .03, .03, .08, 0x111111, 0, .42, 0, 8); limb(g, [.03, .47, 0], [.12, .3, .04], .012, 0x111111); return g; },
  cone() { const g = new THREE.Group(); box(g, .3, .03, .3, 0x222222, 0, 0, 0); const c = new THREE.Mesh(new THREE.ConeGeometry(.12, .45, 14), M(0xd0d0d0)); c.position.y = .26; g.add(c);
    cyl(g, .085, .065, .07, 0x2a2a2a, 0, .18, 0, 14); return g; },
  pallet() { const g = new THREE.Group(), c = 0x8a7a64;
    for (const z of [-.45, -.15, .15, .45]) box(g, 1.1, .03, .16, c, 0, .1, z); for (const x of [-.48, 0, .48]) box(g, .1, .1, 1.05, 0x6f624f, x, 0, 0); return g; },
  ladder() { const g = new THREE.Group(), c = 0x7d7d7d; const L = new THREE.Group(); // 벽에 기대 둔 사다리(앞이 +z, 뒤 벽 쪽으로 기움)
    for (const x of [-.22, .22]) box(L, .05, 2.2, .05, c, x, 0, 0); for (let y = .3; y < 2.2; y += .35) box(L, .44, .03, .04, c, 0, y, 0);
    L.rotation.x = -.22; g.add(L); return g; },
  sack() { const g = new THREE.Group(); ball(g, .26, 0x1e1e1e, 0, .2, 0, 1, .8, .9); ball(g, .07, 0x1e1e1e, .02, .42, 0, .6, 1, .6); return g; }, // 쓰레기 봉투
  boxes(n = 3) { const g = new THREE.Group(); let y = 0; // 쌓인 상자
    for (let i = 0; i < n; i++) { const w = .5 - i * .06; box(g, w, .36 - i * .03, w * .85, i % 2 ? 0x8b7355 : 0x7a6448, (i % 2) * .04, y, 0, i * .25); y += .36 - i * .03; } return g; },
  board() { const g = new THREE.Group(); box(g, 1.1, .7, .03, 0x6d6d6d, 0, 0, 0); // 벽 게시판 + 붙은 종이
    for (const [x, y] of [[-.3, .15], [.05, .3], [.3, .1], [-.1, .42]]) box(g, .22, .28, .01, 0xeeeeee, x, y, .02); return g; },
  clock() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .04, 20), M(0xe6e6e6)); m.rotation.x = Math.PI / 2; g.add(m);
    box(g, .02, .14, .01, 0x111111, 0, -.02, .03); box(g, .1, .02, .01, 0x111111, .04, -.01, .03); return g; },
  exitSign() { const g = new THREE.Group(); box(g, .5, .2, .06, 0xf2f2f2, 0, 0, 0); box(g, .3, .06, .01, 0x111111, 0, .07, .035); return g; },
  monitor() { const g = new THREE.Group(); box(g, .4, .3, .04, 0x1a1a1a, 0, .12, 0); box(g, .08, .12, .08, 0x2a2a2a, 0, 0, -.02); return g; },
  phone() { const g = new THREE.Group(); box(g, .18, .06, .14, 0x222222, 0, 0, 0); box(g, .2, .04, .05, 0x111111, 0, .06, -.03); return g; },
  drum() { const g = new THREE.Group(); cyl(g, .3, .3, .88, 0x4d4d4d, 0, 0, 0, 18); for (const y of [.28, .58]) cyl(g, .31, .31, .03, 0x2b2b2b, 0, y, 0, 18); return g; },
  rug() { const g = new THREE.Group(); box(g, 2.2, .01, 1.3, 0x5a5a5a, 0, 0, 0); box(g, 2.0, .012, 1.1, 0x6e6e6e, 0, 0, 0); return g; }
};
function prop(scene, kind, x, y, z, ry = 0, arg) { const g = PROPS[kind](arg); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g; }

// --- 방 ---
function buildHall() { // CAM 1 복도: 폭 3m, 길이 16m, 양쪽 문, 천장 등
  const scene = new THREE.Scene(); shell(scene, 3, 3, 16, 0xbfc3bd, 0x8a8d88); lights(scene);
  for (const z of [-6, -2, 2]) for (const s of [-1, 1]) { box(scene, .06, 2.1, 1, 0x3c3c3c, s * 1.47, 0, z); box(scene, .03, .04, .12, 0xdddddd, s * 1.43, 1.0, z + .35); }
  for (const z of [-6, -2, 2, 6]) box(scene, .6, .04, 1.2, 0xffffff, 0, 2.94, z);
  box(scene, 3, 2.4, .06, 0x2f2f2f, 0, 0, -7.95); // 복도 끝 어두운 문
  // 11/17 물건: 벽 쪽(x ±1.1 너머)과 문 사이에만. 가운데 길(모델·그림자 자리)은 비워 둠.
  prop(scene, 'chair', -1.15, 0, .2, Math.PI / 2); prop(scene, 'chair', -1.15, 0, .85, Math.PI / 2 - .2); prop(scene, 'bin', -1.25, 0, -3.9);
  prop(scene, 'boxes', -1.1, 0, -7.2, .3, 3); prop(scene, 'boxes', 1.15, 0, -6.9, -.2, 2); prop(scene, 'sign', 1.05, 0, -4.1, -.5);
  prop(scene, 'extinguisher', 1.36, 0, 4.4); prop(scene, 'board', -1.46, 1.1, 4.6, Math.PI / 2); prop(scene, 'exitSign', 0, 2.55, -7.9);
  prop(scene, 'papers', -.85, 0, 5.6, .4); prop(scene, 'papers', .75, 0, 1.0, 1.7); prop(scene, 'sack', 1.15, 0, 5.4); prop(scene, 'chairDown', 1.0, 0, -.9, 2.2);
  return { scene, camera: roomCam([.9, 2.7, 7.6], [-.1, .8, -4]), spots: { p1: [['mannequin', -.6, 0, -3.5, .3]], far: [-.2, 0, -6.5], near: [.1, 0, 3.8], p3: [['elder', .3, 0, -1.5, Math.PI]] } };
}
function buildLobby() { // CAM 3 로비: 엘리베이터, 안내 데스크, 긴 의자
  const scene = new THREE.Scene(); shell(scene, 10, 4, 9, 0xb8bcb6, 0x7f827d); lights(scene);
  box(scene, 2.6, 2.8, .1, 0x2b2b2b, -1, 0, -4.45); for (const x of [-1.47, -.53]) box(scene, .9, 2.4, .06, 0x9ea19c, x, 0, -4.38);
  box(scene, .9, .25, .06, 0x111111, -1, 2.95, -4.4); box(scene, .12, .3, .04, 0xe0e0e0, .55, 1.1, -4.42);
  box(scene, 3.2, 1.1, .8, 0x4a4a4a, 2.5, 0, -1.6); box(scene, 3.3, .05, .9, 0x2a2a2a, 2.5, 1.1, -1.6);
  box(scene, 2.2, .45, .5, 0x3a3a3a, -3.4, 0, 1.6); cyl(scene, .25, .2, .5, 0x3a3a3a, 3.9, 0, 3.2); ball(scene, .45, 0x2d2d2d, 3.9, 1.0, 3.2, 1, 1.2, 1);
  // 11/17 물건: 안내 데스크 위·뒤, 왼쪽 벽 대기 의자, 뒤 벽 캐비닛·상자·게시판·시계. far→near 길과 할배·치마 자리는 비워 둠.
  prop(scene, 'chair', 2.5, 0, -2.5, Math.PI - .3); prop(scene, 'monitor', 1.8, 1.15, -1.75, .3); prop(scene, 'paperStack', 3.3, 1.15, -1.5, .2); prop(scene, 'phone', 2.6, 1.15, -1.35, -.2);
  for (const z of [-3.1, -2.3, -1.5]) prop(scene, 'chair', -4.55, 0, z, Math.PI / 2); prop(scene, 'chairDown', -4.0, 0, -.4, 1.1);
  prop(scene, 'cabinet', 4.4, 0, -4.1); prop(scene, 'cabinet', 3.8, 0, -4.1); prop(scene, 'boxes', 1.1, 0, -3.95, .2, 3); prop(scene, 'boxes', 1.75, 0, -3.95, -.3, 1);
  prop(scene, 'board', -3.6, 1.2, -4.47); prop(scene, 'clock', 3.0, 2.55, -4.44); prop(scene, 'bin', -2.0, 0, 2.35);
  prop(scene, 'papers', -.2, 0, -1.0, .6); prop(scene, 'papers', 3.2, 0, .3, 2.0); prop(scene, 'sign', 4.2, 0, .8, -.9); prop(scene, 'sack', -4.4, 0, 3.6); prop(scene, 'rug', -3.3, 0, 2.7);
  return { scene, camera: roomCam([4.6, 3.7, 4.2], [-1.2, .5, -2.2]), spots: { p1: [['cat', -1.6, 0, .4, .6]], far: [-1, 0, -3.6], near: [2.2, 0, 2.2], p3: [['elderSit', -1.4, 0, 1.4, .5]] } };
}
function buildStore() { // CAM 4 창고: 선반 두 줄, 상자 더미
  // 11/17 사용자 「ㅇㅇ」(선반 한 쌍과 똑같은 쌍을 앞뒤 줄로 3쌍 더 = 6개, 모델 자리를 안 가리게 창고를 뒤로 늘림):
  //   방 깊이 6m(z -3~3) → 10.6m(z -7.6~3). 앞쪽(카메라·모델 자리)은 그대로, 뒤 벽만 4.6m 뒤로.
  const scene = new THREE.Scene(); shell(scene, 7, 3.2, 10.6, 0xb2b5af, 0x7a7c78, -2.3); lights(scene);
  for (const zc of [-2.4, -3.9, -5.4, -6.9]) for (const x0 of [-2.6, -.6]) { // 맨 앞 줄(-2.4)이 원래 선반 한 쌍, 뒤 세 줄이 새로 더한 것
    for (const x of [x0, x0 + 1.6]) for (const z of [zc - .3, zc + .3]) box(scene, .05, 2.2, .05, 0x2a2a2a, x, 0, z);
    for (const y of [.15, .9, 1.65]) box(scene, 1.65, .04, .65, 0x555555, x0 + .8, y, zc);
    box(scene, .5, .4, .45, 0x8b7355, x0 + .4, .94, zc); box(scene, .6, .5, .45, 0x7a6448, x0 + 1.1, .19, zc); box(scene, .4, .3, .4, 0x8b7355, x0 + 1.2, 1.69, zc); }
  box(scene, .8, .6, .7, 0x7a6448, 2.2, 0, -1.2); box(scene, .7, .55, .6, 0x8b7355, 2.25, .6, -1.2, .2); box(scene, .6, .5, .6, 0x8b7355, 1.3, 0, -.4, -.3);
  // 11/17 물건: 왼쪽 벽 사다리·팔레트, 뒤 구석 드럼통·캐비닛·상자, 쓰레기 봉투·넘어진 의자. far→near 길과 할배·치마 자리는 비워 둠.
  prop(scene, 'ladder', -3.25, 0, .9, Math.PI / 2); prop(scene, 'pallet', -2.6, 0, 2.0, .15); prop(scene, 'boxes', -2.55, .13, 2.0, .4, 2);
  prop(scene, 'drum', 3.0, 0, -2.5); prop(scene, 'drum', 2.35, 0, -2.6); prop(scene, 'cabinet', 1.55, 0, -2.65); prop(scene, 'boxes', -3.1, 0, -2.6, .2, 3);
  prop(scene, 'sack', 3.0, 0, .5); prop(scene, 'sack', 2.7, 0, .95); prop(scene, 'chairDown', .9, 0, -1.85, .6); prop(scene, 'papers', -1.6, 0, 1.6, 1.2); prop(scene, 'cone', 2.95, 0, 1.6);
  return { scene, camera: roomCam([3.2, 3.0, 2.7], [-1, .6, -1.5]), spots: { p1: [['robot', -.5, 0, .2, 0]], far: [-2.8, 0, -1.4], near: [1.5, 0, 1.6], p3: [['elder', -1.2, 0, -.9, .4]] } };
}

function buildStairs(json) { // CAM 2 계단: 11/05 시험 3D 그대로
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101010);
  const model = new THREE.ObjectLoader().parse(json); scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 1.0)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(3, 6, 2); scene.add(sun);
  const camera = roomCam([5.8, 5.4, 8.8], [2.0, 1.0, 2.6]);
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), at = (x, z) => { ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(model, true)[0]; return [x, h ? h.point.y : 0, z]; };
  // 11/17 물건: 아래층 왼쪽 벽 쪽(x 1.2 안쪽)에만. 모델 자리(x 2.6~4.2)·그림자 길은 비워 둠.
  const P = (kind, x, z, ry = 0, arg) => { const [px, py, pz] = at(x, z); prop(scene, kind, px, py, pz, ry, arg); };
  P('boxes', .45, 8.3, .3, 3); P('boxes', 1.05, 8.5, -.2, 1); P('bin', .35, 5.7); P('chair', .5, 6.7, Math.PI / 2 - .3); P('cone', 1.25, 4.6);
  P('papers', 1.7, 7.9, .9); P('sack', .4, 4.4); P('extinguisher', .12, 7.5);
  return { scene, camera, spots: { actor: at(3.4, 6.8), far: at(1.6, 2.6), near: at(4.2, 6.8), elder: at(3.0, 5.2), hint: at(2.6, 6.2), go: at(3.0, 5.2) } };
}
// 방마다 모델 세울 자리: actor = 1페 것들, far→near = 2페 그림자(확인할수록 가까이), elder = (옛) 3페 할배, hint = 교복 치마
// go = 3페 떠나는 할배(2026-11-24): 창고 앞쪽 빈 바닥(선반에 묻히지 않게) → 계단 → 복도 끝 문 쪽 → 로비 뒤 벽 문 앞. 카메라를 등지고 선다.
const SPOTS = {
  hall: { actor: [-.6, 0, -3.5], far: [-.2, 0, -6.5], near: [.1, 0, 3.8], elder: [.3, 0, -1.5], hint: [.5, 0, -.5], go: [0, 0, -5] },
  lobby: { actor: [-1.6, 0, .4], far: [-1, 0, -3.6], near: [2.2, 0, 2.2], elder: [-1.4, 0, 1.4], hint: [0, 0, 1.2], go: [-1, 0, -3.5] },
  store: { actor: [-.5, 0, .2], far: [-2.8, 0, -1.4], near: [1.5, 0, 1.6], elder: [-1.2, 0, -.9], hint: [.4, 0, .9], go: [-.4, 0, .3] }
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
  if (kind === 'elderGo') { p = sp.go; put(g, 'elder', p[0], p[1], p[2], Math.atan2(s.camera.position.x - p[0], s.camera.position.z - p[2]) + Math.PI); return; } // 등지고 떠나는 할배
  put(g, kind, p[0], p[1], p[2], Math.atan2(s.camera.position.x - p[0], s.camera.position.z - p[2]));
}
function addSkirt(s, on) { if (s.skirt) { s.scene.remove(s.skirt); s.skirt = null; } if (on) { const p = s.spots.hint; s.skirt = put(s.scene, 'skirt', p[0], p[1], p[2], 0); } }
// 인트로와 같은 흑백 4×4 디더 + 선·모서리 살짝 진하게(사용자 「선·모서리」「지금보다 살짝 더 진하게ㅇㅇ」)
// 11/17 사용자 「ㅇㅇ」(디더링 세기 지금의 절반): 칸마다 흑/백(디더) 100% → 디더 50% + 원래 밝기 50%로 섞음. 점무늬 대비가 절반이 됨. 선·모서리는 그대로.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16), EDGE = .24, DITHER = .5;
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
    let v = Math.round(255 * (DITHER * (l > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0) + (1 - DITHER) * l));
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) { const p = (dx, dy) => L[(y + dy) * w + x + dx];
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1), gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
      if (Math.hypot(gx, gy) > EDGE * 4) v = 0; }
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
return { build, stand, addSkirt, render };
})();

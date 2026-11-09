/* 물류센터 야간 분류 — 1페 3D 시안(2026-11-05, Claude Code). 02와 별도인 미리보기. 확정 전.
   사용자 11/05: 「물류센터 야간 분류를 할까」 「ㅇㅋ 일단 봐야 알 거 같다. 전체적인 화면자체느 3d겠지?」
   화면: 가운데 컨베이어(왼→오), 아래 번호 칸 4개, 오른쪽 위 송장 모니터 + AI 말풍선, 왼쪽 위 시계, 위에서 비스듬히 보는 카메라.
   조작: 맨 앞 상자의 송장 번호를 보고 아래 번호 칸(또는 숫자 키 1~4)을 누르면 그 칸으로 떨어진다.
   ?dither=0 이면 흑백 점 효과(세일러문 인트로와 같은 4×4 격자 디더)를 끈다. */
(() => {
  'use strict';
  const T = THREE;
  const params = new URLSearchParams(location.search);
  const DITHER = params.get('dither') !== '0';
  // ?phase=2 / ?phase=3 (11/05 사용자 「물류는 괜찮은거같은데」 → 2·3페 이어서)
  //  2페: 어두운 창고, 가끔 열린 상자 위에 죽은 쥐(사용자 「2페에서 상자 안에서 … 죽은 쥐같은 거」). 잘린 손·마네킹 손은 안 넣음.
  //       AI 말은 1페와 같은 놀리는 위로 + 글자 깨짐(사용자 「잇떤 대사에 글리치나 디스토션만」). 튀어나오는 연출·큰 소리 없음.
  //  3페(코디네이터 제안·Claude 세부): 할배 물건이 든 상자가 천천히 하나씩 오고, 송장이 「?」라 아무 칸에 보내도 된다. 마지막 상자를 보내면 아침.
  // 11/10 개발자용 02: 게임 위 1·2·3페 버튼이 window.WarehousePhase를 넣어 새로 연다(사용자 「저거도 개발자용에다가 돌려」「ㅇㅇ」). 주소 ?phase=도 그대로 됨.
const PHASE = [2, 3].includes(Number(window.WarehousePhase)) ? Number(window.WarehousePhase) : [2, 3].includes(Number(params.get('phase'))) ? Number(params.get('phase')) : 1;
  const canvas = document.getElementById('view');
  const renderer = new T.WebGLRenderer({ canvas, antialias: !DITHER, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const scene = new T.Scene();
  scene.background = new T.Color(0xf2f2f2);
  const camera = new T.PerspectiveCamera(38, 16 / 9, .1, 100);
  camera.position.set(0, 9.2, 8.6); camera.lookAt(0, 0, .9);

  const hemi = new T.HemisphereLight(0xffffff, 0x444444, 1.5); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 2.2); sun.position.set(-4, 10, 6); scene.add(sun);
  const lamp = new T.PointLight(0xffffff, 30, 14); lamp.position.set(0, 5, 0); scene.add(lamp);
  const LIGHT = { 1: [0xf2f2f2, 1.5, 2.2, 30], 2: [0x6a6a6a, .8, .9, 34], 3: [0x5a5a5a, .6, .7, 22] }[PHASE];
  scene.background = new T.Color(LIGHT[0]); hemi.intensity = LIGHT[1]; sun.intensity = LIGHT[2]; lamp.intensity = LIGHT[3];
  document.body.dataset.phase = String(PHASE);

  const mat = c => new T.MeshLambertMaterial({ color: c });
  const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
  function label(text, w = 256, h = 256, fg = '#000', bg = '#fff', font = 'bold 170px sans-serif') {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 8);
    g.lineWidth = 12; g.strokeStyle = fg; g.strokeRect(6, 6, w - 12, h - 12);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  // --- 바닥·벽(창고) ---
  const floor = new T.Mesh(new T.PlaneGeometry(40, 30), mat(0xdedede)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  for (let x = -14; x <= 14; x += 2) { const line = box(.04, .01, 30, mat(0xbdbdbd)); line.position.set(x, .005, 0); scene.add(line); }
  const wall = box(40, 8, .3, mat(0xcfcfcf)); wall.position.set(0, 4, -6); scene.add(wall);
  for (let x = -12; x <= 12; x += 4) { // 뒤 선반
    const rack = new T.Group();
    for (const y of [.9, 2.1, 3.3]) { const s = box(3.4, .08, 1, mat(0x8a8a8a)); s.position.y = y; rack.add(s); }
    for (const sx of [-1.65, 1.65]) { const p = box(.1, 3.6, .1, mat(0x555555)); p.position.set(sx, 1.8, 0); rack.add(p); }
    for (let i = 0; i < 5; i++) { const b = box(.55 + Math.random() * .3, .5, .7, mat(0xb5b5b5)); b.position.set(-1.2 + i * .6, 1.2 + (i % 3) * 1.2, 0); rack.add(b); }
    rack.position.set(x, 0, -5); scene.add(rack);
  }

  // --- 컨베이어 ---
  const belt = box(13, .18, 1.6, mat(0x2a2a2a)); belt.position.set(0, .9, 0); scene.add(belt);
  for (const z of [-.86, .86]) { const rail = box(13, .14, .1, mat(0x9a9a9a)); rail.position.set(0, 1.04, z); scene.add(rail); }
  for (let x = -6; x <= 6; x += 1.5) for (const z of [-.7, .7]) { const leg = box(.1, .9, .1, mat(0x6a6a6a)); leg.position.set(x, .45, z); scene.add(leg); }
  const stripes = [];
  for (let x = -6.3; x <= 6.3; x += .6) { const s = box(.05, .005, 1.5, mat(0x5a5a5a)); s.position.set(x, 1.0, 0); scene.add(s); stripes.push(s); }

  // --- 아래 번호 칸 4개 ---
  const bins = [];
  for (let i = 0; i < 4; i++) {
    const g = new T.Group(), x = -3.6 + i * 2.4;
    const base = box(2, .1, 1.6, mat(0x9c9c9c)); base.position.y = .05; g.add(base);
    for (const [w, d, px, pz] of [[2, .1, 0, -.75], [2, .1, 0, .75], [.1, 1.6, -.95, 0], [.1, 1.6, .95, 0]]) { const side = box(w, .9, d, mat(0x7c7c7c)); side.position.set(px, .45, pz); g.add(side); }
    const sign = new T.Mesh(new T.PlaneGeometry(.9, .9), new T.MeshBasicMaterial({ map: label(String(i + 1)) }));
    sign.position.set(0, .55, .81); g.add(sign);
    g.position.set(x, 0, 3); scene.add(g);
    bins.push({ g, x, n: i + 1, count: 0 });
  }
  // 칸에서 컨베이어로 내려오는 미끄럼판
  for (const b of bins) { const chute = box(1.4, .06, 1.6, mat(0xb0b0b0)); chute.position.set(b.x, .75, 1.6); chute.rotation.x = .42; scene.add(chute); }

  // --- 상자 ---
  const ODD = [ // 1페 병맛: 가끔 상자 위로 이상한 게 삐져나와 있다(웃기게)
    g => { const duck = new T.Group(); const body = new T.Mesh(new T.SphereGeometry(.2, 12, 8), mat(0xffffff)); body.scale.set(1.2, .8, 1); duck.add(body); const head = new T.Mesh(new T.SphereGeometry(.12, 12, 8), mat(0xffffff)); head.position.set(.16, .16, 0); duck.add(head); const beak = box(.1, .04, .08, mat(0x333333)); beak.position.set(.3, .15, 0); duck.add(beak); duck.position.y = .48; g.add(duck); return '고무 오리'; },
    g => { const hat = new T.Mesh(new T.ConeGeometry(.18, .45, 12), mat(0x3a3a3a)); hat.position.y = .58; g.add(hat); const ball = new T.Mesh(new T.SphereGeometry(.06, 8, 6), mat(0xffffff)); ball.position.y = .82; g.add(ball); return '고깔모자'; },
    g => { for (let i = 0; i < 3; i++) { const sock = box(.1, .32, .1, mat(i % 2 ? 0x222222 : 0xeeeeee)); sock.position.set(-.15 + i * .15, .5, 0); sock.rotation.z = (i - 1) * .3; g.add(sock); } return '양말 세 짝'; }
  ];
  // 2페: 뚜껑이 열린 상자 위에 뒤집힌 죽은 쥐(회색, 다리가 위로).
  function deadRat(g, h) {
    const r = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(.16, 12, 8), mat(0x6a6a6a)); body.scale.set(1.6, .7, .9); r.add(body);
    const head = new T.Mesh(new T.ConeGeometry(.09, .22, 10), mat(0x6a6a6a)); head.rotation.z = -Math.PI / 2; head.position.set(.32, 0, 0); r.add(head);
    const tail = new T.Mesh(new T.CylinderGeometry(.012, .02, .5, 6), mat(0x8a8a8a)); tail.rotation.z = Math.PI / 2.4; tail.position.set(-.42, .04, .05); r.add(tail);
    for (const [x, z] of [[.12, .07], [.12, -.07], [-.14, .07], [-.14, -.07]]) { const leg = box(.025, .1, .025, mat(0x8a8a8a)); leg.position.set(x, .12, z); r.add(leg); }
    r.position.y = h + .14; r.scale.setScalar(1.5); g.add(r);
  }
  function openFlaps(g, w, h) {
    for (const s of [-1, 1]) { const flap = box(w / 2, .02, .95, mat(0xb0b0b0)); flap.position.set(s * (w / 2 + .18), h - .05, 0); flap.rotation.z = s * -1.1; g.add(flap); }
  }
  // 2페 흉측한 물건 8개(11/06 사용자 「그럼 그것들 2페에다가 하자. 현실적ㅇ닌 거 말고, 존나 하프톤 효과를 뚫고 나오는 흉측함으로다가 해」).
  // 「그것들」 = 코디네이터가 낸 8개. 이것들만 흑백 점(디더) 밖에서 따로, 화면 해상도 그대로 그려서
  // 점 무늬를 뚫고 나온 것처럼 보이게 한다(선명한 화소·검은 테두리·둘레 점이 지글거림). 사실적으로 만들지 않는다.
  // 나오는 방식은 2페 그대로: 튀어나오거나 큰 소리 없이 상자에 담겨 컨베이어로 들어온다. 손은 안 넣음.
  const CREEP_LAYER = 1;
  const through = o => { o.traverse(m => m.layers.set(CREEP_LAYER)); return o; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const srgb = c => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }; // 그린 회색이 그대로 나오게
  // 11/06 사용자 「ㄴㄴ 걍 이름은 하지마」 → 플레이어 이름 송장은 뺌(7개 + 죽은 쥐)
  const CREEP = {
    '머리카락 뭉치': (g, w, h) => {
      const hair = mat(0x0c0c0c);
      const clump = new T.Mesh(new T.IcosahedronGeometry(.2, 3), hair);
      const pos = clump.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const k = 1 + rnd(-.25, .35); pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * .6, pos.getZ(i) * k); }
      clump.geometry.computeVertexNormals(); clump.position.y = h + .08; g.add(clump);
      for (let i = 0; i < 52; i++) { // 상자 위에서 모서리를 넘어 옆면으로 흘러내린 가닥
        const a = rnd(0, Math.PI * 2), ex = Math.cos(a), ez = Math.sin(a);
        const lim = Math.min((w / 2) / Math.max(1e-3, Math.abs(ex)), .475 / Math.max(1e-3, Math.abs(ez)));
        const fall = rnd(.12, h - .03);
        const pts = [new T.Vector3(rnd(-.12, .12), h + rnd(.06, .2), rnd(-.12, .12)),
          new T.Vector3(ex * lim * .55, h + rnd(.03, .12), ez * lim * .55),
          new T.Vector3(ex * (lim + .015), h + .01, ez * (lim + .015)),
          new T.Vector3(ex * (lim + .025) + rnd(-.04, .04), h - fall * .5, ez * (lim + .025) + rnd(-.04, .04)),
          new T.Vector3(ex * (lim + .03) + rnd(-.07, .07), h - fall, ez * (lim + .03) + rnd(-.07, .07))];
        g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, rnd(.006, .013), 4), hair));
      }
      return { tick: t => { clump.scale.set(1 + .03 * Math.sin(t * 1.1), 1 + .06 * Math.sin(t * 1.1), 1); } };
    },
    '이빨 봉투': (g, w, h) => {
      const bag = new T.Group();
      bag.add(box(.58, .03, .44, mat(0x5c5c5c))); // 어두운 봉투라 흰 이빨이 보이게
      const zip = box(.58, .036, .04, mat(0x1e1e1e)); zip.position.set(0, .004, -.2); bag.add(zip);
      bag.position.y = h + .03; bag.rotation.y = .3; bag.scale.setScalar(1.45); g.add(bag);
      const tooth = (x, y, z, s) => {
        const t = new T.Group();
        t.add(box(.06, .055, .055, mat(0xf6f6f6)));
        for (const dx of [-.015, .015]) { const root = new T.Mesh(new T.ConeGeometry(.014, .07, 5), mat(0x2e2e2e)); root.rotation.x = Math.PI; root.position.set(dx, -.06, 0); t.add(root); }
        t.position.set(x, y, z); t.rotation.set(rnd(-1.5, 1.5), rnd(0, 6.3), rnd(-1.5, 1.5)); t.scale.setScalar(s); return t;
      };
      for (let i = 0; i < 20; i++) bag.add(tooth(rnd(-.24, .24), .06, rnd(-.14, .17), rnd(1.1, 1.5)));
      for (let i = 0; i < 8; i++) g.add(tooth(rnd(-w / 2 + .05, w / 2 - .05), h + .05, rnd(.3, .46), 1.9)); // 봉투 밖으로 샌 것
      return {};
    },
    '구더기': (g, w, h) => {
      const geo = new T.CapsuleGeometry(.045, .13, 3, 8), m = mat(0xf2f2f2), list = [];
      for (let i = 0; i < 34; i++) {
        const holder = new T.Group(), mg = new T.Mesh(geo, m); mg.rotation.z = Math.PI / 2; holder.add(mg); g.add(holder);
        list.push({ holder, mg, side: i % 3 === 0, x: rnd(-w / 2 + .08, w / 2 - .08), z: rnd(-.36, .36), y: rnd(.04, .2), a: rnd(0, 6.3), p: rnd(0, 6.3), v: rnd(.04, .08), f: Math.random() });
      }
      return { tick: (t, dt) => {
        for (const q of list) {
          const s = Math.sin(t * 7 + q.p);
          q.mg.scale.set(1 - .18 * s, 1 + .32 * s, 1 - .18 * s); // 늘었다 줄었다(꿈틀)
          if (q.side) { // 앞면으로 흘러내림
            q.f = (q.f + dt * q.v * .5) % 1;
            q.holder.position.set(q.x + .02 * Math.sin(t * 2 + q.p), h - q.f * (h - .05), .5);
            q.holder.rotation.set(0, 0, Math.PI / 2 + .35 * Math.sin(t * 3 + q.p));
          } else { // 위에서 우글우글
            q.a += Math.sin(t * .8 + q.p) * dt * 1.5;
            q.x = Math.max(-w / 2 + .06, Math.min(w / 2 - .06, q.x + Math.cos(q.a) * q.v * dt));
            q.z = Math.max(-.4, Math.min(.4, q.z + Math.sin(q.a) * q.v * dt));
            q.holder.position.set(q.x, h + q.y, q.z); q.holder.rotation.set(0, -q.a, .25 * Math.sin(t * 4 + q.p));
          }
        }
      } };
    },
    '들썩이는 상자': (g, w, h, body, tag) => { // 테이프로 닫힌 상자, 안에서 뭔가 밀어 올린다
      through(body); through(tag); // 송장도 뚜껑과 같이 들린다
      const tagY = (1 - ((w / 2 - .26) / (w / 2)) ** 2) * (1 - (.3 / .475) ** 2);
      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#c4c4c4'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#5e5e5e'; x.fillRect(0, 50, 128, 28);
      const lid = new T.Mesh(new T.PlaneGeometry(w, .95, 26, 26), new T.MeshLambertMaterial({ map: srgb(c) }));
      lid.rotation.x = -Math.PI / 2; g.add(lid);
      const p = lid.geometry.attributes.position, base = Float32Array.from(p.array);
      let hopAt = 2, hop = 0;
      return { tick: (t, dt) => {
        const s = Math.pow(Math.max(0, Math.sin(t * 1.6)), 3), cx = .28 * w * Math.sin(t * .9), cy = .22 * Math.cos(t * 1.3);
        if (t > hopAt) { hopAt = t + rnd(1.8, 3.2); hop = .07; } hop = Math.max(0, hop - dt * .35);
        const k = 1 + .06 * s;
        body.scale.set(1 + .03 * s, k, 1 + .03 * s); body.position.y = h * k / 2 + hop;
        lid.position.y = h * k + .006 + hop;
        tag.position.y = lid.position.y + tagY * (.06 + .16 * s) + .012;
        for (let i = 0; i < p.count; i++) {
          const bx = base[i * 3], by = base[i * 3 + 1], ux = bx / (w / 2), uy = by / .475;
          const dome = Math.max(0, (1 - ux * ux) * (1 - uy * uy));
          p.setZ(i, dome * (.06 + .16 * s) + .16 * Math.exp(-((bx - cx) ** 2 + (by - cy) ** 2) / .018) * dome);
        }
        p.needsUpdate = true; lid.geometry.computeVertexNormals();
      } };
    },
    '울리는 휴대폰': (g, w, h) => {
      const ph = new T.Group();
      ph.add(box(.25, .035, .46, mat(0x161616)));
      const tex = [1, 2].map(rings => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 232; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 232); x.fillStyle = '#000'; x.strokeStyle = '#000';
        x.beginPath(); x.arc(64, 150, 20, 0, Math.PI * 2); x.fill(); // 받기 버튼
        x.lineWidth = 7; for (let r = 1; r <= rings; r++) { x.beginPath(); x.arc(64, 150, 20 + r * 16, 0, Math.PI * 2); x.stroke(); }
        x.fillRect(34, 40, 60, 10);
        return srgb(c);
      });
      const screen = new T.Mesh(new T.PlaneGeometry(.21, .38), new T.MeshBasicMaterial({ map: tex[0] }));
      screen.rotation.x = -Math.PI / 2; screen.position.y = .019; ph.add(screen);
      const bx = rnd(-.1, .1), ry = rnd(-.4, .4);
      ph.position.set(bx, h + .1, .05); ph.rotation.set(.5, ry, 0); ph.scale.setScalar(1.5); g.add(ph);
      return { tick: t => { // 소리 없이 진동만
        const on = t % 1.6 < 1;
        ph.position.x = bx + (on ? rnd(-.02, .02) : 0); ph.rotation.y = ry + (on ? rnd(-.05, .05) : 0);
        screen.material.map = tex[on && Math.floor(t * 5) % 2 ? 1 : 0];
      } };
    },
    '눈 긁힌 할배 가족사진': (g, w, h) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d');
      x.fillStyle = '#6e6e6e'; x.fillRect(0, 0, 256, 320);
      const people = [[54, 118, 31, '#1e1e1e'], [130, 100, 38, '#ffffff', 1], [206, 146, 27, '#2c2c2c']]; // 할배는 가운데, 흰 머리
      for (const [cx, cy, r, col, elder] of people) {
        x.fillStyle = '#262626'; x.beginPath(); x.ellipse(cx, cy + r * 3.4, r * 1.5, r * 2.3, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#f2f2f2'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
        x.fillStyle = col; x.beginPath(); x.arc(cx, cy - r * .35, r * 1.02, Math.PI, 0); x.fill();
        if (elder) { x.fillStyle = '#f2f2f2'; x.beginPath(); x.arc(cx, cy - r * .5, r * .7, Math.PI, 0); x.fill(); }
        x.fillStyle = '#111'; for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + s * r * .38, cy + r * .05, 2.4, 0, Math.PI * 2); x.fill(); }
        // 눈만 긁어 냈다
        for (let i = 0; i < 14; i++) {
          x.strokeStyle = i % 4 ? '#000' : '#fff'; x.lineWidth = i % 4 ? rnd(5, 9) : 3;
          x.beginPath(); let px = cx - r - 4, py = cy + rnd(-r * .3, r * .3); x.moveTo(px, py);
          while (px < cx + r + 4) { px += rnd(4, 9); py = cy + rnd(-r * .32, r * .32); x.lineTo(px, py); }
          x.stroke();
        }
      }
      x.lineWidth = 10; x.strokeStyle = '#f0f0f0'; x.strokeRect(5, 5, 246, 310);
      const fr = new T.Group();
      fr.add(box(.5, .03, .6, mat(0x1c1c1c)));
      const pic = new T.Mesh(new T.PlaneGeometry(.44, .55), new T.MeshBasicMaterial({ map: srgb(c) }));
      pic.rotation.x = -Math.PI / 2; pic.position.y = .017; fr.add(pic);
      fr.position.set(0, h + .2, .02); fr.rotation.set(.85, rnd(-.15, .15), 0); fr.scale.setScalar(1.75); g.add(fr);
      return {};
    },
    '젖은 아기 신발': (g, w, h) => {
      const wet = new T.MeshPhongMaterial({ color: 0xd2d2d2, shininess: 140, specular: 0xffffff });
      const shoe = () => {
        const s = new T.Group();
        const sole = new T.Mesh(new T.CapsuleGeometry(.065, .14, 4, 10), mat(0x262626)); sole.rotation.x = Math.PI / 2; sole.scale.set(1, 1, .3); s.add(sole);
        const up = new T.Mesh(new T.SphereGeometry(.075, 14, 10), wet); up.scale.set(1, .8, 1.35); up.position.set(0, .05, .02); s.add(up);
        const hole = new T.Mesh(new T.CircleGeometry(.042, 14), mat(0x050505)); hole.rotation.x = -Math.PI / 2; hole.position.set(0, .112, -.03); s.add(hole);
        const strap = box(.16, .02, .03, mat(0x262626)); strap.position.set(0, .1, .06); s.add(strap);
        return s;
      };
      const a = shoe(); a.position.set(-.15, h + .04, .12); a.rotation.y = Math.PI / 2 + .25; a.scale.setScalar(2.1); g.add(a);
      const b = shoe(); b.position.set(.22, h + .12, -.12); b.rotation.set(0, Math.PI / 2 - .4, 1.2); b.scale.setScalar(2.1); g.add(b);
      const patch = new T.Mesh(new T.CircleGeometry(.22, 20), mat(0x2a2a2a)); patch.rotation.x = -Math.PI / 2; patch.scale.set(1.4, 1, 1); patch.position.set(0, h + .012, .05); g.add(patch);
      const streak = new T.Mesh(new T.PlaneGeometry(.22, 1), mat(0x2a2a2a)); streak.position.set(-.08, h, .478); g.add(streak);
      const drops = [];
      for (let i = 0; i < 9; i++) { const d = new T.Mesh(new T.SphereGeometry(.03, 8, 6), wet); g.add(d); drops.push({ d, f: Math.random(), v: rnd(.25, .45), x: -.08 + rnd(-.06, .06) }); }
      let wetLen = .1;
      return { tick: (t, dt) => {
        wetLen = Math.min(h - .02, wetLen + dt * .02);
        streak.scale.y = wetLen; streak.position.y = h - wetLen / 2;
        for (const q of drops) { // 상자 앞면을 타고 흘러내림
          q.f = (q.f + dt * q.v) % 1;
          if (q.f < .35) q.d.position.set(q.x, h + .015, .1 + q.f / .35 * .38);
          else q.d.position.set(q.x, h - (q.f - .35) / .65 * (h - .03), .49);
        }
      } };
    }
  };
  const P2_ORDER = [];
  function nextCreep() { if (!P2_ORDER.length) P2_ORDER.push(...['죽은 쥐', ...Object.keys(CREEP)].sort(() => Math.random() - .5)); return P2_ORDER.shift(); }
  // 3페: 할배 물건(제안). 짐 싸기에 나온 물건(편지·카세트)과 여장 떡밥(교복 치마)에서 골랐다.
  const KEEP = [
    { name: '편지', make: (g, h) => { const p = box(.5, .03, .34, mat(0xf4f4f4)); p.position.y = h + .03; g.add(p); for (const s of [-1, 1]) { const l = box(.3, .005, .02, mat(0x444444)); l.position.set(s * .12, h + .05, -.05); l.rotation.y = s * .55; g.add(l); } } },
    { name: '카세트테이프', make: (g, h) => { const c = box(.5, .08, .32, mat(0x2a2a2a)); c.position.y = h + .06; g.add(c); for (const x of [-.12, .12]) { const reel = new T.Mesh(new T.CylinderGeometry(.06, .06, .02, 14), mat(0xffffff)); reel.position.set(x, h + .11, 0); g.add(reel); } } },
    { name: '교복 치마', make: (g, h) => { const s = new T.Mesh(new T.CylinderGeometry(.16, .34, .22, 16, 1, true), mat(0x333333)); s.material.side = T.DoubleSide; s.position.y = h + .13; g.add(s); const band = new T.Mesh(new T.CylinderGeometry(.165, .165, .04, 16), mat(0xeeeeee)); band.position.y = h + .25; g.add(band); } },
    { name: '마지막 상자', make: (g, h, w) => { for (const r of [0, Math.PI / 2]) { const str = box(r ? .03 : w + .02, .03, r ? .97 : .03, mat(0x333333)); str.position.y = h + .01; g.add(str); } } }
  ];
  const boxes = [];
  let spawned = 0;
  function makeBox() {
    const g = new T.Group();
    if (PHASE === 3 && spawned >= KEEP.length) return null;
    const keep = PHASE === 3 ? KEEP[spawned] : null;
    const w = keep && keep.name === '마지막 상자' ? 1.25 : .9 + Math.random() * .35, h = .55 + Math.random() * .2;
    const body = box(w, h, .95, mat(0xc4c4c4)); body.position.y = h / 2; g.add(body);
    // 2페: 두 상자에 하나꼴로 죽은 쥐·흉측한 물건 8개 중 하나(9개를 섞어 한 바퀴 돌면 다시 섞음)
    const creep = PHASE === 2 && spawned > 0 && spawned % 2 === 1 ? nextCreep() : '';
    const rat = creep === '죽은 쥐';
    const sealed = creep === '들썩이는 상자';
    if (rat || (creep && !sealed) || (keep && keep.name !== '마지막 상자')) openFlaps(g, w, h);
    else if (!keep && creep !== '들썩이는 상자') { const tape = box(w + .01, .02, .2, mat(0x6e6e6e)); tape.position.y = h + .005; g.add(tape); }
    const n = keep ? 0 : 1 + Math.floor(Math.random() * 4);
    let tag = null;
    {
      tag = new T.Mesh(new T.PlaneGeometry(.38, .38), new T.MeshBasicMaterial({ map: label(n ? String(n) : '?', 128, 128, '#000', '#fff', 'bold 90px sans-serif') }));
      tag.rotation.x = -Math.PI / 2; tag.position.set(w / 2 - .26, h + .02, .3); g.add(tag);
    }
    let odd = '', tick = null;
    if (PHASE === 1 && spawned > 0 && spawned % 3 === 1) odd = ODD[Math.floor(Math.random() * ODD.length)](g);
    if (rat) { deadRat(g, h); odd = '죽은 쥐'; }
    if (creep && !rat) {
      const it = new T.Group(); g.add(it);
      const r = CREEP[creep](it, w, h, body, tag) || {};
      through(it); odd = creep; tick = r.tick || null;
    }
    if (keep) {
      const item = new T.Group(); keep.make(item, 0, w); odd = keep.name;
      if (keep.name !== '마지막 상자') item.scale.setScalar(1.6);
      item.position.y = h; g.add(item);
    }
    g.userData = { n, h, odd, state: 'belt', vy: 0, tick, creep: !!creep && !rat };
    g.position.set(-7, 1.0, 0);
    scene.add(g); spawned++;
    return g;
  }

  // --- 화면 위 글자(시계·송장 모니터·AI) ---
  const $ = id => document.getElementById(id);
  let minutes = 0, sayTimer = 0;
  // 2페 글자 깨짐(src/phase/tease.js와 같은 식): 몇 글자를 ▒░로, 한 글자를 세 번.
  // strong: 흉측한 물건 상자를 보냈을 때는 더 많이 깨진다(대사는 1페 그대로).
  function broken(text, strong) {
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) if (chars[i] !== ' ' && Math.random() < (strong ? .3 : .14)) chars[i] = Math.random() < .5 ? '▒' : '░';
    for (let k = 0; k < (strong ? 3 : 1); k++) { const j = Math.floor(Math.random() * chars.length); chars.splice(j, 0, chars[j], chars[j]); }
    return chars.join('');
  }
  function say(text, ms = 3200, strong = false) { $('ai').textContent = PHASE === 2 ? broken(text, strong) : text; $('ai').classList.add('show'); clearTimeout(sayTimer); sayTimer = setTimeout(() => $('ai').classList.remove('show'), ms); }
  function front() { return boxes.find(b => b.userData.state === 'belt'); }
  let slipGlitch = 0;
  function showSlip() { const b = front(); $('slip-n').textContent = !b ? '-' : !b.userData.n ? '?' : performance.now() < slipGlitch ? String(1 + (b.userData.n % 4)) : b.userData.n; }
  // 11/05 사용자: 「칭찬말고 놀리는거(자기딴에는 위로하거나 괜찮다고 격려혹은 응원하는거)로 해줘 1페에서 ai음성을 말이야ㅇㅇ」
  const OK = ['맞히셨네요! 오늘은 운이 좋으신가 봐요.', '잘하셨어요. 숫자가 네 개뿐이니까요.', '한 번에 맞히셨어요! 다음엔 조금 더 빨리… 할 수 있어요, 아마도요.'];
  const WRONG = ['괜찮아요. N번도 숫자잖아요.', '틀려도 괜찮아요. 상자는 화를 안 내요.', '천천히 하세요. 밤은 길어요. 아주 길어요.'];
  const ODD_LINES = { '고무 오리': '오리도 택배예요. 할아버지 친구가 생겼네요!', '고깔모자': '상자도 생일 파티를 하네요. 괜찮아요, 할아버지 생일은 제가 기억해요.', '양말 세 짝': '한 짝이 없어도 괜찮아요. 혼자여도 양말은 양말이에요.' };
  // 2페 죽은 쥐: 새 대사 없이 1페에 있던 맞힘/틀림 대사를 그대로 쓰고 글자만 깨진다(사용자 「잇떤 대사에 글리치나 디스토션만」).
  // 3페(AI가 도와 달라고 하는 페이즈): 할배 물건마다 한 줄.
  const P3_START = '이번 건 저도 어디로 보내야 할지 몰라요. 대신 골라 주세요.';
  const P3_LINES = { '편지': '그분이 끝내 못 보낸 편지예요.', '카세트테이프': '밤마다 이걸 틀어 놓고 일하셨어요.', '교복 치마': '이건… 그분이 제일 오래 숨겨 둔 거예요.', '마지막 상자': '이제 다 보냈어요. 고마워요.' };
  let dawn = false;
  function drop(n) {
    const b = front(); if (!b) return;
    const bin = bins[n - 1]; b.userData.state = 'drop'; b.userData.target = bin; b.userData.vy = 0;
    if (PHASE === 3) {
      say(P3_LINES[b.userData.odd], 4200);
      if (b.userData.odd === '마지막 상자') setTimeout(() => { dawn = true; }, 1200);
      return;
    }
    const right = b.userData.n === n;
    if (b.userData.odd && ODD_LINES[b.userData.odd]) say(ODD_LINES[b.userData.odd]);
    else say((right ? OK : WRONG)[Math.floor(Math.random() * 3)].replace('N번', `${n}번`), 3200, b.userData.creep);
    if (!right) minutes = Math.max(0, minutes - 6);
  }
  bins.forEach(b => { $(`bin${b.n}`).addEventListener('click', () => drop(b.n)); });
  addEventListener('keydown', e => { if (/^[1-4]$/.test(e.key)) drop(Number(e.key)); });

  // --- 흑백 점 효과(세일러문 인트로 r07 app.js와 같은 식) ---
  const target = new T.WebGLRenderTarget(2, 2);
  const postScene = new T.Scene(), postCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // 2페 흉측한 물건(레이어 1)은 화면 해상도 그대로 따로 그려서(creep) 점 무늬 위에 덮는다:
  // 물건 = 선명한 흑백 + 지글거리는 잡음 + 굵은 검은 테두리, 둘레 = 점 무늬가 뒤집히며 지글거림, 가끔 가로로 찢어짐(tear).
  const creepTarget = new T.WebGLRenderTarget(2, 2);
  const depthOnly = new T.MeshBasicMaterial({ colorWrite: false });
  for (const l of [hemi, sun, lamp]) l.layers.enable(CREEP_LAYER);
  if (!DITHER) camera.layers.enable(CREEP_LAYER);
  const post = new T.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { picture: { value: target.texture }, pixels: { value: new T.Vector2(1, 1) },
      creep: { value: creepTarget.texture }, res: { value: new T.Vector2(1, 1) }, time: { value: 0 }, tear: { value: 0 } },
    vertexShader: 'varying vec2 screenUV;void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `precision highp float;varying vec2 screenUV;uniform sampler2D picture;uniform vec2 pixels;
      uniform sampler2D creep;uniform vec2 res;uniform float time;uniform float tear;
      float bayer(vec2 p){return mod(2.*mod(p.x,2.)+3.*mod(p.y,2.),4.);}
      float perceptual(float x){return x<=.0031308?12.92*x:1.055*pow(x,1./2.4)-.055;}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float ca(vec2 uv){return step(.5,texture2D(creep,uv).a);}
      void main(){vec2 p=floor(screenUV*pixels);vec3 c=texture2D(picture,(p+.5)/pixels).rgb;
        float v=perceptual(dot(c,vec3(.2126,.7152,.0722)));
        float threshold=(4.*bayer(p)+bayer(floor(p/2.))+.5)/16.;
        float d=step(threshold,smoothstep(.16,.88,v));
        vec2 fp=floor(screenUV*res);float tick=floor(time*12.);vec2 px=1./res;
        vec2 cuv=screenUV+vec2((hash(vec2(floor(fp.y/5.),tick))-.5)*tear*.03,0.);
        vec4 k=texture2D(creep,cuv);
        if(k.a>.5){
          float e=4.-ca(cuv+vec2(2.5,0.)*px)-ca(cuv-vec2(2.5,0.)*px)-ca(cuv+vec2(0.,2.5)*px)-ca(cuv-vec2(0.,2.5)*px);
          float L=perceptual(dot(k.rgb,vec3(.2126,.7152,.0722)));
          float o=step(.5+(hash(fp+tick*17.)-.5)*.8,smoothstep(.1,.8,L));
          if(e>0.)o=0.;
          gl_FragColor=vec4(vec3(o),1.);return;}
        float r1=9.,r2=17.;
        float h1=ca(cuv+vec2(r1,0.)*px)+ca(cuv-vec2(r1,0.)*px)+ca(cuv+vec2(0.,r1)*px)+ca(cuv-vec2(0.,r1)*px)
          +ca(cuv+vec2(.7,.7)*r1*px)+ca(cuv-vec2(.7,.7)*r1*px)+ca(cuv+vec2(.7,-.7)*r1*px)+ca(cuv-vec2(.7,-.7)*r1*px);
        float h2=ca(cuv+vec2(r2,0.)*px)+ca(cuv-vec2(r2,0.)*px)+ca(cuv+vec2(0.,r2)*px)+ca(cuv-vec2(0.,r2)*px);
        float halo=h1/8.*.6+h2/4.*.3;
        if(hash(fp*1.37+tick*5.3)<halo)d=1.-d;
        gl_FragColor=vec4(vec3(d),1.);}` });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const pw = Math.min(360 * 1.6, Math.max(120, Math.round(w / 2.4))), ph = Math.round(pw / camera.aspect);
    target.setSize(pw, ph); post.uniforms.pixels.value.set(pw, ph);
    creepTarget.setSize(w, h); post.uniforms.res.value.set(w, h);
  }
  addEventListener('resize', resize); resize();

  // --- 움직임 ---
  let last = performance.now(), spawnAt = 0, flickerAt = performance.now() + 4000, tearAt = performance.now() + 3000, tearUntil = 0;
  const SPEED = PHASE === 3 ? .45 : .9; // 3페는 천천히
  for (let i = 0; i < (PHASE === 3 ? 1 : 3); i++) { const b = makeBox(); b.position.x = -1.5 - i * 2.4; boxes.push(b); }
  if (PHASE === 3) minutes = 300;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (PHASE !== 3) minutes = Math.min(360, minutes + dt * 360 / 60); // 1분에 밤 하나(시안)
    if (PHASE === 2) {
      // 2페 압박(약하게): 가끔 천장 불이 천천히 어두워졌다 돌아오고, 송장 번호가 잠깐 다른 숫자로 보인다. 튀어나오는 것·큰 소리 없음.
      if (now > flickerAt) { flickerAt = now + 6000 + Math.random() * 5000; slipGlitch = now + 500; }
      const k = Math.max(0, 1 - Math.abs(now - (flickerAt - 3000)) / 1500);
      lamp.intensity = LIGHT[3] * (1 - .7 * k);
      if (Math.random() < .002) minutes = Math.max(0, minutes - 3);
    }
    if (PHASE === 3) {
      const sent = boxes.filter(b => b.userData.state !== 'belt').length;
      const goal = dawn ? 1 : sent / KEEP.length * .35;
      const cur = (scene.background.r * 255 - 0x5a) / (0xf2 - 0x5a);
      const v = cur + (goal - cur) * Math.min(1, dt * (dawn ? .8 : 1.5));
      scene.background.setScalar((0x5a + (0xf2 - 0x5a) * v) / 255);
      hemi.intensity = .6 + .9 * v; sun.intensity = .7 + 1.5 * v;
      minutes = Math.min(360, 300 + 60 * Math.max(sent / KEEP.length, v));
      if (dawn && v > .97 && !document.body.dataset.end) { document.body.dataset.end = '1'; $('end').classList.add('show'); }
    }
    $('clock').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
    stripes.forEach(s => { s.position.x += dt * SPEED; if (s.position.x > 6.3) s.position.x -= 12.6; });
    const head = front();
    for (const b of boxes) {
      const u = b.userData;
      if (u.state === 'belt') {
        const stopX = b === head ? 4.6 : Math.min(4.6, (boxes.filter(o => o.userData.state === 'belt' && o.position.x > b.position.x).reduce((m, o) => Math.min(m, o.position.x), 99)) - 1.6);
        if (b.position.x < stopX) b.position.x = Math.min(stopX, b.position.x + dt * SPEED);
      } else if (u.state === 'drop') {
        const t = u.target; b.position.x += (t.x - b.position.x) * Math.min(1, dt * 5); b.position.z += (3 - b.position.z) * Math.min(1, dt * 5);
        u.vy -= dt * 14; b.position.y = Math.max(.15 + t.count * .05, b.position.y + u.vy * dt); b.rotation.y += dt * 2;
        if (Math.abs(b.position.z - 3) < .05 && b.position.y <= .16 + t.count * .05) { u.state = 'done'; t.count++; }
      }
    }
    // 3페는 앞 상자를 보낸 뒤에야 다음 물건이 하나씩 온다.
    const onBelt = boxes.filter(b => b.userData.state === 'belt').length;
    if ((PHASE === 3 ? onBelt < 1 : onBelt < 3) && now > spawnAt) { const nb = makeBox(); if (nb) boxes.push(nb); spawnAt = now + (PHASE === 3 ? 2600 : 1400); }
    for (const b of boxes) if (b.userData.tick) b.userData.tick(now / 1000, dt);
    if (PHASE === 2 && now > tearAt) { tearAt = now + 2500 + Math.random() * 3000; tearUntil = now + 160; }
    showSlip();
    if (DITHER) {
      renderer.setRenderTarget(target); renderer.render(scene, camera);
      // 흉측한 물건만: 다른 것들로 깊이만 채운 뒤(가려지는 곳은 가려지게) 레이어 1만 그린다.
      const bg = scene.background; scene.background = null;
      renderer.setRenderTarget(creepTarget); renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.autoClear = false; scene.overrideMaterial = depthOnly; renderer.render(scene, camera);
      scene.overrideMaterial = null; camera.layers.set(CREEP_LAYER); renderer.render(scene, camera);
      camera.layers.set(0); renderer.autoClear = true; scene.background = bg; renderer.setClearColor(0x000000, 1);
      post.uniforms.time.value = now / 1000; post.uniforms.tear.value = now < tearUntil ? 1 : 0;
      renderer.setRenderTarget(null); renderer.render(postScene, postCamera);
    }
    else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  say(PHASE === 3 ? P3_START : '괜찮아요. 상자는 말을 안 걸어요. 할아버지랑 잘 맞을 거예요.', 4200);
  requestAnimationFrame(frame);
  globalThis.WarehousePreview = { drop, boxes, bins, camera };
})();

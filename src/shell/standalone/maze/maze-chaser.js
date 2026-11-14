/* 개발자용 02 미로 추격전 프로토타입 — 미로 화면(iframe) 안에서 돈다(2026-11-14, Claude Code). 본편 01에는 들어가지 않는다.
   사용자 11/14: 「일단 한 장의 이미지로 구현해봐. 모델링 대신에 말이지. 그리고 프로토타입 만들어. 깃허브에 바로 올리고」
   정한 방향(사용자 말씀): 2페에 추격전, 잡힐 때보다 잡히기 전이 긴장되니 「잡힐랑 말랑하는 그 선」.
   1페에는 뒤에서 따라오는 무언가의 암시(코너를 돌 때마다 뒤에서 누가 따라옴), 2페에서 그것이 변형되어 무섭게 쫓아옴.
   따라오는 것은 실제 일진이 아니라 「일진에 대한 기억이 뭉쳐진 무언가」 → 그림 한 장(assets/images/maze-chaser.webp)을 판에 붙여 늘 나를 보게 한다.
   1페(MODE 1): 코너를 돌고 조금 가면 뒤에서 발소리 → 방금 돈 모퉁이에 그것이 반쯤 숨어 서 있음 → 돌아보면 0.35초 뒤 모퉁이 뒤로 숨음. 피해 없음.
   2페(MODE 2): 검은 배경으로 바뀌기 전에는 1페와 같다. 바뀐 뒤 2.5초 지나 같은 그림이 찢기고 일그러진 모습으로 쫓아온다.
     계속 움직이면 1.5칸쯤 뒤에 붙어 있기만 하고, 멈추거나(0.7초) 막다른 길에 들어가면 빨라져서 잡는다 → 「되감기 실패」 화면.
     가까울수록 화면 가장자리가 어두워지고 심장 소리가 빨라진다. */
(() => {
  'use strict';
  const R = window.MazeRuntime;
  if (!R || !R.world) return;
  const { E, player, lens } = R, MODE = window.MAZE_CHASER_MODE === 2 ? 2 : 1, ART = window.MAZE_CHASER_ART;
  if (!ART) return;
  const devChannel = 'speedrun-maze-dev-phase', stageChannel = 'speedrun-midterm-v1';
  const tell = (type, detail = {}) => parent.postMessage({ channel: devChannel, type, ...detail }, '*');
  const now = () => performance.now(), rand = (a, b) => a + Math.random() * (b - a);
  const open = (x, z) => !E.wall(x + .5, z + .5);
  const key = (x, z) => x + ',' + z;
  const angleTo = (x, z) => { const a = Math.atan2(z - player.z, x - player.x) - player.yaw; return Math.atan2(Math.sin(a), Math.cos(a)); };
  const sees = (x, z, maxAngle) => {
    const angle = angleTo(x, z); if (Math.abs(angle) > maxAngle) return false;
    const d = Math.hypot(x - player.x, z - player.z), hit = E.cast(player, Math.tan(angle) / lens, lens);
    return hit.distance >= d * Math.cos(angle) - .25;
  };
  const debug = document.body.dataset;

  // ---- 소리: 발소리·심장 소리(브라우저 안에서 만든다, 파일 없음) ----
  let ac = null;
  const arm = () => { try { ac ||= new AudioContext(); ac.resume?.(); } catch {} };
  addEventListener('keydown', arm); addEventListener('pointerdown', arm);
  function thump(at, freq, gain, pan, len = .12, noise = .5) {
    if (!ac) return;
    const out = ac.createGain(), panner = ac.createStereoPanner ? ac.createStereoPanner() : null, lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520;
    out.gain.setValueAtTime(0, at); out.gain.linearRampToValueAtTime(gain, at + .008); out.gain.exponentialRampToValueAtTime(.0001, at + len);
    if (panner) { panner.pan.value = Math.max(-1, Math.min(1, pan)); lp.connect(out); out.connect(panner); panner.connect(ac.destination); }
    else { lp.connect(out); out.connect(ac.destination); }
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, at); o.frequency.exponentialRampToValueAtTime(freq * .55, at + len);
    o.connect(lp); o.start(at); o.stop(at + len + .02);
    if (noise > 0) {
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * .07), ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * noise;
      const s = ac.createBufferSource(); s.buffer = buf; s.connect(lp); s.start(at);
    }
  }
  function footsteps(x, z, count = 3) {
    if (!ac) return;
    const pan = Math.sin(angleTo(x, z)), t = ac.currentTime + .05;
    for (let i = 0; i < count; i++) thump(t + i * rand(.26, .34), 85, .22, pan, .11, .9);
  }
  function heartbeat(strength) {
    if (!ac) return;
    const t = ac.currentTime + .02;
    thump(t, 58, .25 + strength * .35, 0, .16, 0); thump(t + .17, 52, .18 + strength * .25, 0, .18, 0);
  }

  // ---- 그림 한 장을 판에 붙인다(비율 512:768 그대로) ----
  const art = new Image(); art.src = ART;
  const ASPECT = 512 / 768;
  function makeFigure(world, height, warped) {
    const { T, scene } = world.kit, map = new T.Texture(art);
    map.colorSpace = T.SRGBColorSpace; map.needsUpdate = true;
    if (!art.complete) art.addEventListener('load', () => { map.needsUpdate = true; }, { once: true });
    let material;
    if (warped) {
      // 2페: 가로 띠마다 좌우로 찢기고, 세로로 흐물거린다. 그림 자체는 같은 한 장.
      material = new T.ShaderMaterial({
        uniforms: { map: { value: map }, time: { value: 0 }, tear: { value: 1 } }, side: T.DoubleSide, transparent: false,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform sampler2D map;uniform float time,tear;varying vec2 vUv;
          float h(float n){return fract(sin(n)*43758.5453);}
          void main(){float band=floor(vUv.y*22.),tick=floor(time*11.);
            float shift=(h(band*7.1+tick)-.5)*.16*tear*step(.55,h(band+tick*3.3));
            vec2 uv=vec2(vUv.x+shift+sin(vUv.y*18.+time*6.)*.012*tear,vUv.y+sin(vUv.x*14.+time*4.)*.01*tear);
            vec4 c=texture2D(map,uv);if(c.a<.4||uv.x<0.||uv.x>1.)discard;
            gl_FragColor=vec4(pow(c.rgb,vec3(2.2))*.55,1.);}`
      });
    } else material = new T.MeshBasicMaterial({ map, transparent: true, alphaTest: .4, side: T.DoubleSide });
    const mesh = new T.Mesh(new T.PlaneGeometry(height * ASPECT, height), material);
    mesh.name = warped ? 'maze-chaser-warped' : 'maze-chaser'; mesh.visible = false; scene.add(mesh);
    return { mesh, material, height, x: 0, z: 0,
      place(x, z, lift = 0) { this.x = x; this.z = z; mesh.position.set(x, height / 2 + lift, z); mesh.rotation.y = Math.atan2(player.x - x, player.z - z); } };
  }

  // ---- 1페(그리고 2페 검게 바뀌기 전): 코너마다 뒤에서 따라오는 암시 ----
  function hints(world) {
    const fig = makeFigure(world, .95, false);
    const trail = [];
    let corner = null, shown = 0, seen = 0, hiding = 0, cooldown = 0, first = true, t0 = 0, hideDir = [0, 0];
    world.addFrameHook(() => {
      if (stopHints) { fig.mesh.visible = false; return; }
      const t = now(), dt = t0 ? Math.min(.1, (t - t0) / 1000) : 0; t0 = t;
      const cx = Math.floor(player.x), cz = Math.floor(player.z), last = trail[trail.length - 1];
      if (!last || last[0] !== cx || last[1] !== cz) {
        const prev = trail[trail.length - 2];
        if (prev && prev[0] === cx && prev[1] === cz) trail.pop(); else trail.push([cx, cz]);
        if (trail.length > 40) trail.shift();
        const n = trail.length;
        if (n >= 3 && !fig.mesh.visible) {
          const [a, b, c] = [trail[n - 3], trail[n - 2], trail[n - 1]];
          if (b[0] - a[0] !== c[0] - b[0] || b[1] - a[1] !== c[1] - b[1]) corner = { b, a, at: t };
        }
      }
      // 모퉁이를 돌고 1.6칸 넘게 갔고, 돌아보면 보이는 자리이면 → 발소리와 함께 모퉁이에 나타남
      if (corner && !fig.mesh.visible && t > cooldown) {
        const bx = corner.b[0] + .5, bz = corner.b[1] + .5, d = Math.hypot(bx - player.x, bz - player.z);
        if (t - corner.at > 9000) corner = null;
        else if (d > 1.6 && d < 4.2 && Math.abs(angleTo(bx, bz)) > 1.7) {
          // 왔던 쪽(a)으로 0.32칸 물러나 벽 모서리에 반쯤 가린 자리
          const ox = (corner.a[0] - corner.b[0]) * .32, oz = (corner.a[1] - corner.b[1]) * .32;
          if (first || Math.random() < .8) {
            hideDir = [corner.a[0] - corner.b[0], corner.a[1] - corner.b[1]];
            fig.place(bx + ox, bz + oz); fig.mesh.visible = true; shown = t; seen = 0; hiding = 0; first = false;
            footsteps(bx, bz, 3); tell('chaser-hint'); debug.chaserHint = 'out';
          }
          corner = null; cooldown = t + rand(4500, 7000);
        }
      }
      if (!fig.mesh.visible) return;
      fig.mesh.rotation.y = Math.atan2(player.x - fig.x, player.z - fig.z);
      if (hiding) {
        // 들킨 뒤: 왔던 쪽으로 미끄러지며 사라짐
        const k = Math.min(1, (t - hiding) / 380);
        fig.mesh.position.x = fig.x + hideDir[0] * k * .55; fig.mesh.position.z = fig.z + hideDir[1] * k * .55;
        fig.mesh.scale.set(1 - k * .3, 1 + k * .15, 1);
        if (k >= 1) { fig.mesh.visible = false; fig.mesh.scale.set(1, 1, 1); debug.chaserHint = 'hid'; }
        return;
      }
      if (sees(fig.x, fig.z, .6)) { seen += dt; if (seen >= .35) { hiding = t; tell('chaser-hint-seen'); footsteps(fig.x, fig.z, 2); } }
      else if (t - shown > 3800) { fig.mesh.visible = false; debug.chaserHint = 'missed'; }
    });
  }

  // ---- 2페: 검게 바뀐 뒤 추격 ----
  let stopHints = false;
  function chase(world) {
    stopHints = true;
    const fig = makeFigure(world, 1.22, true);
    const vignette = document.createElement('div');
    vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .15s linear;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 38%,rgba(0,0,0,.92) 100%)';
    document.body.append(vignette);
    const W = 40, H = 40, dist = new Map();
    let at = null, next = null, pos = null, startAt = now() + 2500, t0 = 0, stillFor = 0, lastP = { x: player.x, z: player.z }, speedAvg = 0, beatAt = 0;
    function bfs() {
      dist.clear();
      const sx = Math.floor(player.x), sz = Math.floor(player.z), q = [[sx, sz]]; dist.set(key(sx, sz), 0);
      for (let i = 0; i < q.length; i++) {
        const [x, z] = q[i], d = dist.get(key(x, z));
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + a, nz = z + b;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H || !open(nx, nz) || dist.has(key(nx, nz))) continue;
          dist.set(key(nx, nz), d + 1); q.push([nx, nz]);
        }
      }
    }
    function spawn() {
      // 출구에서 플레이어보다 더 먼 쪽(= 지나온 쪽, 등 뒤), 길로 5~9칸 떨어진 칸. 앞길을 막지 않는다.
      const toExit = new Map(), ex = Math.floor(E.exit.x), ez = Math.floor(E.exit.z), q = [[ex, ez]]; toExit.set(key(ex, ez), 0);
      for (let i = 0; i < q.length; i++) {
        const [x, z] = q[i], d = toExit.get(key(x, z));
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, nz = z + b; if (open(nx, nz) && !toExit.has(key(nx, nz))) { toExit.set(key(nx, nz), d + 1); q.push([nx, nz]); } }
      }
      bfs();
      const mine = toExit.get(key(Math.floor(player.x), Math.floor(player.z))) ?? 0;
      let best = null;
      // 검게 바뀔 때 플레이어는 출구 앞 막힌 방 안에 있으므로, 대개 방 안쪽(삼켜진 문 쪽)에서 나온다.
      for (const [k, d] of dist) {
        if (d < 2 || d > 9) continue;
        const [x, z] = k.split(',').map(Number), behind = (toExit.get(k) ?? 0) - mine;
        const score = (behind > 0 ? 0 : 100) - Math.min(d, 7) - Math.abs(angleTo(x + .5, z + .5)) * .2;
        if (!best || score < best.score) best = { x, z, score };
      }
      if (!best) return false;
      at = [best.x, best.z]; next = null; pos = { x: best.x + .5, z: best.z + .5 };
      fig.place(pos.x, pos.z); fig.mesh.visible = true; debug.chaser = 'on';
      tell('chaser-on'); footsteps(pos.x, pos.z, 4);
      return true;
    }
    world.addFrameHook((p, seconds) => {
      const t = now(), dt = t0 ? Math.min(.1, (t - t0) / 1000) : 0; t0 = t;
      if (caught) return;
      fig.material.uniforms.time.value = seconds;
      if (!pos) { if (t >= startAt && !spawn()) startAt = t + 800; return; }
      // 플레이어 속도(칸/초)를 부드럽게
      const moved = Math.hypot(player.x - lastP.x, player.z - lastP.z); lastP = { x: player.x, z: player.z };
      speedAvg += ((dt ? moved / dt : 0) - speedAvg) * Math.min(1, dt * 6);
      stillFor = speedAvg < E.speed * .25 ? stillFor + dt : 0;
      bfs();
      const pcx = Math.floor(player.x), pcz = Math.floor(player.z);
      const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => open(pcx + a, pcz + b)).length;
      const atExit = Math.floor(E.exit.x) === pcx && Math.floor(E.exit.z) === pcz;
      const deadEnd = exits <= 1 && !atExit;
      const euclid = Math.hypot(player.x - pos.x, player.z - pos.z);
      const here = next || at, gap = (dist.get(key(here[0], here[1])) ?? 9) + (next ? Math.hypot(pos.x - next[0] - .5, pos.z - next[1] - .5) : 0) + (here[0] === pcx && here[1] === pcz ? euclid : 0);
      const hunting = stillFor > .7 || (deadEnd && gap < 3.2);
      // 잡힐랑 말랑: 1.2칸에서 플레이어보다 조금 느리고, 멀어지면 빨라짐 → 1.5칸쯤에서 따라붙는다
      let v = E.speed * Math.max(.55, Math.min(1.3, .92 + .3 * (gap - 1.2)));
      if (hunting) v = E.speed * 1.2;
      else if (euclid < .95 && speedAvg > E.speed * .5) v = Math.min(v, speedAvg * .9);
      let left = v * dt;
      for (let guard = 0; left > 1e-5 && guard < 6; guard++) {
        if (!next) {
          if (at[0] === pcx && at[1] === pcz) { // 같은 칸: 곧장 다가감
            const d = Math.max(1e-4, euclid), step = Math.min(left, Math.max(0, d - (hunting ? 0 : .55)));
            pos.x += (player.x - pos.x) / d * step; pos.z += (player.z - pos.z) / d * step; break;
          }
          const here2 = dist.get(key(at[0], at[1])) ?? 99;
          next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [at[0] + a, at[1] + b]).find(([x, z]) => (dist.get(key(x, z)) ?? 99) < here2) || null;
          if (!next) break;
        }
        const tx = next[0] + .5, tz = next[1] + .5, d = Math.hypot(tx - pos.x, tz - pos.z);
        if (d <= left) { pos.x = tx; pos.z = tz; at = next; next = null; left -= d; }
        else { pos.x += (tx - pos.x) / d * left; pos.z += (tz - pos.z) / d * left; left = 0; }
      }
      const lean = Math.sin(seconds * 9) * .03;
      fig.place(pos.x, pos.z, Math.abs(Math.sin(seconds * 5)) * .02);
      fig.mesh.scale.set(1 + lean, 1 + Math.sin(seconds * 3.1) * .06, 1);
      const near = Math.max(0, Math.min(1, 1 - (gap - .8) / 3.2));
      fig.material.uniforms.tear.value = .6 + near * 1.6;
      vignette.style.opacity = String(near * .9);
      debug.chaserGap = gap.toFixed(2); debug.chaserHunting = hunting ? '1' : '0';
      if (t >= beatAt) { heartbeat(near); beatAt = t + 950 - near * 620; }
      if (Math.random() < dt * (.4 + near * 1.6)) footsteps(pos.x, pos.z, 1);
      if (euclid < .38 && (hunting || euclid < .3)) catchPlayer(world, fig, vignette);
    });
  }
  function catchPlayer(world, fig, vignette) {
    if (caught) return; caught = true;
    debug.chaser = 'caught'; tell('chaser-caught');
    // 얼굴 앞으로 확 다가옴 → 0.45초 뒤 되감기 실패
    const fx = player.x + Math.cos(player.yaw) * .42, fz = player.z + Math.sin(player.yaw) * .42;
    fig.place(fx, fz, -.2); fig.mesh.scale.set(1.5, 1.5, 1); fig.material.uniforms.tear.value = 3;
    vignette.style.opacity = '1';
    if (ac) { const t = ac.currentTime; for (let i = 0; i < 6; i++) thump(t + i * .05, 40 + i * 9, .5, 0, .2, 1); }
    setTimeout(() => parent.postMessage({ channel: stageChannel, type: 'fail' }, '*'), 450);
  }
  let caught = false;

  // 2페 스크립트가 검은 배경으로 바꾸며 미로를 다시 지으면(R.rebuild) 새 장면에 추격자를 붙인다.
  let world = R.world;
  hints(world);
  if (MODE === 2) {
    const watch = setInterval(() => {
      if (R.world && R.world !== world && window.MazeDevPhase2?.dark) { world = R.world; clearInterval(watch); chase(world); }
    }, 120);
  }
  window.MazeChaser = { get mode() { return MODE; }, get caught() { return caught; } };
})();

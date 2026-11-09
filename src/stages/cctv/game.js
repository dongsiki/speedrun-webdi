/* 빈건물 CCTV(2026-11-05, Claude Code). 전구 퍼즐(라이트아웃, src/stages/switches는 그대로 보관) 자리에 들어가는 게임.
   사용자 11/05: 「빈건물cctv가 나은 거 같아. 약간 프레디느낌이잖아 이거」 → 감시 카메라 공포 분위기만 참고(다른 게임의 캐릭터·그림·이름 안 씀).
   할배는 사람을 안 만나도 되는 빈 건물 야간 경비. 화면 4개를 지켜보며 밤 12시부터 아침 6시까지 버틴다.
   - 1페(병맛): 화면에 뭔가 움직이면 그 화면을 눌러 「확인」. 고양이·비닐봉지·춤추는 마네킹·청소 로봇. AI가 서툴게 칭찬한다.
   - 2페(공포): 화면이 지직거리고, 사람 그림자가 확인할수록 가까워진다. AI가 플레이어를 막아 화면을 가린다. 교복 치마 떡밥.
   - 3페(감동): AI가 「제가 못 보는 걸 봐 주세요」. 건물 곳곳의 할배를 찾아 확인하면 그 화면에 아침 빛이 든다.
   페이즈: window.SwitchDevPhase(개발자용 02의 1·2·3페 버튼이 문서 앞에 심어 줌). 본편 01은 늘 1페. */
(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  const phase = [2, 3].includes(globalThis.SwitchDevPhase) ? globalThis.SwitchDevPhase : 1;
  const $ = id => document.getElementById(id);
  const main = $('experience'), clockEl = $('clock'), radio = $('radio'), status = $('status');
  main.dataset.devPhase = String(phase);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // --- 방 그림(흰 선, 320×200) ---
  const CAMS = [
    { id: 'hall', tag: 'CAM 1 복도', floor: 168,
      room: '<path d="M0 0L128 72M320 0L192 72M0 200L128 128M320 200L192 128"/><rect x="128" y="72" width="64" height="56"/><path d="M38 34V176L70 160V54ZM282 34V176L250 160V54Z"/><path d="M150 26h20M160 26v8"/><path d="M60 110h4M256 110h4"/>' },
    { id: 'stairs', tag: 'CAM 2 계단', floor: 172,
      room: '<path d="M10 190H70V165H120V140H170V115H220V90H270V65H320"/><path d="M30 150L300 26M60 150V132M120 125V105M180 98V79M240 71V52"/><path d="M0 190H320"/>' },
    { id: 'lobby', tag: 'CAM 3 로비', floor: 176,
      room: '<path d="M0 180H320"/><rect x="112" y="38" width="96" height="142"/><path d="M160 38V180M150 110h-6M170 110h6"/><rect x="138" y="16" width="44" height="12"/><path d="M18 150H74M18 150V128M74 150V180M18 150V180M232 150H300M300 150V180M232 150V180M232 150V128"/>' },
    { id: 'store', tag: 'CAM 4 창고', floor: 178,
      room: '<path d="M20 36H136M20 86H136M20 136H136M20 36V188M136 36V188"/><rect x="30" y="58" width="30" height="28"/><rect x="70" y="64" width="40" height="22"/><rect x="34" y="108" width="44" height="28"/><rect x="200" y="140" width="56" height="44"/><rect x="214" y="104" width="40" height="36"/><rect x="262" y="150" width="40" height="34"/><path d="M0 188H320"/>' }
  ];

  // 11/10 사용자 「3d로 해」「싹 다 3d로 해」「움직이는 거 말고, 모델이 걍 그대로 멈춰있는 걸로 해」: 화면 속 것들은 3D 모델(rooms3d.js), 멈춰 있음.
  // 「한 화면에 cctv 4개 싹다 하지말고, 넘기는 걸로 하고」「방향키나 wasd의 ad에 할당」「둘 다 할당되도록해」: 화면 하나씩, ← → / A·D로 넘긴다.
  const STAIRS = /* @json assets/models/cctv/stairs.json */ null;
  let current = 0;

  // --- 화면 만들기 ---
  const grid = $('monitors');
  const cams = CAMS.map((info, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cam'; button.dataset.cam = info.id;
    button.setAttribute('aria-label', `${info.tag} 화면 확인`);
    button.innerHTML = `<canvas class="view3d" aria-hidden="true"></canvas>`
      + `<span class="tag">${info.tag}</span><span class="rec"></span><span class="static"><canvas width="80" height="50"></canvas></span><span class="block">차단됨</span><span class="stamp">확인</span>`;
    grid.append(button);
    const cam = { index, info, button, canvas: button.querySelector('.static canvas'), canvas3d: button.querySelector('canvas.view3d'), scene: Cctv3D.build(info.id, STAIRS), event: null, markTimer: 0 };
    button.addEventListener('click', () => look(cam));
    return cam;
  });

  // --- 시계(00:00 → 06:00) ---
  let minutes = phase === 3 ? 300 : 0, running = false, done = false, last = 0, raf = 0;
  const RATE = phase === 1 ? 360 / 46 : phase === 2 ? 360 / 54 : 0; // 1초에 몇 분
  function showClock() {
    const m = Math.max(0, Math.min(360, Math.round(minutes)));
    clockEl.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  let radioTimer = 0;
  function say(text, ms = 2800) {
    radio.textContent = text; radio.classList.add('show'); status.textContent = text;
    clearTimeout(radioTimer); radioTimer = setTimeout(() => radio.classList.remove('show'), ms);
  }
  function beep(freq = 880, len = .08) {
    try {
      const ctx = beep.ctx || (beep.ctx = new AudioContext());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.value = .035;
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + len);
    } catch (_) { /* 소리가 안 나도 게임은 그대로 */ }
  }
  function mark(cam, kind, text, ms = 800) {
    cam.button.dataset.mark = kind; cam.button.querySelector('.stamp').textContent = text;
    clearTimeout(cam.markTimer); cam.markTimer = setTimeout(() => { delete cam.button.dataset.mark; }, ms);
  }

  // --- 화면 속 것(3D 모델, 멈춰 있음) ---
  function place(cam, kind, opts = {}) {
    cam.event = { kind, born: performance.now(), life: opts.life ?? 4500, near: opts.near ?? 0 };
    Cctv3D.stand(cam.scene, kind, cam.event.near); paint(cam);
  }
  function clear(cam) { cam.event = null; Cctv3D.stand(cam.scene, null); paint(cam); }
  function draw() {}
  function paint(cam) { if (cam.index === current) Cctv3D.render(cam.scene, cam.canvas3d); }
  function showCam(i) {
    current = (i + cams.length) % cams.length;
    cams.forEach(c => { c.button.dataset.current = String(c.index === current); });
    paint(cams[current]); cams[current].button.focus({ preventScroll: true });
  }
  addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') { e.preventDefault(); showCam(current - 1); } if (k === 'arrowright' || k === 'd') { e.preventDefault(); showCam(current + 1); } });
  addEventListener('resize', () => paint(cams[current]));
  function noise(cam) {
    const c = cam.canvas, ctx = c.getContext('2d'), img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() < .5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  }

  // --- 1페 대사(AI 서툰 칭찬) ---
  const P1 = {
    start: '오늘도 아무도 안 와요. 사람 안 만나셔도 돼요!',
    ok: { cat: ['침입자 확인! …고양이네요. 잘하셨어요!', '고양이도 손님이에요. 아마도요.'], bag: ['비닐봉지도 위험할 수 있어요. 아마도요.', '봉지를 막으셨어요! 대단해요!'], mannequin: ['마네킹이 춤을 추네요. 기분 좋은 밤이에요!', '저 마네킹도 외로웠나 봐요.'], robot: ['청소 로봇이에요. 동료가 생겼어요!', '로봇도 혼자 일해요. 같네요!'] },
    miss: ['괜찮아요! 다음엔 잘하실 거예요.', '놓쳐도 괜찮아요. 시간은 많아요.'],
    empty: ['거긴 아무도 없어요. 그래도 잘 보셨어요!', '빈 화면도 소중해요!'],
    end: '06:00 퇴근'
  };
  // --- 2페 대사(AI가 플레이어를 막음) ---
  const P2 = {
    start: '이상해요. 오늘은 당신이 할아버지 같지 않아요.',
    block: ['여긴 보시면 안 돼요.', '당신… 누구예요?', '그 화면은 제가 볼게요.'],
    ok: ['…또 왔어요.', '가까워지고 있어요.', '저건 기록에 없어요.'],
    miss: ['보지 마세요.', '못 본 걸로 할게요.']
  };
  // --- 3페(AI가 도와 달라고 함) ---
  const P3 = {
    start: '제가 못 보는 걸 봐 주세요.',
    scenes: [
      { cam: 3, kind: 'elderSit', x: 180, line: '여기 계셨네요.' },
      { cam: 1, kind: 'elder', x: 150, y: 140, line: '계단에서 쉬고 계셨어요.' },
      { cam: 2, kind: 'elder', x: 230, line: '창밖을 보고 계셨어요.' },
      { cam: 0, kind: 'elder', x: 160, y: 150, scale: .7, line: '이제 아침이에요.' }
    ]
  };

  // --- 1·2페 진행 ---
  let spawnTimer = 0, extraTimer = 0, blockTimer = 0, sightings = 0, caught = 0;
  function freeCam() {
    const free = cams.filter(c => !c.event && c.button.dataset.block !== 'on');
    return free.length ? pick(free) : null;
  }
  function spawn() {
    if (!running || done) return;
    const cam = freeCam();
    if (cam) {
      if (phase === 1) place(cam, pick(['cat', 'bag', 'mannequin', 'robot']), { life: rand(6000, 7500) });
      else {
        sightings++;
        // 확인할수록 가까워진다: 처음엔 작게 멀리, 나중엔 화면 가운데 크게 멈춰 선다.
        const near = Math.min(1, caught / 6);
        place(cam, 'shadow', { life: rand(4500, 5500), near });
        cam.button.dataset.static = 'on'; noise(cam); setTimeout(() => { delete cam.button.dataset.static; }, 160);
        beep(140, .18);
      }
    }
    spawnTimer = setTimeout(spawn, phase === 1 ? rand(2000, 3600) : rand(1700, 3000));
  }
  function glitchStatic() {
    if (!running || done) return;
    const cam = pick(cams);
    cam.button.dataset.static = 'on'; noise(cam);
    // 11/01 떡밥(전구 2페에 있던 것을 옮김): 지직거리는 화면 구석에 교복 치마가 잠깐 비친다.
    const hint = Math.random() < .34; // 지직거림이 걷히는 순간 교복 치마(3D)가 0.4초 서 있다
    const id = setInterval(() => noise(cam), 60);
    setTimeout(() => { clearInterval(id); delete cam.button.dataset.static;
      if (hint) { Cctv3D.addSkirt(cam.scene, true); paint(cam); setTimeout(() => { Cctv3D.addSkirt(cam.scene, false); paint(cam); }, 400); } }, rand(250, 1100));
    if (Math.random() < .25) minutes = Math.max(0, minutes - 15); // 시계가 뒤로 튄다
    extraTimer = setTimeout(glitchStatic, rand(1800, 4200));
  }
  function aiBlock() {
    if (!running || done) return;
    const cam = pick(cams.filter(c => !c.event)) || pick(cams);
    cam.button.dataset.block = 'on'; say(pick(P2.block));
    setTimeout(() => { delete cam.button.dataset.block; }, 2600);
    blockTimer = setTimeout(aiBlock, rand(8000, 12000));
  }

  function look(cam) {
    if (!running || done) return;
    if (cam.button.dataset.block === 'on') { beep(200, .12); return; }
    if (phase === 3) return lookPhase3(cam);
    if (cam.event) {
      const kind = cam.event.kind; clear(cam); caught++;
      mark(cam, 'ok', '확인'); beep(phase === 1 ? 1040 : 300, .09);
      say(phase === 1 ? pick(P1.ok[kind]) : pick(P2.ok));
    } else if (phase === 1) say(pick(P1.empty), 2000);
  }
  function missed(cam) {
    clear(cam);
    minutes = Math.max(0, minutes - (phase === 1 ? 12 : 15)); // 놓치면 시계가 조금 뒤로(안 눌러도 아주 느리게는 간다)
    mark(cam, 'miss', phase === 1 ? '놓침' : '…', 900);
    say(phase === 1 ? pick(P1.miss) : pick(P2.miss));
  }

  // --- 3페 ---
  let scene = -1;
  function nextScene() {
    scene++;
    if (scene >= P3.scenes.length) return dawn();
    const s = P3.scenes[scene];
    cams.forEach(c => { c.button.dataset.dim = String(c.index !== s.cam && c.button.dataset.ray !== 'on'); });
    place(cams[s.cam], s.kind, { life: 1e9 });
  }
  function lookPhase3(cam) {
    const s = P3.scenes[scene];
    if (!s || cam.index !== s.cam || !cam.event) return;
    cam.button.dataset.ray = 'on'; beep(660, .2);
    say(s.line, 3200);
    minutes = Math.min(360, 300 + (scene + 1) * 15); showClock();
    setTimeout(nextScene, 1800);
  }
  function dawn() {
    cams.forEach(c => { c.button.dataset.dim = 'false'; });
    main.dataset.dawn = 'true'; minutes = 360; showClock();
    finish(3800, '');
  }

  // --- 끝 ---
  const endCard = $('shift-end');
  function finish(delay, text) {
    if (done) return;
    done = true; running = false; stopTimers();
    main.dataset.phase = 'complete';
    cams.forEach(c => { c.button.disabled = true; });
    if (text) { endCard.innerHTML = text; endCard.classList.add('show'); }
    setTimeout(() => parent.postMessage({ channel, type: 'complete' }, '*'), delay);
  }
  function stopTimers() { clearTimeout(spawnTimer); clearTimeout(extraTimer); clearTimeout(blockTimer); cancelAnimationFrame(raf); raf = 0; }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(100, now - last) : 0; last = now;
    if (RATE && !document.hidden) minutes += RATE * dt / 1000;
    for (const cam of cams) {
      if (!cam.event) continue;
      draw(cam, now);
      if (phase !== 3 && now - cam.event.born > cam.event.life) missed(cam);
    }
    showClock();
    if (phase !== 3 && minutes >= 360) {
      cams.forEach(clear); minutes = 360; showClock();
      if (phase === 2) {
        // 2페 끝: 네 화면 한꺼번에 그림자가 정면으로 선다(0.4초) → 아침.
        main.dataset.scare = 'on';
        cams.forEach(c => place(c, 'shadow', { near: 1.5, life: 1e9 }));
        beep(90, .4);
        setTimeout(() => { cams.forEach(clear); delete main.dataset.scare; }, 420);
        return finish(1600, '06:00');
      }
      return finish(2400, `${P1.end}<small>오늘도 아무도 안 왔다.</small>`);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || done) return;
    running = true; last = 0; main.dataset.phase = 'playing';
    if (phase === 1) { say(P1.start, 3600); spawnTimer = setTimeout(spawn, 1600); }
    if (phase === 2) { say(P2.start, 3600); spawnTimer = setTimeout(spawn, 1400); extraTimer = setTimeout(glitchStatic, 900); blockTimer = setTimeout(aiBlock, 6000); }
    if (phase === 3) { say(P3.start, 3600); setTimeout(nextScene, 1500); }
    raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; stopTimers(); }

  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'pause') pause();
    if (event.data.type === 'focus') cams[current].button.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', () => { last = 0; });
  showClock();
  showCam(0);
  start();
  globalThis.CctvGame = { get phase() { return phase; }, get minutes() { return minutes; }, cams, finish: () => finish(0, '') };
})();
